import { OpenAPIHono, z } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import type { HonoContext } from '../utils/types';

// Create OpenAPI Hono instance
export const createOpenAPIApp = () => {
  const app = new OpenAPIHono<HonoContext>();

  // Add OpenAPI documentation endpoint
  app.doc('/doc', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Class Monitoring System API',
      description: 'API documentation for the Class Monitoring System',
    },
    servers: [
      {
        url: 'http://localhost:3001/api/auth',
        description: 'Development server',
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

export const UserResponseSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['student', 'teacher', 'admin']),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  emailVerified: z.boolean(),
  lastLoginAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TokensResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

// Common error responses
// export const commonErrorResponses = {
//   400: {
//     description: 'Bad Request',
//     content: {
//       'application/json': {
//         schema: ErrorResponseSchema,
//       },
//     },
//   },
//   401: {
//     description: 'Unauthorized',
//     content: {
//       'application/json': {
//         schema: ErrorResponseSchema,
//       },
//     },
//   },
//   404: {
//     description: 'Not Found',
//     content: {
//       'application/json': {
//         schema: ErrorResponseSchema,
//       },
//     },
//   },
//   409: {
//     description: 'Conflict',
//     content: {
//       'application/json': {
//         schema: ErrorResponseSchema,
//       },
//     },
//   },
//   500: {
//     description: 'Internal Server Error',
//     content: {
//       'application/json': {
//         schema: ErrorResponseSchema,
//       },
//     },
//   },
// };