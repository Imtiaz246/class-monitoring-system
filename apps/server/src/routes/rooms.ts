import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, rooms, users } from "../db";
import { createRoomSchema, getRoomsSchema } from "../utils/validation";
import { requireAdmin } from "../middleware/auth";
import { createError } from "../utils/errors";
import type { HonoContext } from "../utils/types";
import { eq, and, or } from "drizzle-orm";

const roomsRouter = new Hono<HonoContext>();

// POST /api/v1/rooms - Create a room
roomsRouter.post(
  "/",
  requireAdmin,
  zValidator("json", createRoomSchema),
  async (c) => {
    const { roomName, location } = c.req.valid("json");
    const user = c.get("user")!;

    try {
      // Check if room with same name and location already exists
      const existingRoom = await db
        .select()
        .from(rooms)
        .where(and(
          eq(rooms.roomName, roomName),
          eq(rooms.location, location)
        ))
        .limit(1);

      if (existingRoom.length > 0) {
        throw createError.conflict("Room with same name and location already exists");
      }

      const [newRoom] = await db
        .insert(rooms)
        .values({
          roomName,
          location,
          updatedBy: user.id,
        })
        .returning();

      return c.json({
        data: {
          roomId: newRoom.roomId,
          roomName: newRoom.roomName,
          location: newRoom.location,
          updatedAt: newRoom.updatedAt,
          updatedBy: {
            name: user.name,
            userId: user.id,
            role: user.role,
          },
        },
      }, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes("duplicate")) {
        throw createError.conflict("Room with same name and location already exists");
      }
      throw error;
    }
  }
);

// GET /api/v1/rooms - List rooms
roomsRouter.get(
  "/",
  zValidator("query", getRoomsSchema),
  async (c) => {
    const { page, limit } = c.req.valid("query");
    const offset = (page - 1) * limit;

    try {
      const roomsWithUpdater = await db
        .select({
          roomId: rooms.roomId,
          roomName: rooms.roomName,
          location: rooms.location,
          updatedAt: rooms.updatedAt,
          updatedBy: {
            name: users.name,
            userId: users.id,
            role: users.role,
          },
        })
        .from(rooms)
        .leftJoin(users, eq(rooms.updatedBy, users.id))
        .limit(limit)
        .offset(offset)
        .orderBy(rooms.updatedAt);

      return c.json({
        data: roomsWithUpdater,
      });
    } catch (error) {
      throw createError.internalServer("Failed to fetch rooms");
    }
  }
);

export { roomsRouter };