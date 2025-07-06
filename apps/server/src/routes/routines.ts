import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, routines, sections, courses, rooms, teacherProfiles, users, courseTeacher, classSessions, bookedRooms, bookedTeachers } from "../db";
import { createRoutineSchema, getRoutinesSchema, updateRoutineSchema, uuidParamSchema } from "../utils/validation";
import { requireAdmin, requireTeacherOrAdmin } from "../middleware/auth";
import { createError } from "../utils/errors";
import type { HonoContext } from "../utils/types";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const routinesRouter = new Hono<HonoContext>();

// POST /api/v1/routines - Upload routine
routinesRouter.post(
  "/",
  requireAdmin,
  zValidator("json", createRoutineSchema),
  async (c) => {
    const routineData = c.req.valid("json");
    const user = c.get("user")!;

    try {
      // Validate section exists
      const section = await db
        .select()
        .from(sections)
        .where(eq(sections.sectionId, routineData.sectionId))
        .limit(1);

      if (section.length === 0) {
        throw createError.notFound("Section not found");
      }

      // Validate course exists
      const course = await db
        .select()
        .from(courses)
        .where(eq(courses.courseCode, routineData.courseCode))
        .limit(1);

      if (course.length === 0) {
        throw createError.notFound("Course not found");
      }

      // Validate room exists
      const room = await db
        .select()
        .from(rooms)
        .where(eq(rooms.roomId, routineData.roomId))
        .limit(1);

      if (room.length === 0) {
        throw createError.notFound("Room not found");
      }

      // Validate teacher exists and is assigned to the course
      const teacherAssignment = await db
        .select()
        .from(courseTeacher)
        .where(
          and(
            eq(courseTeacher.courseCode, routineData.courseCode),
            eq(courseTeacher.teacherId, routineData.teacherId)
          )
        )
        .limit(1);

      if (teacherAssignment.length === 0) {
        throw createError.badRequest("Teacher is not assigned to this course");
      }

      // Check for conflicts in the same section (same day and overlapping time)
      const conflictingRoutines = await db
        .select()
        .from(routines)
        .where(
          and(
            eq(routines.sectionId, routineData.sectionId),
            eq(routines.dayOfWeek, routineData.dayOfWeek)
          )
        );

      if (conflictingRoutines.length > 0) {
        throw createError.conflict("Time slot conflicts with existing routine for this section");
      }

      // Check for room conflicts (same day, room)
      const roomConflicts = await db
        .select()
        .from(routines)
        .where(
          and(
            eq(routines.roomId, routineData.roomId),
            eq(routines.dayOfWeek, routineData.dayOfWeek)
          )
        );

      if (roomConflicts.length > 0) {
        throw createError.conflict("Room is already booked for this time slot");
      }

      // Find the courseTeacherId
      const courseTeacherRecord = await db
        .select()
        .from(courseTeacher)
        .where(
          and(
            eq(courseTeacher.courseCode, routineData.courseCode),
            eq(courseTeacher.teacherId, routineData.teacherId)
          )
        )
        .limit(1);

      if (courseTeacherRecord.length === 0) {
        throw createError.badRequest("Teacher is not assigned to this course");
      }

      const courseTeacherId = courseTeacherRecord[0].courseTeacherId;

      // Check for teacher conflicts
      const teacherConflicts = await db
        .select()
        .from(routines)
        .innerJoin(courseTeacher, eq(routines.courseTeacherId, courseTeacher.courseTeacherId))
        .where(
          and(
            eq(courseTeacher.teacherId, routineData.teacherId),
            eq(routines.dayOfWeek, routineData.dayOfWeek)
          )
        );

      if (teacherConflicts.length > 0) {
        throw createError.conflict("Teacher is already assigned to another class at this time");
      }

      const [newRoutine] = await db
        .insert(routines)
        .values({
          sectionId: routineData.sectionId,
          courseTeacherId: courseTeacherId,
          roomId: routineData.roomId,
          dayOfWeek: routineData.dayOfWeek,
          startTime: routineData.startTime,
          endTime: routineData.endTime,
          updatedBy: user.id,
        })
        .returning();

      return c.json({
        data: {
          routineId: newRoutine.routineId,
          sectionId: newRoutine.sectionId,
          courseTeacherId: newRoutine.courseTeacherId,
          roomId: newRoutine.roomId,
          dayOfWeek: newRoutine.dayOfWeek,
          startTime: newRoutine.startTime,
          endTime: newRoutine.endTime,
          updatedAt: newRoutine.updatedAt,
          updatedBy: {
            name: user.name,
            userId: user.id,
            role: user.role,
          },
        },
      }, 201);
    } catch (error) {
      throw error;
    }
  }
);

