import { z } from '@hono/zod-openapi';

// Common validation schemas used across the application
export const uuidSchema = z.string().uuid('Invalid UUID format');

export const roleSchema = z.enum([
  'super_admin', 'chairman', 'admin', 'cr_student', 'teacher', 'student'
]);

export const genderSchema = z.enum(['male', 'female', 'other']);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Common parameter schemas
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});

export const timeSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
  message: "Time must be in HH:mm format",
});

export const dayOfWeekSchema = z.enum([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
]);

export const sessionStatusSchema = z.enum(['delivered', 'rescheduled', 'cancelled']);