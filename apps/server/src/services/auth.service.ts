import { db, users, refreshTokens, studentProfiles } from '../db';
import { jwtAuth } from '../lib/jwt-auth';
import { createError } from '../utils/errors';
import { sendVerificationEmail, sendPasswordChangeOtp } from '../utils/email';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import type { RegisterStudentData, LoginData } from '../types/auth.types';

export class AuthService {
  static async registerStudent(data: RegisterStudentData) {
    const { email, password, name, gender, phone, address, studentId, semester, batchId, sectionId } = data;

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

    // Store student profile data temporarily for later use during verification
    const studentProfileData = JSON.stringify({
      studentId,
      semester,
      batchId,
      sectionId
    });

    const [newUser] = await db
      .insert(users)
      .values({
        email: email,
        password: hashedPassword,
        name: name,
        role: 'student',
        gender: gender,
        phone: phone,
        address: address,
        emailVerified: true, // make it false when development is done
        emailVerificationToken: emailVerificationToken,
        emailVerificationExpires: emailVerificationExpires,
        passwordResetToken: studentProfileData,
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

    return {
      message: 'Registration successful! Please check your email to verify your account before logging in.',
      user: {
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        emailVerified: newUser.emailVerified,
      },
    };
  }

  static async login(data: LoginData) {
    const { email, password } = data;

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

    return {
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
    };
  }

  static async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw createError.badRequest('Refresh token is required');
    }

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

    return { accessToken };
  }

  static async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Revoke the refresh token
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.userId, userId),
            eq(refreshTokens.token, refreshToken)
          )
        );
    }

    return { message: 'Logged out successfully' };
  }

  static async getCurrentUser(userId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.isActive) {
      throw createError.unauthorized('User not found or inactive');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        gender: user.gender,
        phone: user.phone,
        address: user.address,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    };
  }

  static async requestPasswordChangeOtp(userId: string, currentPassword: string) {
    // Get user with password
    const [userWithPassword] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
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
      .where(eq(users.id, userId));

    // Send OTP email
    try {
      await sendPasswordChangeOtp(userWithPassword.email, otp, userWithPassword.name);
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
        .where(eq(users.id, userId));
      throw createError.internalServer('Failed to send verification code. Please try again.');
    }

    return {
      message: 'Verification code sent to your email. Please check your inbox.',
      expiresIn: '10 minutes'
    };
  }

  static async verifyPasswordChangeOtp(userId: string, otp: string) {
    // Get user with OTP data
    const [userWithOtp] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
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
        .where(eq(users.id, userId));
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
      .where(eq(users.id, userId));

    return {
      message: 'Verification code verified successfully. Use the provided token to change your password.',
      passwordChangeToken,
      expiresAt: tokenExpires.toISOString()
    };
  }

  static async changePasswordWithToken(userId: string, passwordChangeToken: string, newPassword: string) {
    // Get user with token data
    const [userWithToken] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
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
        .where(eq(users.id, userId));
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
      .where(eq(users.id, userId));

    // Revoke all refresh tokens for this user
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, userId));

    return { message: 'Password changed successfully' };
  }

  static async verifyEmail(token: string) {
    console.log('🔍 Email verification request received with token:', token);

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
        // Get student profile data from temporarily stored data
        const studentProfileDataStr = user.passwordResetToken;
        
        if (!studentProfileDataStr) {
          throw createError.badRequest('Student profile data not found. Please register again.');
        }

        let studentProfileData;
        try {
          studentProfileData = JSON.parse(studentProfileDataStr);
        } catch (error) {
          throw createError.badRequest('Invalid student profile data. Please register again.');
        }

        const { studentId, semester, batchId, sectionId } = studentProfileData;

        if (!studentId || !semester || !batchId || !sectionId) {
          throw createError.badRequest('Incomplete student profile data. Please register again.');
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

        // Create student profile with the provided data
        await db.insert(studentProfiles).values({
          studentId: studentId,
          userId: user.id,
          semester: semester,
          batchId: batchId,
          sectionId: sectionId,
          priority: 1, // Normal student
          updatedBy: user.id,
        });
      }
    }

    // Update user as verified and clear verification token and temporary student profile data
    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        passwordResetToken: null, // Clear temporarily stored student profile data
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return {
      message: 'Email verified successfully! You can now log in to your account.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: true,
      },
    };
  }

  static async resendVerification(email: string) {
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Don't reveal if email exists or not for security
      return {
        message: 'If an account with this email exists and is not verified, a verification email has been sent.',
      };
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

    return {
      message: 'Verification email sent! Please check your inbox.',
    };
  }
}