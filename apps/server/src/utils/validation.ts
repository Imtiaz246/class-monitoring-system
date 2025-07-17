import { z } from '@hono/zod-openapi';
import { zValidator as originalZValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { ZodIssue, ZodSchema } from 'zod';
import { createError } from './errors';
import { 
  uuidSchema, 
  roleSchema, 
  genderSchema, 
  paginationSchema,
  uuidParamSchema,
  timeSchema,
  dayOfWeekSchema,
  sessionStatusSchema
} from '../types/common.types';

// Custom zValidator wrapper that throws HTTPException for global error handling
export const zValidator = <T extends ZodSchema, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T
) => originalZValidator(target, schema, (result) => {
  if (!result.success) {
    throw createError.validationFailed<ZodIssue[]>('Validation failed', result.error.issues);
  }
});

// Re-export common validation schemas from common.types.ts
export { 
  uuidSchema, 
  roleSchema, 
  genderSchema, 
  paginationSchema,
  uuidParamSchema,
  timeSchema,
  dayOfWeekSchema,
  sessionStatusSchema
};

// Re-export authentication schemas from their respective types file
export {
  registerStudentSchema,
  loginSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  requestPasswordChangeOtpSchema,
  verifyPasswordChangeOtpSchema,
  changePasswordWithTokenSchema
} from '../types/auth.types';

// Room schemas
export const createRoomSchema = z.object({
  roomName: z.string().min(1, "Room name is required"),
  location: z.string().min(1, "Location is required"),
});

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

// Re-export section schemas from their respective types file
export { createSectionSchema } from '../types/section.types';

// Re-export batch schemas from their respective types file
export { createBatchSchema, updateBatchSchema, getBatchesSchema } from '../types/batch.types';

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