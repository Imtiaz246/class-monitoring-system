import { OpenAPIHono, z } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import type { HonoContext } from '../utils/types';
import { genderSchema, roleSchema } from '../utils/validation';

// Create OpenAPI Hono instance
export const createOpenAPIApp = () => {
  const app = new OpenAPIHono<HonoContext>();

  // Add OpenAPI documentation endpoint
  app.doc('/doc', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Class Monitoring System API',
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'User Management',
        description: 'User creation, retrieval, and management endpoints'
      },
      {
        name: 'Batch Management',
        description: 'Batch creation, retrieval, and management endpoints'
      },
      {
        name: 'Section Management',
        description: 'Section creation, retrieval, and management endpoints'
      },
    ],
  });

  // Add security schemes separately
  app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  app.openAPIRegistry.registerComponent('securitySchemes', 'RefreshToken', {
    type: 'apiKey',
    in: 'header',
    name: 'X-Refresh-Token',
  });

  // Add Swagger UI endpoint
  app.get('/ui', swaggerUI({ url: './doc' }));

  return app;
};

// Common response schemas
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

export const SuccessResponseSchema = z.object({
  message: z.string(),
});

// User-related response schemas
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

// Common error responses for reuse across routes
export const commonErrorResponses = {
  400: {
    description: 'Bad Request - Invalid input data',
    content: {
      'application/json': {
        schema: ErrorResponseSchema,
      },
    },
  },
  401: {
    description: 'Unauthorized - Authentication required',
    content: {
      'application/json': {
        schema: ErrorResponseSchema,
      },
    },
  },
  403: {
    description: 'Forbidden - Insufficient permissions',
    content: {
      'application/json': {
        schema: ErrorResponseSchema,
      },
    },
  },
  404: {
    description: 'Not Found - Resource does not exist',
    content: {
      'application/json': {
        schema: ErrorResponseSchema,
      },
    },
  },
  409: {
    description: 'Conflict - Resource already exists',
    content: {
      'application/json': {
        schema: ErrorResponseSchema,
      },
    },
  },
  422: {
    description: 'Unprocessable Entity - Validation failed',
    content: {
      'application/json': {
        schema: ErrorResponseSchema,
      },
    },
  },
  500: {
    description: 'Internal Server Error - Server malfunction',
    content: {
      'application/json': {
        schema: ErrorResponseSchema,
      },
    },
  },
};

// Pagination schema for list endpoints
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1).openapi({
    example: 1,
    description: 'Page number (1-based)'
  }),
  limit: z.number().int().min(1).max(100).default(10).openapi({
    example: 10,
    description: 'Number of items per page (max 100)'
  }),
  total: z.number().int().openapi({
    example: 150,
    description: 'Total number of items'
  }),
  totalPages: z.number().int().openapi({
    example: 15,
    description: 'Total number of pages'
  }),
});

// Generic paginated response wrapper
export const createPaginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) => {
  return z.object({
    data: z.array(itemSchema),
    pagination: PaginationSchema,
  });
};

// Section-related schemas
export const SectionResponseSchema = z.object({
  sectionId: z.string().uuid().openapi({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the section'
  }),
  sectionName: z.string().openapi({
    example: 'Section A',
    description: 'Name of the section'
  }),
  semester: z.number().int().positive().openapi({
    example: 1,
    description: 'Semester number'
  }),
  batchId: z.string().uuid().openapi({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'Unique identifier for the batch'
  }),
  updatedBy: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    role: roleSchema,
    updatedAt: z.string().datetime(),
  }).openapi({
    description: 'Information about the user who last updated this section'
  }),
});

export const SectionWithBatchResponseSchema = z.object({
  sectionId: z.string().uuid().openapi({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the section'
  }),
  sectionName: z.string().openapi({
    example: 'Section A',
    description: 'Name of the section'
  }),
  semester: z.number().int().positive().openapi({
    example: 1,
    description: 'Semester number'
  }),
  batch: z.object({
    batchId: z.string().uuid(),
    batchName: z.string(),
  }).nullable().openapi({
    description: 'Batch information associated with this section'
  }),
  updatedBy: z.object({
    id: z.string().uuid().nullable(),
    name: z.string().nullable(),
    email: z.string().email().nullable(),
    role: roleSchema.nullable(),
    updatedAt: z.string().datetime().nullable(),
  }).nullable().openapi({
    description: 'Information about the user who last updated this section'
  }),
});

export const CreateSectionResponseSchema = z.object({
  message: z.string().openapi({
    example: 'Section created successfully',
    description: 'Success message'
  }),
  data: SectionResponseSchema,
});

export const SectionsListResponseSchema = z.object({
  data: z.array(SectionWithBatchResponseSchema).openapi({
    description: 'List of sections with batch information'
  }),
});