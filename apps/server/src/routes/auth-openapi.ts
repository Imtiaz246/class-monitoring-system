import { createRoute, z } from '@hono/zod-openapi';
import { 
  loginSchema, 
  registerStudentSchema, 
  verifyEmailSchema, 
  resendVerificationSchema, 
  requestPasswordChangeOtpSchema, 
  verifyPasswordChangeOtpSchema, 
  changePasswordWithTokenSchema
} from '../utils/validation';
import { db, users, refreshTokens, studentProfiles } from '../db';
import { jwtAuth } from '../lib/jwt-auth';
import { createError, AppError } from '../utils/errors';
import { sendVerificationEmail, sendPasswordChangeOtp } from '../utils/email';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { 
  createOpenAPIApp, 
  SuccessResponseSchema, 
  // commonErrorResponses 
} from '../lib/swagger';

// Create OpenAPI app instance
const authRouter = createOpenAPIApp();

// Student Registration Route
const registerStudentRoute = createRoute({
  method: 'post',
  path: '/register/student',
  tags: ['Authentication'],
  summary: 'Register a new student',
  description: 'Register a new student account. Email verification is required before login.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: registerStudentSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Student registered successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            user: z.object({
              email: z.string(),
              name: z.string(),
              role: z.string(),
              emailVerified: z.boolean(),
            }),
          }),
        },
      },
    },
    // ...commonErrorResponses,
  },
});

authRouter.openapi(registerStudentRoute, async (c) => {
  const { email, password, name, gender, phone, address, studentId } = c.req.valid('json');

  console.log("Error 1")
  if (!studentId) {
    console.log("Error 2")
    throw createError.badRequest('Student ID is required for student registration');
  }

  try {
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      throw createError.conflict('User with this email already exists');
    }

    // Check if student ID already exists
    const [existingStudent] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.studentId, studentId))
      .limit(1);

    if (existingStudent) {
      throw createError.conflict('Student ID already exists');
    }

    // Hash password
    const hashedPassword = jwtAuth.hashPassword(password);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store studentId temporarily in a custom field for later use during verification
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name,
        role: 'student',
        gender,
        phone,
        address,
        emailVerified: false,
        emailVerificationToken: emailVerificationToken,
        emailVerificationExpires: emailVerificationExpires,
        passwordResetToken: studentId,
      })
      .returning();

    // Send verification email (optional for testing)
    try {
      await sendVerificationEmail(email, emailVerificationToken, name);
      console.log('✅ Verification email sent successfully');
    } catch (emailError) {
      console.warn('⚠️ Failed to send verification email (continuing anyway):', emailError instanceof Error ? emailError.message : String(emailError));
      // Continue with registration even if email fails
    }

    return c.json({
      message: 'Registration successful! Please check your email to verify your account before logging in.',
      user: {
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        emailVerified: newUser.emailVerified,
      },
    }, 201);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected registration error:', error);
    throw createError.internalServer('Failed to register user');
  }
});

// Login Route
const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Authentication'],
  summary: 'User login',
  description: 'Authenticate user with email and password. Returns access and refresh tokens.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: loginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            user: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string(),
              role: z.enum(['super_admin', 'chairman', 'admin', 'cr_student', 'teacher', 'student']),
              emailVerified: z.boolean(),
            }),
            tokens: z.object({
              accessToken: z.string(),
              refreshToken: z.string(),
            }),
          }),
        },
      },
    },
    // ...commonErrorResponses,
  }
});