// GET /api/v1/routines - List routines
routinesRouter.get(
  "/",
  requireTeacherOrAdmin,
  zValidator("query", getRoutinesSchema),
  async (c) => {
    const { sectionId, page, limit } = c.req.valid("query");
    const offset = (page - 1) * limit;

    try {
      let query = db
        .select({
          routineId: routines.routineId,
          sectionId: routines.sectionId,
          sectionName: sections.sectionName,
          courseTeacherId: routines.courseTeacherId,
          courseName: courses.courseName,
          courseCode: courses.courseCode,
          teacherId: courseTeacher.teacherId,
          teacherName: users.name,
          roomId: routines.roomId,
          roomName: rooms.roomName,
          dayOfWeek: routines.dayOfWeek,
          startTime: routines.startTime,
          endTime: routines.endTime,
          updatedAt: routines.updatedAt,
        })
        .from(routines)
        .innerJoin(sections, eq(routines.sectionId, sections.sectionId))
        .innerJoin(courseTeacher, eq(routines.courseTeacherId, courseTeacher.courseTeacherId))
        .innerJoin(courses, eq(courseTeacher.courseCode, courses.courseCode))
        .innerJoin(teacherProfiles, eq(courseTeacher.teacherId, teacherProfiles.teacherId))
        .innerJoin(users, eq(teacherProfiles.userId, users.id))
        .innerJoin(rooms, eq(routines.roomId, rooms.roomId))
        .limit(limit)
        .offset(offset)
        .orderBy(routines.dayOfWeek, routines.startTime);

      if (sectionId) {
        query = query.where(eq(routines.sectionId, sectionId)) as any;
      }

      const routinesList = await query;

      return c.json({
        data: routinesList,
      });
    } catch (error) {
      throw createError.internalServer("Failed to fetch routines");
    }
  }
);

// PUT /api/v1/routines/:id - Update routine
routinesRouter.put(
  "/:id",
  requireAdmin,
  zValidator("param", uuidParamSchema),
  zValidator("json", updateRoutineSchema),
  async (c) => {
    const { id: routineId } = c.req.valid("param");
    const updateData = c.req.valid("json");
    const user = c.get("user")!;

    try {
      // Check if routine exists
      const existingRoutine = await db
        .select()
        .from(routines)
        .where(eq(routines.routineId, routineId))
        .limit(1);

      if (existingRoutine.length === 0) {
        throw createError.notFound("Routine not found");
      }

      // Validate foreign keys if provided
      if (updateData.sectionId) {
        const section = await db
          .select()
          .from(sections)
          .where(eq(sections.sectionId, updateData.sectionId))
          .limit(1);

        if (section.length === 0) {
          throw createError.notFound("Section not found");
        }
      }

      if (updateData.courseCode) {
        const course = await db
          .select()
          .from(courses)
          .where(eq(courses.courseCode, updateData.courseCode))
          .limit(1);

        if (course.length === 0) {
          throw createError.notFound("Course not found");
        }
      }

      if (updateData.roomId) {
        const room = await db
          .select()
          .from(rooms)
          .where(eq(rooms.roomId, updateData.roomId))
          .limit(1);

        if (room.length === 0) {
          throw createError.notFound("Room not found");
        }
      }

      if (updateData.teacherId) {
        const teacher = await db
          .select()
          .from(teacherProfiles)
          .where(eq(teacherProfiles.teacherId, updateData.teacherId))
          .limit(1);

        if (teacher.length === 0) {
          throw createError.notFound("Teacher not found");
        }

        // Check if teacher is assigned to the course
        if (updateData.courseCode) {
          const teacherAssignment = await db
            .select()
            .from(courseTeacher)
            .where(
              and(
                eq(courseTeacher.courseCode, updateData.courseCode),
                eq(courseTeacher.teacherId, updateData.teacherId)
              )
            )
            .limit(1);

          if (teacherAssignment.length === 0) {
            throw createError.badRequest("Teacher is not assigned to this course");
          }
        }
      }

      const [updatedRoutine] = await db
        .update(routines)
        .set({
          ...updateData,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(routines.routineId, routineId))
        .returning();

      return c.json({
        data: {
          routineId: updatedRoutine.routineId,
          sectionId: updatedRoutine.sectionId,
          courseTeacherId: updatedRoutine.courseTeacherId,
          roomId: updatedRoutine.roomId,
          dayOfWeek: updatedRoutine.dayOfWeek,
          startTime: updatedRoutine.startTime,
          endTime: updatedRoutine.endTime,
          updatedAt: updatedRoutine.updatedAt,
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

export { routinesRouter };