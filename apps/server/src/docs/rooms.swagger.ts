import { createRoute, z } from '@hono/zod-openapi';
import { createRoomSchema, paginationSchema } from '../utils/validation';

// Response schemas
const UserInfoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const RoomResponseSchema = z.object({
  roomId: z.string().uuid(),
  roomName: z.string(),
  location: z.string(),
  updatedAt: z.string().datetime(),
  updatedBy: UserInfoSchema,
});

const PaginationResponseSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

const RoomsListResponseSchema = z.object({
  message: z.string(),
  data: z.array(RoomResponseSchema),
  pagination: PaginationResponseSchema,
});

const RoomCreateResponseSchema = z.object({
  message: z.string(),
  data: RoomResponseSchema,
});

const RoomSingleResponseSchema = z.object({
  message: z.string(),
  data: RoomResponseSchema,
});

const RoomDeleteResponseSchema = z.object({
  message: z.string(),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
});

const ValidationErrorResponseSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    code: z.string(),
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string(),
  })).optional(),
});

// Parameter schemas
const RoomIdParamSchema = z.object({
  id: z.string().uuid('Invalid room ID format'),
});

// Create Room Route
export const createRoomRoute = createRoute({
  method: 'post',
  path: '/api/v1/rooms',
  tags: ['Rooms'],
  summary: 'Create a new room',
  description: 'Creates a new room with the specified name and location. Requires admin privileges.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createRoomSchema,
          example: {
            roomName: 'Room 101',
            location: 'Building A, First Floor',
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Room created successfully',
      content: {
        'application/json': {
          schema: RoomCreateResponseSchema,
          example: {
            message: 'Room created successfully',
            data: {
              roomId: '123e4567-e89b-12d3-a456-426614174000',
              roomName: 'Room 101',
              location: 'Building A, First Floor',
              updatedAt: '2024-01-15T10:30:00Z',
              updatedBy: {
                id: '123e4567-e89b-12d3-a456-426614174001',
                name: 'John Admin',
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ValidationErrorResponseSchema,
          example: {
            error: 'Validation failed',
            details: [
              {
                code: 'too_small',
                path: ['roomName'],
                message: 'Room name is required',
              },
            ],
          },
        },
      },
    },
    401: {
      description: 'Unauthorized - Invalid or missing authentication token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Unauthorized',
          },
        },
      },
    },
    403: {
      description: 'Forbidden - Admin privileges required',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Admin privileges required',
          },
        },
      },
    },
    409: {
      description: 'Conflict - Room with same name and location already exists',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Room with this name and location already exists',
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Internal server error',
          },
        },
      },
    },
  },
});

// Get Rooms Route
export const getRoomsRoute = createRoute({
  method: 'get',
  path: '/api/v1/rooms',
  tags: ['Rooms'],
  summary: 'Get list of rooms',
  description: 'Retrieves a paginated list of all rooms. Supports search functionality.',
  security: [{ bearerAuth: [] }],
  request: {
    query: paginationSchema,
  },
  responses: {
    200: {
      description: 'Rooms retrieved successfully',
      content: {
        'application/json': {
          schema: RoomsListResponseSchema,
          example: {
            message: 'Rooms retrieved successfully',
            data: [
              {
                roomId: '123e4567-e89b-12d3-a456-426614174000',
                roomName: 'Room 101',
                location: 'Building A, First Floor',
                updatedAt: '2024-01-15T10:30:00Z',
                updatedBy: {
                  id: '123e4567-e89b-12d3-a456-426614174001',
                  name: 'John Admin',
                },
              },
              {
                roomId: '123e4567-e89b-12d3-a456-426614174002',
                roomName: 'Room 102',
                location: 'Building A, First Floor',
                updatedAt: '2024-01-15T11:00:00Z',
                updatedBy: {
                  id: '123e4567-e89b-12d3-a456-426614174001',
                  name: 'John Admin',
                },
              },
            ],
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ValidationErrorResponseSchema,
          example: {
            error: 'Validation failed',
            details: [
              {
                code: 'too_small',
                path: ['page'],
                message: 'Page must be at least 1',
              },
            ],
          },
        },
      },
    },
    401: {
      description: 'Unauthorized - Invalid or missing authentication token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Unauthorized',
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Internal server error',
          },
        },
      },
    },
  },
});