authRouter.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid('json');

  try {
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.isActive) {
      throw createError.unauthorized('Invalid email or password');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw createError.unauthorized('Please verify your email before logging in. Check your inbox for the verification link.', 'EMAIL_NOT_VERIFIED');
    }

    // Verify password
    const isValidPassword = jwtAuth.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw createError.unauthorized('Invalid email or password');
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Revoke all existing refresh tokens for this user
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, user.id));

    // Generate tokens
    const accessToken = jwtAuth.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const { token: refreshToken, tokenId } = jwtAuth.generateRefreshToken(user.id);

    // Store new refresh token
    await db.insert(refreshTokens).values({
      tokenId,
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return c.json({
      message: 'Login successful',
      user: {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    }, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected login error:', error);
    throw createError.internalServer('Failed to login');
  }
});

// Refresh Token Route
const refreshTokenRoute = createRoute({
  method: 'post',
  path: '/refresh',
  tags: ['Authentication'],
  summary: 'Refresh access token',
  description: 'Generate a new access token using a valid refresh token.',
  request: {
    headers: z.object({
      'X-Refresh-Token': z.string().describe('Refresh token'),
    }),
  },
  responses: {
    200: {
      description: 'Token refreshed successfully',
      content: {
        'application/json': {
          schema: z.object({
            accessToken: z.string(),
          }),
        },
      },
    },
    // ...commonErrorResponses,
  },
});

authRouter.openapi(refreshTokenRoute, async (c) => {
  const refreshToken = c.req.header('X-Refresh-Token');

  if (!refreshToken) {
    throw createError.badRequest('Refresh token is required');
  }

  try {
    // Verify refresh token
    const payload = jwtAuth.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw createError.unauthorized('Invalid refresh token');
    }

    // Check if token exists in database and is not revoked
    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenId, payload.tokenId),
          eq(refreshTokens.userId, payload.userId)
        )
      )
      .limit(1);

    if (!tokenRecord || tokenRecord.revokedAt) {
      throw createError.unauthorized('Refresh token has been revoked');
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user || !user.isActive) {
      throw createError.unauthorized('User not found or inactive');
    }

    // Generate new access token
    const accessToken = jwtAuth.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return c.json({
      accessToken,
    }, 200);
  } catch (error) {
    // Re-throw known application errors (AppError instances)
    if (error instanceof AppError) {
      throw error;
    }
    
    // Log unexpected errors for debugging
    console.error('Unexpected token refresh error:', error);
    throw createError.internalServer('Failed to refresh token');
  }
});

// Logout Route
const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  tags: ['Authentication'],
  summary: 'User logout',
  description: 'Logout user and revoke refresh token.',
  security: [{ Bearer: [] }],
  request: {
    headers: z.object({
      'X-Refresh-Token': z.string().optional().describe('Refresh token to revoke'),
    }),
  },
  responses: {
    200: {
      description: 'Logout successful',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    // ...commonErrorResponses,
  },
});

authRouter.openapi(logoutRoute, async (c) => {
  // Manual auth check since middleware doesn't work with OpenAPI
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError.unauthorized('Authorization header required');
  }
  
  const token = authHeader.substring(7);
  const payload = jwtAuth.verifyAccessToken(token);
  if (!payload) {
    throw createError.unauthorized('Invalid token');
  }
  
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user || !user.isActive) {
    throw createError.unauthorized('User not found or inactive');
  }
  // User is already validated above
  const refreshToken = c.req.header('X-Refresh-Token');

  try {
    if (refreshToken) {
      // Revoke the refresh token
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.userId, user.id),
            eq(refreshTokens.token, refreshToken)
          )
        );
    }

    return c.json({ message: 'Logged out successfully' }, 200);
  } catch (error) {
    console.error('Logout error:', error);
    throw createError.internalServer('Failed to logout');
  }
});

// Get Current User Profile Route
const getCurrentUserRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Authentication'],
  summary: 'Get current user profile',
  description: 'Get the profile information of the currently authenticated user.',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'User profile retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            user: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string(),
              role: z.enum(['super_admin', 'chairman', 'admin', 'cr_student', 'teacher', 'student']),
              gender: z.enum(['male', 'female', 'other']).nullable(),
              phone: z.string().nullable(),
              address: z.string().nullable(),
              lastLoginAt: z.string().datetime().nullable(),
              createdAt: z.string().datetime(),
              updatedAt: z.string().datetime(),
            }),
          }),
        },
      },
    },
    // ...commonErrorResponses,
  }
});

