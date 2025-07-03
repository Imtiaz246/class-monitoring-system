import { Hono } from 'hono';
import { 
  loginSchema, 
  registerStudentSchema, 
  verifyEmailSchema, 
  resendVerificationSchema, 
  requestPasswordChangeOtpSchema, 
  verifyPasswordChangeOtpSchema, 
  changePasswordWithTokenSchema, 
  zValidator
} from '../utils/validation';
import { createError, AppError } from '../utils/errors';
import type { HonoContext } from '../utils/types';
import { requireAuth } from '../middleware/jwt-auth';
import { AuthService } from '../services/auth.service';

const authRouter = new Hono<HonoContext>();

// Student registration (public endpoint)
authRouter.post('/register/student', zValidator('json', registerStudentSchema), async (c) => {
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

// User login
authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const result = await AuthService.login(data);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected login error:', error);
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
    const result = await AuthService.refreshToken(refreshToken);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected token refresh error:', error);
    throw createError.internalServer('Failed to refresh token');
  }
});

// Logout
authRouter.post('/logout', requireAuth, async (c) => {
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

// Get current user profile
authRouter.get('/me', requireAuth, async (c) => {
  try {
    const user = c.get('user')!;
    const result = await AuthService.getCurrentUser(user.id);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Get user error:', error);
    throw createError.internalServer('Failed to get user profile');
  }
});

// Request password change OTP
authRouter.post('/request-password-change-otp', requireAuth, zValidator('json', requestPasswordChangeOtpSchema), async (c) => {
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

// Verify password change OTP
authRouter.post('/verify-password-change-otp', requireAuth, zValidator('json', verifyPasswordChangeOtpSchema), async (c) => {
  try {
    const user = c.get('user')!;
    const data = c.req.valid('json');
    const result = await AuthService.verifyPasswordChangeOtp(user.id, data.otp);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected OTP verification error:', error);
    throw createError.internalServer('Failed to verify code');
  }
});

// Change password with token
authRouter.post('/change-password', requireAuth, zValidator('json', changePasswordWithTokenSchema), async (c) => {
  try {
    const user = c.get('user')!;
    const data = c.req.valid('json');
    const result = await AuthService.changePasswordWithToken(user.id, data.passwordChangeToken, data.newPassword);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected change password error:', error);
    throw createError.internalServer('Failed to change password');
  }
});

// Email verification
authRouter.post('/verify-email', zValidator('json', verifyEmailSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const result = await AuthService.verifyEmail(data.token);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected email verification error:', error);
    throw createError.internalServer('Failed to verify email');
  }
});

// Resend verification email
authRouter.post('/resend-verification', zValidator('json', resendVerificationSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const result = await AuthService.resendVerification(data.email);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected resend verification error:', error);
    throw createError.internalServer('Failed to resend verification email');
  }
});

export { authRouter };