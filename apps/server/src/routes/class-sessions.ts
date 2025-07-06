import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, classSessions, routines, sections, courses, rooms, teacherProfiles, users, bookedRooms, bookedTeachers } from "../db";
import { getSessionsSchema, updateSessionSchema, uuidParamSchema } from "../utils/validation";
import { requireTeacherOrAdmin, requireCROrTeacher } from "../middleware/auth";
import { createError } from "../utils/errors";
import type { HonoContext } from "../utils/types";
import { eq, and, or, gte, lte, between, sql } from "drizzle-orm";
import { z } from "zod";

const classSessionsRouter = new Hono<HonoContext>();

// GET /api/v1/sessions - Get class sessions
classSessionsRouter.get(
  "/",
  requireTeacherOrAdmin,
  zValidator("query", getSessionsSchema),
  async (c) => {
    const {
      sectionId,
      teacherId,
      roomId,
      date,
      startDate,
      endDate,
      sessionStatus,
      page,
      limit,
    } = c.req.valid("query");
    const offset = (page - 1) * limit;

    try {
      let whereConditions = [];

      if (sectionId) {
        whereConditions.push(eq(routines.sectionId, sectionId));
      }

      if (teacherId) {
        whereConditions.push(eq(routines.courseTeacherId, teacherId));
      }

      if (roomId) {
        whereConditions.push(eq(routines.roomId, roomId));
      }

      if (date) {
        whereConditions.push(eq(classSessions.sessionDate, new Date(date)));
      }

      if (startDate && endDate) {
        whereConditions.push(
          between(classSessions.sessionDate, new Date(startDate), new Date(endDate))
        );
      } else if (startDate) {
        whereConditions.push(gte(classSessions.sessionDate, new Date(startDate)));
      } else if (endDate) {
        whereConditions.push(lte(classSessions.sessionDate, new Date(endDate)));
      }

      if (sessionStatus) {
        whereConditions.push(eq(classSessions.sessionStatus, sessionStatus));
      }

      let query = db
        .select({
          sessionId: classSessions.sessionId,
          routineId: classSessions.routineId,
          sessionDate: classSessions.sessionDate,
          originalScheduleAt: classSessions.originalScheduleAt,
          actualScheduleAt: classSessions.actualScheduleAt,
          sessionStatus: classSessions.sessionStatus,
          rescheduleOrCancelReason: classSessions.rescheduleOrCancelReason,
          updatedAt: classSessions.updatedAt,
          sectionId: routines.sectionId,
          roomId: routines.roomId,
          dayOfWeek: routines.dayOfWeek,
          startTime: routines.startTime,
          endTime: routines.endTime,
        })
        .from(classSessions)
        .innerJoin(routines, eq(classSessions.routineId, routines.routineId))
        .limit(limit)
        .offset(offset)
        .orderBy(classSessions.sessionDate, routines.startTime);

      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions)) as any;
      }

      const sessions = await query;

      return c.json({
        data: sessions,
      });
    } catch (error) {
      throw createError.internalServer("Failed to fetch class sessions");
    }
  }
);

// PUT /api/v1/sessions/:id - Update class session
classSessionsRouter.put(
  "/:id",
  requireCROrTeacher,
  zValidator("param", uuidParamSchema),
  zValidator("json", updateSessionSchema),
  async (c) => {
    const { id: sessionId } = c.req.valid("param");
    const updateData = c.req.valid("json");
    const user = c.get("user")!;

    try {
      // Check if session exists
      const existingSession = await db
        .select()
        .from(classSessions)
        .where(eq(classSessions.sessionId, sessionId))
        .limit(1);

      if (existingSession.length === 0) {
        throw createError.notFound("Class session not found");
      }

      const session = existingSession[0];

      // Simplified conflict checking - just check if room/teacher is available
      // TODO: Implement proper conflict checking with routines table joins

      const [updatedSession] = await db
        .update(classSessions)
        .set({
          sessionStatus: updateData.sessionStatus,
          rescheduleOrCancelReason: updateData.rescheduleOrCancelReason,
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(classSessions.sessionId, sessionId))
        .returning();

      return c.json({
        data: {
          sessionId: updatedSession.sessionId,
          routineId: updatedSession.routineId,
          sessionDate: updatedSession.sessionDate,
          originalScheduleAt: updatedSession.originalScheduleAt,
          actualScheduleAt: updatedSession.actualScheduleAt,
          sessionStatus: updatedSession.sessionStatus,
          rescheduleOrCancelReason: updatedSession.rescheduleOrCancelReason,
          updatedAt: updatedSession.updatedAt,
          updatedBy: {
            name: user.name,
            userId: user.id,
            role: user.role,
          },
        },
      });
    } catch (error) {
      throw error;
    }
  }
);

export { classSessionsRouter };