authRouter.openapi(getCurrentUserRoute, async (c) => {
  // Manual auth check since middleware doesn't work with OpenAPI
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError.unauthorized('Authorization header required');
  }
  
  const token = authHeader.substring(7);
  const payload = jwtAuth.verifyAccessToken(token);
  if (!payload) {
    throw createError.unauthorized('Invalid token');
  }
  
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user || !user.isActive) {
    throw createError.unauthorized('User not found or inactive');
  }
  const safeUser = {
    id: user.id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    gender: user.gender,
    phone: user.phone,
    address: user.address,
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
  return c.json({ user: safeUser }, 200);
});

// Request Password Change OTP Route
const requestPasswordChangeOtpRoute = createRoute({
  method: 'post',
  path: '/request-password-change-otp',
  tags: ['Password Management'],
  summary: 'Request password change OTP',
  description: 'Request a one-time password (OTP) to change password. Requires current password verification.',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: requestPasswordChangeOtpSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'OTP sent successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            expiresIn: z.string(),
          }),
        },
      },
    },
    // ...commonErrorResponses,
  }
});

authRouter.openapi(requestPasswordChangeOtpRoute, async (c) => {
  // Manual auth check since middleware doesn't work with OpenAPI
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError.unauthorized('Authorization header required');
  }
  
  const token = authHeader.substring(7);
  const payload = jwtAuth.verifyAccessToken(token);
  if (!payload) {
    throw createError.unauthorized('Invalid token');
  }
  
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user || !user.isActive) {
    throw createError.unauthorized('User not found or inactive');
  }
  const { currentPassword } = c.req.valid('json');

  try {
    // Get user with password
    const [userWithPassword] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!userWithPassword) {
      throw createError.notFound('User not found');
    }

    // Verify current password
    const isValidPassword = jwtAuth.verifyPassword(currentPassword, userWithPassword.password);
    if (!isValidPassword) {
      throw createError.unauthorized('Current password is incorrect');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in database
    await db
      .update(users)
      .set({
        passwordChangeOtp: otp,
        passwordChangeOtpExpires: otpExpires,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Send OTP email
    try {
      await sendPasswordChangeOtp(user.email, otp, user.name);
      console.log('✅ Password change OTP sent successfully');
    } catch (emailError) {
      console.warn('⚠️ Failed to send password change OTP email:', emailError instanceof Error ? emailError.message : String(emailError));
      // Clear OTP from database if email fails
      await db
        .update(users)
        .set({
          passwordChangeOtp: null,
          passwordChangeOtpExpires: null,
        })
        .where(eq(users.id, user.id));
      throw createError.internalServer('Failed to send verification code. Please try again.');
    }

    return c.json({
      message: 'Verification code sent to your email. Please check your inbox.',
      expiresIn: '10 minutes'
    }, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected request OTP error:', error);
    throw createError.internalServer('Failed to request verification code');
  }
});

// Verify Password Change OTP Route
const verifyPasswordChangeOtpRoute = createRoute({
  method: 'post',
  path: '/verify-password-change-otp',
  tags: ['Password Management'],
  summary: 'Verify password change OTP',
  description: 'Verify the OTP and receive a short-lived token for password change.',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: verifyPasswordChangeOtpSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'OTP verified successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            passwordChangeToken: z.string(),
            expiresAt: z.string().datetime(),
          }),
        },
      },
    },
    // ...commonErrorResponses,
  }
});

