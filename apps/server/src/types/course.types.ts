import { z } from '@hono/zod-openapi';
import { paginationSchema } from './common.types';

// Course query schemas
export const getCoursesSchema = paginationSchema.extend({
  semester: z.coerce.number().int().positive().optional().openapi({
    example: 1,
    description: 'Filter courses by semester'
  }),
});

// Course input/creation schemas
export const createCourseSchema = z.object({
  courseCode: z.string().min(1, "Course code is required").openapi({
    example: 'CSE101',
    description: 'Unique course code'
  }),
  courseName: z.string().min(1, "Course name is required").openapi({
    example: 'Introduction to Computer Science',
    description: 'Name of the course'
  }),
  creditHours: z.number().positive("Credit hours must be positive").openapi({
    example: 3.0,
    description: 'Credit hours for the course'
  }),
  semester: z.number().int().positive("Semester must be a positive integer").openapi({
    example: 1,
    description: 'Semester number'
  }),
});

export const updateCourseSchema = z.object({
  courseName: z.string().min(1, "Course name is required").optional().openapi({
    example: 'Updated Introduction to Computer Science',
    description: 'Updated name of the course'
  }),
  creditHours: z.number().positive("Credit hours must be positive").optional().openapi({
    example: 3.5,
    description: 'Updated credit hours for the course'
  }),
  semester: z.number().int().positive("Semester must be a positive integer").optional().openapi({
    example: 2,
    description: 'Updated semester number'
  }),
});

export const addTeachersToCourseSchema = z.object({
  courseCode: z.string().min(1, "Course code is required").openapi({
    example: 'CSE101',
    description: 'Course code to assign teachers to'
  }),
  teacherIds: z.array(z.string().uuid()).min(1, "At least one teacher ID is required").openapi({
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    description: 'Array of teacher IDs to assign to the course'
  }),
});

// Course response schemas
export const UserInfoSchema = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  role: z.enum(['super_admin', 'chairman', 'admin', 'cr_student', 'teacher', 'student']).nullable(),
  updatedAt: z.string().datetime(),
});

export const CourseResponseSchema = z.object({
  courseCode: z.string(),
  courseName: z.string(),
  creditHours: z.number(),
  semester: z.number().positive(),
  updatedBy: UserInfoSchema,
});

export const CourseListResponseSchema = z.object({
  data: z.array(CourseResponseSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }).optional(),
});

export const CourseCreateResponseSchema = z.object({
  message: z.string(),
  data: CourseResponseSchema,
});

export const CourseUpdateResponseSchema = z.object({
  message: z.string(),
  data: CourseResponseSchema,
});

export const CourseDeleteResponseSchema = z.object({
  message: z.string(),
});

export const CourseErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});

export const AddTeachersToCourseResponseSchema = z.object({
  data: z.object({
    courseCode: z.string(),
    teacherIds: z.array(z.string().uuid()),
    message: z.string(),
  }),
});

// Inferred TypeScript types
export type GetCoursesQuery = z.infer<typeof getCoursesSchema>;
export type CreateCourseData = z.infer<typeof createCourseSchema>;
export type UpdateCourseData = z.infer<typeof updateCourseSchema>;
export type AddTeachersToCourseData = z.infer<typeof addTeachersToCourseSchema>;
export type CourseResponse = z.infer<typeof CourseResponseSchema>;
export type CourseListResponse = z.infer<typeof CourseListResponseSchema>;
export type CourseCreateResponse = z.infer<typeof CourseCreateResponseSchema>;
export type CourseUpdateResponse = z.infer<typeof CourseUpdateResponseSchema>;
export type CourseDeleteResponse = z.infer<typeof CourseDeleteResponseSchema>;
export type CourseErrorResponse = z.infer<typeof CourseErrorResponseSchema>;
export type AddTeachersToCourseResponse = z.infer<typeof AddTeachersToCourseResponseSchema>;