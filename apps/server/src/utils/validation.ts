import { z } from '@hono/zod-openapi';
import { zValidator as originalZValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import type { ValidationTargets } from 'hono';
import type { ZodSchema } from 'zod';

// Custom zValidator wrapper that throws HTTPException for global error handling
export const zValidator = <T extends ZodSchema, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T
) => originalZValidator(target, schema, (result, c) => {
  if (!result.success) {
    throw new HTTPException(400, {
      message: 'Validation failed',
      cause: {
        code: 'VALIDATION_ERROR',
        details: result.error.issues,
      },
    });
  }
});

// Common validation schemas
export const uuidSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const timeSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
  message: "Time must be in HH:mm format",
});

export const dayOfWeekSchema = z.enum([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
]);

export const sessionStatusSchema = z.enum(['delivered', 'rescheduled', 'cancelled']);

export const roleSchema = z.enum([
  'super_admin', 'chairman', 'admin', 'cr_student', 'teacher', 'student'
]);

export const genderSchema = z.enum(['male', 'female', 'other']);

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

// Room schemas
export const createRoomSchema = z.object({
  roomName: z.string().min(1, "Room name is required"),
  location: z.string().min(1, "Location is required"),
});

export const getRoomsSchema = paginationSchema;

// Course schemas
export const createCourseSchema = z.object({
  courseCode: z.string().min(1, "Course code is required"),
  courseName: z.string().min(1, "Course name is required"),
  creditHours: z.number().positive("Credit hours must be greater than 0"),
  semester: z.number().int().positive("Semester must be greater than 0"),
});

export const addTeachersToCourseSchema = z.object({
  courseCode: z.string().min(1, "Course code is required"),
  teacherIds: z.array(uuidSchema).min(1, "At least one teacher ID is required"),
});

// Section schemas
export const createSectionSchema = z.object({
  sectionName: z.string().min(1, "Section name is required"),
  semester: z.number().int().positive("Semester must be greater than 0"),
});

// Batch schemas
export const createBatchSchema = z.object({
  batchName: z.string().min(1, "Batch name is required"),
});

export const updateBatchSchema = z.object({
  batchName: z.string().min(1, "Batch name is required"),
});

export const getBatchesSchema = paginationSchema;

// Student profile schemas
export const updateStudentProfileSchema = z.object({
  name: z.string().optional(),
  role: roleSchema.optional(),
  gender: genderSchema.optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Teacher profile schemas
export const updateTeacherProfileSchema = z.object({
  name: z.string().optional(),
  isGuestTeacher: z.boolean().optional(),
  gender: genderSchema.optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Routine schemas
export const createRoutineSchema = z.object({
  sectionId: uuidSchema,
  courseCode: z.string().min(1, "Course code is required"),
  teacherId: uuidSchema,
  roomId: uuidSchema,
  dayOfWeek: dayOfWeekSchema,
  startTime: timeSchema,
  endTime: timeSchema,
}).refine((data) => {
  const start = data.startTime.split(':').map(Number);
  const end = data.endTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  return startMinutes < endMinutes;
}, {
  message: "Start time must be before end time",
  path: ["endTime"],
});

export const updateRoutineSchema = z.object({
  sectionId: uuidSchema.optional(),
  courseCode: z.string().optional(),
  teacherId: uuidSchema.optional(),
  roomId: uuidSchema.optional(),
  dayOfWeek: dayOfWeekSchema.optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
}).refine((data) => {
  if (data.startTime && data.endTime) {
    const start = data.startTime.split(':').map(Number);
    const end = data.endTime.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    return startMinutes < endMinutes;
  }
  return true;
}, {
  message: "Start time must be before end time",
  path: ["endTime"],
});

export const getRoutinesSchema = paginationSchema.extend({
  batchId: uuidSchema.optional(),
  semester: z.coerce.number().int().positive().optional(),
  courseCode: z.string().optional(),
  sectionId: uuidSchema.optional(),
  teacherId: uuidSchema.optional(),
  weekDay: dayOfWeekSchema.optional(),
});

// Session schemas
export const getSessionsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sectionId: uuidSchema.optional(),
  teacherId: uuidSchema.optional(),
  roomId: uuidSchema.optional(),
  courseCode: z.string().optional(),
  dayOfWeek: dayOfWeekSchema.optional(),
  sessionStatus: sessionStatusSchema.optional(),
  semester: z.coerce.number().int().positive().optional(),
  batch: z.coerce.number().int().positive().optional(),
  includePrevious: z.coerce.boolean().default(false),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  date: z.string().datetime().optional(),
}).refine((data) => {
  // Both startDate and endDate must be provided together or not at all
  if (data.startDate && !data.endDate) return false;
  if (!data.startDate && data.endDate) return false;
  return true;
}, {
  message: "Both startDate and endDate must be provided together",
  path: ["endDate"],
});

export const updateSessionSchema = z.object({
  roomId: uuidSchema.optional(),
  date: z.string().datetime().optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  sessionStatus: sessionStatusSchema.optional(),
  rescheduleOrCancelReason: z.string().optional(),
}).refine((data) => {
  if (data.startTime && data.endTime) {
    const start = data.startTime.split(':').map(Number);
    const end = data.endTime.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    return startMinutes < endMinutes;
  }
  return true;
}, {
  message: "Start time must be before end time",
  path: ["endTime"],
}).refine((data) => {
  // Validation for different session statuses
  if (data.sessionStatus === 'delivered') {
    // All other fields should be null/undefined for delivered status
    return !data.roomId && !data.date && !data.startTime && !data.endTime && !data.rescheduleOrCancelReason;
  }
  if (data.sessionStatus === 'cancelled') {
    // Only rescheduleOrCancelReason should be provided for cancelled status
    return data.rescheduleOrCancelReason && !data.roomId && !data.date && !data.startTime && !data.endTime;
  }
  if (data.sessionStatus === 'rescheduled') {
    // All fields must be provided for rescheduled status
    return data.date && data.startTime && data.endTime && data.rescheduleOrCancelReason;
  }
  return true;
}, {
  message: "Invalid field combination for the specified session status",
  path: ["sessionStatus"],
});