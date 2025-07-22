import { db, rooms, users } from '../db';
import { createError } from '../utils/errors';
import { eq, and, sql, count, desc } from 'drizzle-orm';
import type { CreateRoomData, GetRoomsQuery, RoomResponse, PaginatedRoomsResponse } from '../types/room.types';

export class RoomService {
  /**
   * Create a new room
   * @param data - Room creation data
   * @param userId - ID of the user creating the room
   * @returns Created room data
   */
  static async createRoom(data: CreateRoomData, userId: string): Promise<RoomResponse> {
    const { roomName, location } = data;

    // Check if room with same name and location already exists
    const [existingRoom] = await db
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.roomName, roomName),
          eq(rooms.location, location)
        )
      )
      .limit(1);

    if (existingRoom) {
      throw createError.conflict('Room with this name and location already exists');
    }

    // Create the room
    const [newRoom] = await db
      .insert(rooms)
      .values({
        roomName,
        location,
        updatedBy: userId,
      })
      .returning();

    // Get the creator's information for response
    const [creator] = await db
      .select({ 
        name: users.name,
        email: users.email,
        role: users.role
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      roomId: newRoom.roomId,
      roomName: newRoom.roomName,
      location: newRoom.location,
      updatedBy: {
        id: userId,
        name: creator?.name,
        email: creator?.email,
        role: creator?.role,
        updatedAt: newRoom.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Get paginated list of rooms
   * @param query - Query parameters for pagination and filtering
   * @returns Paginated rooms response
   */
  static async getRooms(query: GetRoomsQuery): Promise<PaginatedRoomsResponse> {
    const { page = 1, limit = 10, search } = query;
    const offset = (page - 1) * limit;

    // Build where conditions
    let whereConditions = undefined;
    if (search) {
      whereConditions = sql`${rooms.roomName} ILIKE ${'%' + search + '%'} OR ${rooms.location} ILIKE ${'%' + search + '%'}`;
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(rooms)
      .where(whereConditions);

    const total = totalResult.count;
    const totalPages = Math.ceil(total / limit);

    // Get rooms with creator information
    const roomsList = await db
      .select({
        roomId: rooms.roomId,
        roomName: rooms.roomName,
        location: rooms.location,
        updatedAt: rooms.updatedAt,
        updatedBy: rooms.updatedBy,
        creatorName: users.name,
        creatorEmail: users.email,
        creatorRole: users.role,
      })
      .from(rooms)
      .leftJoin(users, eq(rooms.updatedBy, users.id))
      .where(whereConditions)
      .orderBy(desc(rooms.updatedAt))
      .limit(limit)
      .offset(offset);

    const roomsData: RoomResponse[] = roomsList.map(room => ({
      roomId: room.roomId,
      roomName: room.roomName,
      location: room.location,
      updatedBy: {
        id: room.updatedBy,
        name: room.creatorName || 'Unknown',
        email: room.creatorEmail || 'Unknown',
        role: room.creatorRole || 'Unknown',
        updatedAt: room.updatedAt.toISOString(),
      },
    }));

    return {
      data: roomsData,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Get a single room by ID
   * @param roomId - Room ID
   * @returns Room data
   */
  static async getRoomById(roomId: string): Promise<RoomResponse> {
    const [room] = await db
      .select({
        roomId: rooms.roomId,
        roomName: rooms.roomName,
        location: rooms.location,
        updatedAt: rooms.updatedAt,
        updatedBy: rooms.updatedBy,
        creatorName: users.name,
        creatorEmail: users.email,
        creatorRole: users.role,
      })
      .from(rooms)
      .leftJoin(users, eq(rooms.updatedBy, users.id))
      .where(eq(rooms.roomId, roomId))
      .limit(1);

    if (!room) {
      throw createError.notFound('Room not found');
    }

    return {
      roomId: room.roomId,
      roomName: room.roomName,
      location: room.location,
      updatedBy: {
        id: room.updatedBy,
        name: room.creatorName || 'Unknown',
        email: room.creatorEmail || 'Unknown',
        role: room.creatorRole || 'Unknown',
        updatedAt: room.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Update a room
   * @param roomId - Room ID to update
   * @param data - Updated room data
   * @param userId - ID of the user updating the room
   * @returns Updated room data
   */
  static async updateRoom(roomId: string, data: CreateRoomData, userId: string): Promise<RoomResponse> {
    const { roomName, location } = data;

    // Check if room exists
    const [existingRoom] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.roomId, roomId))
      .limit(1);

    if (!existingRoom) {
      throw createError.notFound('Room not found');
    }

    // Check if another room with same name and location exists (excluding current room)
    const [duplicateRoom] = await db
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.roomName, roomName),
          eq(rooms.location, location),
          sql`${rooms.roomId} != ${roomId}`
        )
      )
      .limit(1);

    if (duplicateRoom) {
      throw createError.conflict('Room with this name and location already exists');
    }

    // Update the room
    const [updatedRoom] = await db
      .update(rooms)
      .set({
        roomName,
        location,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(rooms.roomId, roomId))
      .returning();

    // Get the updater's information for response
    const [updater] = await db
      .select({ 
        name: users.name,
        email: users.email,
        role: users.role
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      roomId: updatedRoom.roomId,
      roomName: updatedRoom.roomName,
      location: updatedRoom.location,
      updatedBy: {
        id: userId,
        name: updater?.name || 'Unknown',
        email: updater?.email || 'Unknown',
        role: updater?.role || 'Unknown',
        updatedAt: updatedRoom.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Delete a room
   * @param roomId - Room ID to delete
   * @returns Success message
   */
  static async deleteRoom(roomId: string): Promise<{ message: string }> {
    // Check if room exists
    const [existingRoom] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.roomId, roomId))
      .limit(1);

    if (!existingRoom) {
      throw createError.notFound('Room not found');
    }

    // Delete the room
    await db
      .delete(rooms)
      .where(eq(rooms.roomId, roomId));

    return {
      message: 'Room deleted successfully',
    };
  }
}