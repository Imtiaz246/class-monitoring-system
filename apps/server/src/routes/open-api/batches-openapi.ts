import { createRoute, z } from '@hono/zod-openapi';
import { 
  createOpenAPIApp, 
  SuccessResponseSchema,
  ErrorResponseSchema
} from '../../lib/swagger';
import { 
  requireAdmin
} from '../../middleware/jwt-auth';
import { uuidParamSchema, createBatchSchema, updateBatchSchema, getBatchesSchema } from '../../utils/validation';
import { createError, AppError } from '../../utils/errors';
import { BatchService } from '../../services/batch.service';
import {
  BatchListResponseSchema,
  BatchCreateResponseSchema
} from '../../types/batch.types';

// Create OpenAPI app instance
const batchesRouter = createOpenAPIApp();

// Create Batch Route
const createBatchRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Batch Management'],
  summary: 'Create a new batch',
  description: 'Create a new batch. Only accessible by admin and above.',
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  request: {
    body: {
      content: {
        'application/json': {
          schema: createBatchSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Batch created successfully',
      content: {
        'application/json': {
          schema: BatchCreateResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Conflict - Batch name already exists',
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

batchesRouter.openapi(createBatchRoute, async (c) => {
  try {
    const data = c.req.valid('json');
    const user = c.get('user')!;
    const result = await BatchService.createBatch(data, user.id);
    return c.json(result, 201);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected batch creation error:', error);
    throw createError.internalServer('Failed to create batch');
  }
});

// Get All Batches Route
const getAllBatchesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Batch Management'],
  summary: 'Get all batches',
  description: 'Retrieve a paginated list of all batches. Open for all.',
  request: {
    query: getBatchesSchema,
  },
  responses: {
    200: {
      description: 'Batches retrieved successfully',
      content: {
        'application/json': {
          schema: BatchListResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request',
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

batchesRouter.openapi(getAllBatchesRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const result = await BatchService.getAllBatches(query);
    return c.json(result, 200);
  } catch (error) {
    console.error('Unexpected error fetching batches:', error);
    throw createError.internalServer('Failed to fetch batches');
  }
});

// Update Batch Route
const updateBatchRoute = createRoute({
  method: 'put',
  path: '/{id}',
  tags: ['Batch Management'],
  summary: 'Update a batch',
  description: 'Update an existing batch by ID. Only accessible by admin and above.',
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  request: {
    params: uuidParamSchema,
    body: {
      content: {
        'application/json': {
          schema: updateBatchSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Batch updated successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Batch not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Conflict - Batch name already exists',
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

batchesRouter.openapi(updateBatchRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
    const user = c.get('user')!;
    const result = await BatchService.updateBatch(id, data, user.id);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected batch update error:', error);
    throw createError.internalServer('Failed to update batch');
  }
});

export { batchesRouter };