// Get Single Room Route
export const getRoomByIdRoute = createRoute({
  method: 'get',
  path: '/api/v1/rooms/{id}',
  tags: ['Rooms'],
  summary: 'Get room by ID',
  description: 'Retrieves a single room by its unique identifier.',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamSchema,
  },
  responses: {
    200: {
      description: 'Room retrieved successfully',
      content: {
        'application/json': {
          schema: RoomSingleResponseSchema,
          example: {
            message: 'Room retrieved successfully',
            data: {
              roomId: '123e4567-e89b-12d3-a456-426614174000',
              roomName: 'Room 101',
              location: 'Building A, First Floor',
              updatedAt: '2024-01-15T10:30:00Z',
              updatedBy: {
                id: '123e4567-e89b-12d3-a456-426614174001',
                name: 'John Admin',
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Validation error - Invalid room ID format',
      content: {
        'application/json': {
          schema: ValidationErrorResponseSchema,
          example: {
            error: 'Validation failed',
            details: [
              {
                code: 'invalid_string',
                path: ['id'],
                message: 'Invalid room ID format',
              },
            ],
          },
        },
      },
    },
    401: {
      description: 'Unauthorized - Invalid or missing authentication token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Unauthorized',
          },
        },
      },
    },
    404: {
      description: 'Room not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Room not found',
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Internal server error',
          },
        },
      },
    },
  },
});

// Update Room Route
export const updateRoomRoute = createRoute({
  method: 'put',
  path: '/api/v1/rooms/{id}',
  tags: ['Rooms'],
  summary: 'Update room',
  description: 'Updates an existing room with new name and/or location. Requires admin privileges.',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: createRoomSchema,
          example: {
            roomName: 'Room 101A',
            location: 'Building A, First Floor - Updated',
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Room updated successfully',
      content: {
        'application/json': {
          schema: RoomCreateResponseSchema,
          example: {
            message: 'Room updated successfully',
            data: {
              roomId: '123e4567-e89b-12d3-a456-426614174000',
              roomName: 'Room 101A',
              location: 'Building A, First Floor - Updated',
              updatedAt: '2024-01-15T12:30:00Z',
              updatedBy: {
                id: '123e4567-e89b-12d3-a456-426614174001',
                name: 'John Admin',
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ValidationErrorResponseSchema,
          example: {
            error: 'Validation failed',
            details: [
              {
                code: 'too_small',
                path: ['roomName'],
                message: 'Room name is required',
              },
            ],
          },
        },
      },
    },
    401: {
      description: 'Unauthorized - Invalid or missing authentication token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Unauthorized',
          },
        },
      },
    },
    403: {
      description: 'Forbidden - Admin privileges required',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Admin privileges required',
          },
        },
      },
    },
    404: {
      description: 'Room not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Room not found',
          },
        },
      },
    },
    409: {
      description: 'Conflict - Room with same name and location already exists',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Room with this name and location already exists',
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Internal server error',
          },
        },
      },
    },
  },
});

// Delete Room Route
export const deleteRoomRoute = createRoute({
  method: 'delete',
  path: '/api/v1/rooms/{id}',
  tags: ['Rooms'],
  summary: 'Delete room',
  description: 'Deletes an existing room. Requires admin privileges.',
  security: [{ bearerAuth: [] }],
  request: {
    params: RoomIdParamSchema,
  },
  responses: {
    200: {
      description: 'Room deleted successfully',
      content: {
        'application/json': {
          schema: RoomDeleteResponseSchema,
          example: {
            message: 'Room deleted successfully',
          },
        },
      },
    },
    400: {
      description: 'Validation error - Invalid room ID format',
      content: {
        'application/json': {
          schema: ValidationErrorResponseSchema,
          example: {
            error: 'Validation failed',
            details: [
              {
                code: 'invalid_string',
                path: ['id'],
                message: 'Invalid room ID format',
              },
            ],
          },
        },
      },
    },
    401: {
      description: 'Unauthorized - Invalid or missing authentication token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Unauthorized',
          },
        },
      },
    },
    403: {
      description: 'Forbidden - Admin privileges required',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Admin privileges required',
          },
        },
      },
    },
    404: {
      description: 'Room not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Room not found',
          },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
          example: {
            error: 'Internal server error',
          },
        },
      },
    },
  },
});

// Export all room routes
export const roomRoutes = {
  createRoomRoute,
  getRoomsRoute,
  getRoomByIdRoute,
  updateRoomRoute,
  deleteRoomRoute,
};