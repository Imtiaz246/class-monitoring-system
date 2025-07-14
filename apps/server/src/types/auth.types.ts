import { z } from '@hono/zod-openapi';
import { uuidSchema, genderSchema } from './common.types';

// Authentication Zod schemas
export const registerStudentSchema = z.object({
  email: z.string().email('Invalid email format').openapi({
    example: 'user@example.com',
    description: 'Student email address'
  }),
  password: z.string().min(8, 'Password must be at least 8 characters').openapi({
    example: '********',
    description: 'Password with minimum 8 characters'
  }),
  name: z.string().min(2, 'Name must be at least 2 characters').openapi({
    example: 'John Doe',
    description: 'Full name of the student'
  }),
  gender: z.enum(['male', 'female', 'other']).optional().openapi({
    description: 'Optional. One of: "male", "female", or "other".',
    example: 'male',
  }),
  phone: z.string().optional().openapi({
    example: '+1234567890',
    description: 'Phone number of the student'
  }),
  address: z.string().optional().openapi({
    example: '123 University Street, College Town',
    description: 'Home address of the student'
  }),
  studentId: z.string().min(1, 'Student ID is required').openapi({
    example: 'S202400',
    description: 'Unique student identification number'
  }),
  semester: z.number().int().positive('Semester must be a positive integer').openapi({
    example: 1,
    description: 'Current semester of the student'
  }),
  batchId: uuidSchema.openapi({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the batch the student belongs to'
  }),
  sectionId: uuidSchema.openapi({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'UUID of the section the student belongs to'
  }),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const requestPasswordChangeOtpSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
});

export const verifyPasswordChangeOtpSchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

export const changePasswordWithTokenSchema = z.object({
  passwordChangeToken: z.string().min(1, 'Password change token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// Inferred TypeScript types
export type RegisterStudentData = z.infer<typeof registerStudentSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type VerifyEmailData = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationData = z.infer<typeof resendVerificationSchema>;
export type RequestPasswordChangeOtpData = z.infer<typeof requestPasswordChangeOtpSchema>;
export type VerifyPasswordChangeOtpData = z.infer<typeof verifyPasswordChangeOtpSchema>;
export type ChangePasswordWithTokenData = z.infer<typeof changePasswordWithTokenSchema>;