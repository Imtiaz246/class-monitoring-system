import { createRoute, z } from '@hono/zod-openapi';
import { 
  createOpenAPIApp, 
  SuccessResponseSchema,
  ErrorResponseSchema,
  commonErrorResponses
} from '../../lib/swagger';
import { createRoomSchema, paginationSchema, uuidParamSchema } from '../../utils/validation';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { RoomService } from '../../services/room.service';

// Create OpenAPI app instance
const roomsRouter = createOpenAPIApp();

// Response schemas
const UserInfoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
  updatedAt: z.string().datetime(),
});

const RoomResponseSchema = z.object({
  roomId: z.string().uuid(),
  roomName: z.string(),
  location: z.string(),
  updatedBy: UserInfoSchema,
});

const MetaResponseSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

const RoomsListResponseSchema = z.object({
  data: z.array(RoomResponseSchema),
  meta: MetaResponseSchema,
});

const RoomCreateResponseSchema = z.object({
  message: z.string(),
  data: RoomResponseSchema,
});

const RoomSingleResponseSchema = z.object({
  data: RoomResponseSchema,
});

const RoomDeleteResponseSchema = z.object({
  message: z.string(),
});

// Create Room Route
const createRoomRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Rooms'],
  summary: 'Create a new room',
  description: 'Creates a new room with the specified name and location. Requires admin privileges.',
  security: [{ bearerAuth: [] }],
  middleware: [requireAdmin],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createRoomSchema,
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
        },
      },
    },
    ...commonErrorResponses,
    409: {
      description: 'Conflict - Room with same name and location already exists',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Get Rooms Route
const getRoomsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Rooms'],
  summary: 'Get list of rooms',
  description: 'Retrieves a paginated list of all rooms. Supports search functionality.',
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth],
  request: {
    query: paginationSchema,
  },
  responses: {
    200: {
      description: 'Rooms retrieved successfully',
      content: {
        'application/json': {
          schema: RoomsListResponseSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

// Get Single Room Route
const getRoomByIdRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Rooms'],
  summary: 'Get room by ID',
  description: 'Retrieves a single room by its unique identifier.',
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth],
  request: {
    params: uuidParamSchema,
  },
  responses: {
    200: {
      description: 'Room retrieved successfully',
      content: {
        'application/json': {
          schema: RoomSingleResponseSchema,
        },
      },
    },
    ...commonErrorResponses,
    404: {
      description: 'Room not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Update Room Route
const updateRoomRoute = createRoute({
  method: 'put',
  path: '/{id}',
  tags: ['Rooms'],
  summary: 'Update room',
  description: 'Updates an existing room with new name and/or location. Requires admin privileges.',
  security: [{ bearerAuth: [] }],
  middleware: [requireAdmin],
  request: {
    params: uuidParamSchema,
    body: {
      content: {
        'application/json': {
          schema: createRoomSchema,
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
        },
      },
    },
    ...commonErrorResponses,
    404: {
      description: 'Room not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Conflict - Room with same name and location already exists',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Delete Room Route
const deleteRoomRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Rooms'],
  summary: 'Delete room',
  description: 'Deletes an existing room. Requires admin privileges.',
  security: [{ bearerAuth: [] }],
  middleware: [requireAdmin],
  request: {
    params: uuidParamSchema,
  },
  responses: {
    200: {
      description: 'Room deleted successfully',
      content: {
        'application/json': {
          schema: RoomDeleteResponseSchema,
        },
      },
    },
    ...commonErrorResponses,
    404: {
      description: 'Room not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Implement the routes
roomsRouter.openapi(createRoomRoute, async (c) => {
  const roomData = c.req.valid('json');
  const user = c.get('user')!;

  try {
    const room = await RoomService.createRoom(roomData, user.id);
    
    return c.json({
      message: 'Room created successfully',
      data: room,
    }, 201);
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
});

roomsRouter.openapi(getRoomsRoute, async (c) => {
  const query = c.req.valid('query');

  try {
    const result = await RoomService.getRooms(query);
    
    return c.json({
      data: result.data,
      meta: result.meta,
    }, 200);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    throw error;
  }
});

roomsRouter.openapi(getRoomByIdRoute, async (c) => {
  const { id: roomId } = c.req.valid('param');

  try {
    const room = await RoomService.getRoomById(roomId);
    
    return c.json({
      data: room,
    }, 200);
  } catch (error) {
    console.error('Error fetching room:', error);
    throw error;
  }
});

roomsRouter.openapi(updateRoomRoute, async (c) => {
  const { id: roomId } = c.req.valid('param');
  const roomData = c.req.valid('json');
  const user = c.get('user')!;

  try {
    const room = await RoomService.updateRoom(roomId, roomData, user.id);
    
    return c.json({
      message: 'Room updated successfully',
      data: room,
    }, 200);
  } catch (error) {
    console.error('Error updating room:', error);
    throw error;
  }
});

roomsRouter.openapi(deleteRoomRoute, async (c) => {
  const { id: roomId } = c.req.valid('param');

  try {
    const result = await RoomService.deleteRoom(roomId);
    
    return c.json(result, 200);
  } catch (error) {
    console.error('Error deleting room:', error);
    throw error;
  }
});

export { roomsRouter };