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
      {
        name: 'Rooms',
        description: 'Room creation, retrieval, update, and deletion endpoints'
      },
      {
        name: 'Courses',
        description: 'Course creation, retrieval, update, deletion, and teacher assignment endpoints'
      },
      {
        name: 'Routines',
        description: 'Routine creation, retrieval, update, and deletion endpoints for class schedules'
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

// Re-export user schemas from their respective types file
export {
  UserResponseSchema,
  TeacherResponseSchema,
  StudentResponseSchema,
  CreateAdminSchema,
  CreateTeacherSchema,
  UpdateUserSchema,
  UpdateTeacherSchema,
  UpdateStudentSchema,
  TokensResponseSchema
} from '../types/user.types';

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

// Re-export section schemas from their respective types file
export {
  SectionResponseSchema,
  SectionWithBatchSchema as SectionWithBatchResponseSchema,
  CreateSectionResponseSchema,
  SectionsListResponseSchema
} from '../types/section.types';