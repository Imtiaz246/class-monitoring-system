import { createRoute, z } from '@hono/zod-openapi';
import { 
  createOpenAPIApp, 
  CreateSectionResponseSchema,
  SectionsListResponseSchema,
  ErrorResponseSchema,
  commonErrorResponses
} from '../lib/swagger';
import { createSectionSchema, uuidParamSchema } from '../utils/validation';
import { requireAdmin } from '../middleware/jwt-auth';
import { createError, AppError } from '../utils/errors';
import { SectionService } from '../services/section.service';

// Create OpenAPI app instance
const sectionsRouter = createOpenAPIApp();

// Create Section Route
const createSectionRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Section Management'],
  summary: 'Create a new section',
  description: 'Create a new section for a specific batch and semester. Only accessible by admin and above.',
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  request: {
    body: {
      content: {
        'application/json': {
          schema: createSectionSchema.openapi({
            example: {
              sectionName: 'Section A',
              semester: 1,
              batchId: '123e4567-e89b-12d3-a456-426614174001'
            }
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Section created successfully',
      content: {
        'application/json': {
          schema: CreateSectionResponseSchema,
        },
      },
    },
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
    409: {
      description: 'Conflict - Section already exists',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

sectionsRouter.openapi(createSectionRoute, async (c) => {
  try {
    const data = c.req.valid('json');
    const user = c.get('user')!;
    
    const result = await SectionService.createSection(data, user.id);
    return c.json(result, 201);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected section creation error:', error);
    throw createError.internalServer('Failed to create section');
  }
});

// Get Sections by Batch ID Route
const getSectionsByBatchIdRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Section Management'],
  summary: 'Get sections by batch ID',
  description: 'Retrieve all sections associated with a specific batch ID.',
  request: {
    params: uuidParamSchema.openapi({
      example: {
        id: '123e4567-e89b-12d3-a456-426614174001'
      }
    }),
  },
  responses: {
    200: {
      description: 'Sections retrieved successfully',
      content: {
        'application/json': {
          schema: SectionsListResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request - Invalid batch ID format',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - Batch not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

sectionsRouter.openapi(getSectionsByBatchIdRoute, async (c) => {
  try {
    const { id: batchId } = c.req.valid('param');
    
    const result = await SectionService.getSectionsByBatchId(batchId);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected sections retrieval error:', error);
    throw createError.internalServer('Failed to fetch sections');
  }
});

export { sectionsRouter };