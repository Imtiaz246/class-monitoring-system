import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createRoomSchema, paginationSchema } from "../utils/validation";
import { requireAdmin, requireAuth } from "../middleware/auth";
import type { HonoContext } from "../utils/types";
import { RoomService } from "../services/room.service";
import { AppError, createError } from "../utils/errors";

const roomsRouter = new Hono<HonoContext>();

// Create a room
roomsRouter.post('/', requireAdmin, zValidator('json', createRoomSchema), async (c) => {
  const roomData = c.req.valid('json');
  const user = c.get('user')!;

  try {
    const room = await RoomService.createRoom(roomData, user.id);
    return c.json({
      message: 'Room created successfully',
      data: room,
    }, 201);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error creating room:', error);
    throw createError.internalServer('Failed to create room');
  }
});

// Get all rooms with pagination
roomsRouter.get('/', requireAuth, zValidator('query', paginationSchema), async (c) => {
  const query = c.req.valid('query');

  try {
    const result = await RoomService.getRooms(query);
    return c.json({result});
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error fetching rooms:', error);
    throw createError.internalServer('Failed to fetch rooms');
  }
});

// Get a single room by ID
roomsRouter.get('/:id', requireAuth, async (c) => {
  const roomId = c.req.param('id');

  try {
    const room = await RoomService.getRoomById(roomId);
    return c.json(room);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error fetching room:', error);
    throw createError.internalServer('Failed to fetch room');
  }
});

// Update a room
roomsRouter.put('/:id', requireAdmin, zValidator('json', createRoomSchema), async (c) => {
  const roomId = c.req.param('id');
  const roomData = c.req.valid('json');
  const user = c.get('user')!;

  try {
    const room = await RoomService.updateRoom(roomId, roomData, user.id);
    return c.json({
      message: 'Room updated successfully',
      data: room,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error update room:', error);
    throw createError.internalServer('Failed to update room');
  }
});

// Delete a room
roomsRouter.delete('/:id', requireAdmin, async (c) => {
  const roomId = c.req.param('id');

  try {
    const result = await RoomService.deleteRoom(roomId);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error delete room:', error);
    throw createError.internalServer('Failed to delete room');
  }
});

export { roomsRouter };