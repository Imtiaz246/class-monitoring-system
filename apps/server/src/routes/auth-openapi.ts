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
import { createError, AppError } from '../utils/errors';
import { AuthService } from '../services/auth.service';
import { 
  createOpenAPIApp, 
  SuccessResponseSchema, 
  // commonErrorResponses 
} from '../lib/swagger';
import { requireAuth } from '../middleware/jwt-auth';

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
  try {
    const data = c.req.valid('json');
    const result = await AuthService.registerStudent(data);
    return c.json(result, 201);
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
  try {
    const data = c.req.valid('json');
    const result = await AuthService.login(data);
    return c.json(result, 200);
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
    const result = await AuthService.refreshToken(refreshToken);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
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
  middleware: requireAuth,
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
  try {
    const user = c.get('user')!;
    const result = await AuthService.logout(user.id);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected logout error:', error);
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
  middleware: requireAuth,
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
  try {
    const user = c.get('user')!;
    const result = await AuthService.getCurrentUser(user.id);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected get user error:', error);
    throw createError.internalServer('Failed to get user profile');
  }
});

// Request Password Change OTP Route
const requestPasswordChangeOtpRoute = createRoute({
  method: 'post',
  path: '/request-password-change-otp',
  tags: ['Authentication'],
  summary: 'Request password change OTP',
  description: 'Request a one-time password (OTP) to change password. Requires current password verification.',
  security: [{ Bearer: [] }],
  middleware: requireAuth,
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
  try {
    const user = c.get('user')!;
    const data = c.req.valid('json');
    const result = await AuthService.requestPasswordChangeOtp(user.id, data.currentPassword);
    return c.json(result);
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
  tags: ['Authentication'],
  summary: 'Verify password change OTP',
  description: 'Verify the OTP and receive a short-lived token for password change.',
  security: [{ Bearer: [] }],
  middleware: requireAuth,
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
  try {
    const user = c.get('user')!;
    const data = c.req.valid('json');
    const result = await AuthService.verifyPasswordChangeOtp(user.id, data.otp);
    return c.json(result);
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
  tags: ['Authentication'],
  summary: 'Change password with token',
  description: 'Change password using the token received from OTP verification.',
  security: [{ Bearer: [] }],
  middleware: requireAuth,
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
  try {
    const user = c.get('user')!;
    const data = c.req.valid('json');
    const result = await AuthService.changePasswordWithToken(user.id, data.passwordChangeToken, data.newPassword);
    return c.json(result);
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
  tags: ['Authentication'],
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
  try {
    const data = c.req.valid('json');
    const result = await AuthService.verifyEmail(data.token);
    return c.json(result, 200);
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
  tags: ['Authentication'],
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
  try {
    const data = c.req.valid('json');
    const result = await AuthService.resendVerification(data.email);
    return c.json(result, 200);
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