authRouter.openapi(verifyPasswordChangeOtpRoute, async (c) => {
  // Manual auth check since middleware doesn't work with OpenAPI
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError.unauthorized('Authorization header required');
  }
  
  const token = authHeader.substring(7);
  const payload = jwtAuth.verifyAccessToken(token);
  if (!payload) {
    throw createError.unauthorized('Invalid token');
  }
  
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user || !user.isActive) {
    throw createError.unauthorized('User not found or inactive');
  }
  const { otp } = c.req.valid('json');

  try {
    // Get user with OTP data
    const [userWithOtp] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!userWithOtp) {
      throw createError.notFound('User not found');
    }

    // Check if OTP exists and is not expired
    if (!userWithOtp.passwordChangeOtp || !userWithOtp.passwordChangeOtpExpires) {
      throw createError.badRequest('No verification code found. Please request a new one.');
    }

    if (new Date() > userWithOtp.passwordChangeOtpExpires) {
      // Clear expired OTP
      await db
        .update(users)
        .set({
          passwordChangeOtp: null,
          passwordChangeOtpExpires: null,
        })
        .where(eq(users.id, user.id));
      throw createError.badRequest('Verification code has expired. Please request a new one.');
    }

    // Verify OTP
    if (userWithOtp.passwordChangeOtp !== otp) {
      throw createError.unauthorized('Invalid verification code');
    }

    // Generate short-lived password change token (valid for 15 minutes)
    const passwordChangeToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store the token in database and clear OTP
    await db
      .update(users)
      .set({
        passwordChangeToken,
        passwordChangeTokenExpires: tokenExpires,
        passwordChangeOtp: null,
        passwordChangeOtpExpires: null,
      })
      .where(eq(users.id, user.id));

    return c.json({
      message: 'Verification code verified successfully. Use the provided token to change your password.',
      passwordChangeToken,
      expiresAt: tokenExpires.toISOString()
    }, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected verify OTP error:', error);
    throw createError.internalServer('Failed to verify code');
  }
});

// Change Password with Token Route
const changePasswordWithTokenRoute = createRoute({
  method: 'post',
  path: '/change-password',
  tags: ['Password Management'],
  summary: 'Change password with token',
  description: 'Change password using the token received from OTP verification.',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: changePasswordWithTokenSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Password changed successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    // ...commonErrorResponses,
  },
});

authRouter.openapi(changePasswordWithTokenRoute, async (c) => {
  // Manual auth check since middleware doesn't work with OpenAPI
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError.unauthorized('Authorization header required');
  }
  
  const token = authHeader.substring(7);
  const payload = jwtAuth.verifyAccessToken(token);
  if (!payload) {
    throw createError.unauthorized('Invalid token');
  }
  
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user || !user.isActive) {
    throw createError.unauthorized('User not found or inactive');
  }
  const { passwordChangeToken, newPassword } = c.req.valid('json');

  try {
    // Get user with token data
    const [userWithToken] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!userWithToken) {
      throw createError.notFound('User not found');
    }

    // Check if token exists and is not expired
    if (!userWithToken.passwordChangeToken || !userWithToken.passwordChangeTokenExpires) {
      throw createError.badRequest('No password change token found. Please verify your OTP first.');
    }

    if (new Date() > userWithToken.passwordChangeTokenExpires) {
      // Clear expired token
      await db
        .update(users)
        .set({
          passwordChangeToken: null,
          passwordChangeTokenExpires: null,
        })
        .where(eq(users.id, user.id));
      throw createError.badRequest('Password change token has expired. Please verify your OTP again.');
    }

    // Verify token
    if (userWithToken.passwordChangeToken !== passwordChangeToken) {
      throw createError.unauthorized('Invalid password change token');
    }

    // Hash new password
    const hashedNewPassword = jwtAuth.hashPassword(newPassword);

    // Update password and clear token
    await db
      .update(users)
      .set({
        password: hashedNewPassword,
        passwordChangeToken: null,
        passwordChangeTokenExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Revoke all refresh tokens for this user
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, user.id));

    return c.json({ message: 'Password changed successfully' }, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected change password with token error:', error);
    throw createError.internalServer('Failed to change password');
  }
});

