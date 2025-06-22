import { Hono } from 'hono';
import { changePasswordSchema, loginSchema, registerStudentSchema, verifyEmailSchema, resendVerificationSchema, zValidator } from '../utils/validation';
import { db, users, refreshTokens, studentProfiles } from '../db';
import { jwtAuth } from '../lib/jwt-auth';
import { createError } from '../utils/errors';
import { sendVerificationEmail } from '../utils/email';
import type { HonoContext } from '../utils/types';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/jwt-auth';
import crypto from 'crypto';

const authRouter = new Hono<HonoContext>();

// Student registration (public endpoint)
authRouter.post('/register/student', zValidator('json', registerStudentSchema), async (c) => {
  const { email, password, name, gender, phone, address, studentId } = c.req.valid('json');

  if (!studentId) {
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
        // Store studentId temporarily in passwordResetToken field (we'll clear it after verification)
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
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        emailVerified: newUser.emailVerified,
      },
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw error;
    }
    console.error('Registration error:', error);
    throw createError.internalServer('Failed to register user');
  }
});

// User login
authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
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
      throw createError.unauthorized('Please verify your email before logging in. Check your inbox for the verification link.');
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

    // Generate tokens
    const accessToken = jwtAuth.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const { token: refreshToken, tokenId } = jwtAuth.generateRefreshToken(user.id);

    // Store refresh token
    await db.insert(refreshTokens).values({
      tokenId,
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return c.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid')) {
      throw error;
    }
    console.error('Login error:', error);
    throw createError.internalServer('Failed to login');
  }
});

// Refresh token
authRouter.post('/refresh', async (c) => {
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
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid')) {
      throw error;
    }
    console.error('Token refresh error:', error);
    throw createError.internalServer('Failed to refresh token');
  }
});

// Logout
authRouter.post('/logout', requireAuth, async (c) => {
  const user = c.get('user')!;
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

    return c.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    throw createError.internalServer('Failed to logout');
  }
});

// Get current user profile
authRouter.get('/me', requireAuth, async (c) => {
  const user = c.get('user')!;
  return c.json({ user });
});

// Change password
authRouter.post('/change-password', requireAuth, zValidator('json', changePasswordSchema), async (c) => {
  const user = c.get('user')!;
  const { currentPassword, newPassword } = c.req.valid('json');

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

    // Hash new password
    const hashedNewPassword = jwtAuth.hashPassword(newPassword);

    // Update password
    await db
      .update(users)
      .set({ 
        password: hashedNewPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Revoke all refresh tokens for this user
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, user.id));

    return c.json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('incorrect')) {
      throw error;
    }
    console.error('Change password error:', error);
    throw createError.internalServer('Failed to change password');
  }
});

// Email verification endpoint
authRouter.post('/verify-email', zValidator('json', verifyEmailSchema), async (c) => {
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
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: true,
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('expired'))) {
      throw error;
    }
    console.error('Email verification error:', error);
    throw createError.internalServer('Failed to verify email');
  }
});

// Resend verification email endpoint
authRouter.post('/resend-verification', zValidator('json', resendVerificationSchema), async (c) => {
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
      });
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
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already verified')) {
      throw error;
    }
    console.error('Resend verification error:', error);
    throw createError.internalServer('Failed to resend verification email');
  }
});

export { authRouter };