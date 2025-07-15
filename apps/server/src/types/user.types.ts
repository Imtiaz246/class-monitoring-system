import { z } from 'zod';
import { genderSchema, roleSchema } from '../utils/validation';

// Zod schemas for user responses
export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: roleSchema,
  gender: genderSchema.nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  emailVerified: z.boolean(),
  isActive: z.boolean(),
  lastLoginAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TeacherResponseSchema = z.object({
  userId: z.string().uuid(),
  teacherId: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  gender: genderSchema.nullable(),
  isGuestTeacher: z.boolean(),
  isActive: z.boolean(),
  updatedByUser: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    role: roleSchema,
    updatedAt: z.string().datetime(),
  }),
});

export const StudentResponseSchema = z.object({
  userId: z.string().uuid(),
  studentId: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  gender: genderSchema.nullable(),
  semester: z.number().int(),
  section: z.object({
    sectionId: z.string().uuid(),
    sectionName: z.string(),
  }),
  batch: z.object({
    batchId: z.string().uuid(),
    batchName: z.string(),
  }),
  isActive: z.boolean(),
  updatedByUser: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    role: roleSchema,
    updatedAt: z.string().datetime(),
  }),
});

// User creation and update schemas
export const CreateAdminSchema = z.object({
  email: z.string().email('Invalid email format').openapi({
    example: 'admin@example.com',
    description: 'Admin email address'
  }),
  name: z.string().min(2, 'Name must be at least 2 characters').openapi({
    example: 'John Admin',
    description: 'Full name of the admin'
  }),
  role: z.enum(['chairman', 'admin']).openapi({
    example: 'admin',
    description: 'Role of the user - either chairman or admin'
  }),
  gender: genderSchema.optional().openapi({
    example: 'male',
    description: 'Gender of the admin'
  }),
  phone: z.string().optional().openapi({
    example: '+1234567890',
    description: 'Phone number'
  }),
  address: z.string().optional().openapi({
    example: '123 Admin Street',
    description: 'Address'
  }),
});

export const CreateTeacherSchema = z.object({
  email: z.string().email('Invalid email format').openapi({
    example: 'teacher@example.com',
    description: 'Teacher email address'
  }),
  name: z.string().min(2, 'Name must be at least 2 characters').openapi({
    example: 'Jane Teacher',
    description: 'Full name of the teacher'
  }),
  gender: genderSchema.optional().openapi({
    example: 'female',
    description: 'Gender of the teacher'
  }),
  phone: z.string().optional().openapi({
    example: '+1234567890',
    description: 'Phone number'
  }),
  address: z.string().optional().openapi({
    example: '123 Teacher Street',
    description: 'Address'
  }),
  isGuestTeacher: z.boolean().default(false).openapi({
    example: false,
    description: 'Whether the teacher is a guest teacher'
  }),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional().openapi({
    example: 'Updated Name',
    description: 'Updated name'
  }),
  gender: genderSchema.optional().openapi({
    example: 'male',
    description: 'Updated gender'
  }),
  phone: z.string().optional().openapi({
    example: '+1234567890',
    description: 'Updated phone number'
  }),
  address: z.string().optional().openapi({
    example: '123 Updated Street',
    description: 'Updated address'
  }),
});

export const UpdateTeacherSchema = UpdateUserSchema.extend({
  isGuestTeacher: z.boolean().optional().openapi({
    example: true,
    description: 'Updated guest teacher status'
  }),
});

export const UpdateStudentSchema = UpdateUserSchema.extend({
  priority: z.number().int().optional().openapi({
    example: 1,
    description: 'Updated priority'
  }),
});

export const TokensResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

// Inferred TypeScript types
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type TeacherResponse = z.infer<typeof TeacherResponseSchema>;
export type StudentResponse = z.infer<typeof StudentResponseSchema>;
export type CreateAdminData = z.infer<typeof CreateAdminSchema>;
export type CreateTeacherData = z.infer<typeof CreateTeacherSchema>;
export type UpdateUserData = z.infer<typeof UpdateUserSchema>;
export type UpdateTeacherData = z.infer<typeof UpdateTeacherSchema>;
export type UpdateStudentData = z.infer<typeof UpdateStudentSchema>;
export type TokensResponse = z.infer<typeof TokensResponseSchema>;