// Email Verification Route
const verifyEmailRoute = createRoute({
  method: 'post',
  path: '/verify-email',
  tags: ['Email Verification'],
  summary: 'Verify email address',
  description: 'Verify user email address using the verification token sent via email.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: verifyEmailSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Email verified successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            user: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string(),
              role: z.string(),
              emailVerified: z.boolean(),
            }),
          }),
        },
      },
    },
    // ...commonErrorResponses,
  },
});

authRouter.openapi(verifyEmailRoute, async (c) => {
  const { token } = c.req.valid('json');
  console.log('🔍 Email verification request received with token:', token);

  try {
    // Find user with the verification token
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.emailVerificationToken, token),
          eq(users.emailVerified, false)
        )
      )
      .limit(1);

    if (!user) {
      throw createError.badRequest('Invalid or expired verification token');
    }

    // Check if token is expired
    if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
      throw createError.badRequest('Verification token has expired. Please request a new one.');
    }

    // Create student profile if user is a student
    if (user.role === 'student') {
      // Check if student profile already exists
      const [existingProfile] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, user.id))
        .limit(1);

      if (!existingProfile) {
        // Get studentId from temporarily stored data
        const studentId = user.passwordResetToken;
        
        if (!studentId) {
          throw createError.badRequest('Student ID not found. Please register again.');
        }

        // Check if student ID is already taken by another verified user
        const [existingStudent] = await db
          .select()
          .from(studentProfiles)
          .where(eq(studentProfiles.studentId, studentId))
          .limit(1);

        if (existingStudent) {
          throw createError.conflict('Student ID already exists');
        }

        // Create student profile
        await db.insert(studentProfiles).values({
          studentId,
          userId: user.id,
          semester: 1, // Default semester
          batchId: null, // Will be set by admin
          sectionId: null, // Will be set by admin
          priority: 1, // Normal student
          updatedBy: user.id,
        });
      }
    }

    // Update user as verified and clear verification token and temporary studentId
    const updateResult = await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        passwordResetToken: null, // Clear temporarily stored studentId
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return c.json({
      message: 'Email verified successfully! You can now log in to your account.',
      user: {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: true,
      },
    }, 200);
  } catch (error) {
    // Re-throw known application errors (AppError instances)
    if (error instanceof AppError) {
      throw error;
    }
    
    // Log unexpected errors for debugging
    console.error('Unexpected email verification error:', error);
    throw createError.internalServer('Failed to verify email');
  }
});

// Resend Verification Email Route
const resendVerificationRoute = createRoute({
  method: 'post',
  path: '/resend-verification',
  tags: ['Email Verification'],
  summary: 'Resend verification email',
  description: 'Resend email verification link to the specified email address.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: resendVerificationSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Verification email sent (if account exists)',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    // ...commonErrorResponses,
  },
});

authRouter.openapi(resendVerificationRoute, async (c) => {
  const { email } = c.req.valid('json');

  try {
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Don't reveal if email exists or not for security
      return c.json({
        message: 'If an account with this email exists and is not verified, a verification email has been sent.',
      }, 200);
    }

    if (user.emailVerified) {
      throw createError.badRequest('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await db
      .update(users)
      .set({
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Send verification email (optional for testing)
    try {
      await sendVerificationEmail(email, verificationToken, user.name);
      console.log('✅ Resend verification email sent successfully');
    } catch (emailError) {
      console.warn('⚠️ Failed to send resend verification email (continuing anyway):', emailError instanceof Error ? emailError.message : String(emailError));
      // Continue even if email fails
    }

    return c.json({
      message: 'Verification email sent! Please check your inbox.',
    }, 200);
  } catch (error) {
    // Re-throw known application errors (AppError instances)
    if (error instanceof AppError) {
      throw error;
    }
    
    // Log unexpected errors for debugging
    console.error('Unexpected resend verification error:', error);
    throw createError.internalServer('Failed to resend verification email');
  }
});

export { authRouter };