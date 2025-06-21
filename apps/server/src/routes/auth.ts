import { Hono } from 'hono';
import { changePasswordSchema, loginSchema, registerStudentSchema, zValidator } from '../utils/validation';
import { db, users, refreshTokens, studentProfiles } from '../db';
import { jwtAuth } from '../lib/jwt-auth';
import { createError } from '../utils/errors';
import type { HonoContext } from '../utils/types';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/jwt-auth';

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

    // Create user
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
        emailVerified: false, // In production, send verification email
      })
      .returning();

    // Create student profile
    await db.insert(studentProfiles).values({
      studentId,
      userId: newUser.id,
      semester: 1, // Default semester
      batchId: '', // Will be set by admin
      sectionId: '', // Will be set by admin
      priority: 1, // Normal student
      updatedBy: newUser.id,
    });

    // Generate tokens
    const accessToken = jwtAuth.generateAccessToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    const { token: refreshToken, tokenId } = jwtAuth.generateRefreshToken(newUser.id);

    // Store refresh token
    await db.insert(refreshTokens).values({
      tokenId,
      userId: newUser.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return c.json({
      message: 'Student registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        emailVerified: newUser.emailVerified,
      },
      tokens: {
        accessToken,
        refreshToken,
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

export { authRouter };