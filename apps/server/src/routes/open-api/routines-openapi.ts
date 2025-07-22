import { createRoute, z } from '@hono/zod-openapi';
import { createOpenAPIApp, ErrorResponseSchema } from '../../lib/swagger';
import { 
  createRoutineSchema, 
  updateRoutineSchema, 
  getRoutinesSchema 
} from '../../utils/validation';
import { 
  uuidSchema, 
  dayOfWeekSchema, 
  timeSchema 
} from '../../types/common.types';
import { RoutineResponseSchema, RoutineListResponseSchema } from '../../types/routine.types';
import { requireAdmin, requireAuth } from '../../middleware/jwt-auth';
import { createError, AppError } from '../../utils/errors';
import { RoutineService } from '../../services/routine.service';

// Create OpenAPI app instance
const routinesRouter = createOpenAPIApp();

// Create Routine Route
const createRoutineRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Routines'],
  summary: 'Create a new routine',
  description: 'Creates a new class routine with conflict checking for section, room, and teacher availability. Only accessible by admin.',
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  request: {
    body: {
      content: {
        'application/json': {
          schema: createRoutineSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Routine created successfully',
      content: {
        'application/json': {
          schema: z.object({
            data: RoutineResponseSchema
          }),
        },
      },
    },
    400: {
      description: 'Bad Request - Invalid data or teacher not assigned to course',
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
      description: 'Forbidden - User is not an admin',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - Section, course, or room not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Conflict - Time slot conflicts with existing routine',
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

// Get Routines Route
const getRoutinesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Routines'],
  summary: 'Get routines with filtering and pagination',
  description: 'Retrieves a paginated list of routines with optional filtering by day, semester, section, teacher, course, or batch',
  security: [{ Bearer: [] }],
  middleware: requireAuth,
  request: {
    query: getRoutinesSchema,
  },
  responses: {
    200: {
      description: 'Routines retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(RoutineListResponseSchema),
            meta: z.object({
              total: z.number().int().nonnegative(),
              page: z.number().int().positive(),
              limit: z.number().int().positive(),
              totalPages: z.number().int().nonnegative()
            })
          }),
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

// Update Routine Route
const updateRoutineRoute = createRoute({
  method: 'put',
  path: '/:routineId',
  tags: ['Routines'],
  summary: 'Update an existing routine',
  description: 'Updates a routine with conflict checking and validation. Only accessible by admin.',
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  request: {
    params: z.object({
      routineId: uuidSchema,
    }),
    body: {
      content: {
        'application/json': {
          schema: updateRoutineSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Routine updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              routineId: uuidSchema,
              section: z.object({
                sectionId: uuidSchema,
                sectionName: z.string(),
              }),
              course: z.object({
                courseCode: z.string(),
                courseName: z.string(),
              }),
              teacher: z.object({
                teacherId: uuidSchema,
                name: z.string(),
                email: z.string().email(),
              }),
              room: z.object({
                roomId: uuidSchema,
                roomName: z.string(),
              }),
              dayOfWeek: dayOfWeekSchema,
              startTime: timeSchema,
              endTime: timeSchema,
              updatedBy: z.object({
                id: uuidSchema,
                name: z.string(),
                email: z.string().email(),
                role: z.string(),
                updatedAt: z.string(),
              }),
            }),
          }),
        },
      },
    },
    400: {
      description: 'Bad Request - Invalid data or validation errors',
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
      description: 'Forbidden - User is not an admin',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - Routine, section, or room not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Conflict - Time slot conflicts with existing routine',
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

// Delete Routine Route
const deleteRoutineRoute = createRoute({
  method: 'delete',
  path: '/:routineId',
  tags: ['Routines'],
  summary: 'Delete a routine',
  description: 'Permanently deletes a routine by its ID. Only accessible by admin.',
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  request: {
    params: z.object({
      routineId: uuidSchema,
    }),
  },
  responses: {
    200: {
      description: 'Routine deleted successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            routineId: uuidSchema
          }),
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
      description: 'Forbidden - User is not an admin',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Not Found - Routine not found',
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

// Add routes to the router
routinesRouter.openapi(createRoutineRoute, async (c) => {
  try {
    const data = c.req.valid('json');
    const user = c.get('user')!;
    
    const result = await RoutineService.createRoutine({ ...data, userId: user.id });
    return c.json({ data: result }, 201);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected routine creation error:', error);
    throw createError.internalServer('Failed to create routine');
  }
});

routinesRouter.openapi(getRoutinesRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    
    const result = await RoutineService.getRoutines(query);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected routines retrieval error:', error);
    throw createError.internalServer('Failed to fetch routines');
  }
});

routinesRouter.openapi(updateRoutineRoute, async (c) => {
  try {
    const { routineId } = c.req.valid('param');
    const data = c.req.valid('json');
    const user = c.get('user')!;
    
    const result = await RoutineService.updateRoutine(routineId, data, user.id);
    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected routine update error:', error);
    throw createError.internalServer('Failed to update routine');
  }
});

routinesRouter.openapi(deleteRoutineRoute, async (c) => {
  try {
    const { routineId } = c.req.valid('param');
    
    const result = await RoutineService.deleteRoutine(routineId);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected routine deletion error:', error);
    throw createError.internalServer('Failed to delete routine');
  }
});

export { routinesRouter };