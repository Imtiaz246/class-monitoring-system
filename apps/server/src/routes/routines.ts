import { Hono } from "hono";
import { zValidator } from "../utils/validation";
import { db, routines, sections, courses, rooms, teacherProfiles, users, courseTeacher, batches } from "../db";
import { createRoutineSchema, getRoutinesSchema, updateRoutineSchema } from "../utils/validation";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { AppError, createError } from "../utils/errors";
import type { HonoContext } from "../utils/types";
import { eq, and, ne, sql } from "drizzle-orm";

const routinesRouter = new Hono<HonoContext>();

// Upload routine - Only accessible for admin
routinesRouter.post('/', requireAdmin, zValidator('json', createRoutineSchema), async (c) => {
  const routineData = c.req.valid('json');
  const user = c.get('user')!;

  try {
    // Start transaction
    await db.transaction(async (tx) => {
      // Check section existence
      const [section] = await tx
        .select()
        .from(sections)
        .where(eq(sections.sectionId, routineData.sectionId))
        .limit(1);
      if (!section) {
        throw createError.notFound("Section not found");
      }

      // Check course existence
      const [course] = await tx
        .select()
        .from(courses)
        .where(eq(courses.courseCode, routineData.courseCode))
        .limit(1);
      if (!course) {
        throw createError.notFound("Course not found");
      }

      // Check room existence
      const [room] = await tx
        .select()
        .from(rooms)
        .where(eq(rooms.roomId, routineData.roomId))
        .limit(1);
      if (!room) {
        throw createError.notFound("Room not found");
      }

      // Check teacher assignment and get courseTeacherId
      const [courseTeacherRecord] = await tx
        .select()
        .from(courseTeacher)
        .where(
          and(
            eq(courseTeacher.courseCode, routineData.courseCode),
            eq(courseTeacher.teacherId, routineData.teacherId)
          )
        )
        .limit(1);
      if (!courseTeacherRecord) {
        throw createError.badRequest("Teacher is not assigned to this course");
      }

      // Convert times to minutes for comparison
      const [startH, startM] = routineData.startTime.split(':').map(Number);
      const [endH, endM] = routineData.endTime.split(':').map(Number);
      const newStart = startH * 60 + startM;
      const newEnd = endH * 60 + endM;
      if (newStart >= newEnd) {
        throw createError.badRequest("End time must be greater than start time");
      }

      // Check for section time conflicts
      const sectionConflicts = await tx
        .select()
        .from(routines)
        .where(
          and(
            eq(routines.sectionId, routineData.sectionId),
            eq(routines.dayOfWeek, routineData.dayOfWeek)
          )
        );

      for (const conflict of sectionConflicts) {
        const [conflictStartH, conflictStartM] = conflict.startTime.split(':').map(Number);
        const [conflictEndH, conflictEndM] = conflict.endTime.split(':').map(Number);
        const conflictStart = conflictStartH * 60 + conflictStartM;
        const conflictEnd = conflictEndH * 60 + conflictEndM;

        if (newStart < conflictEnd && newEnd > conflictStart) {
          throw createError.conflict("Time slot conflicts with existing routine for this section");
        }
      }

      // Check for room time conflicts
      const roomConflicts = await tx
        .select()
        .from(routines)
        .where(
          and(
            eq(routines.roomId, routineData.roomId),
            eq(routines.dayOfWeek, routineData.dayOfWeek)
          )
        );

      for (const conflict of roomConflicts) {
        const [conflictStartH, conflictStartM] = conflict.startTime.split(':').map(Number);
        const [conflictEndH, conflictEndM] = conflict.endTime.split(':').map(Number);
        const conflictStart = conflictStartH * 60 + conflictStartM;
        const conflictEnd = conflictEndH * 60 + conflictEndM;

        if (newStart < conflictEnd && newEnd > conflictStart) {
          throw createError.conflict("Room is already booked for this time slot");
        }
      }

      // Check for teacher time conflicts
      const teacherConflicts = await tx
        .select()
        .from(routines)
        .innerJoin(courseTeacher, eq(routines.courseTeacherId, courseTeacher.courseTeacherId))
        .where(
          and(
            eq(courseTeacher.teacherId, routineData.teacherId),
            eq(routines.dayOfWeek, routineData.dayOfWeek)
          )
        );

      for (const conflict of teacherConflicts) {
        const [conflictStartH, conflictStartM] = conflict.routines.startTime.split(':').map(Number);
        const [conflictEndH, conflictEndM] = conflict.routines.endTime.split(':').map(Number);
        const conflictStart = conflictStartH * 60 + conflictStartM;
        const conflictEnd = conflictEndH * 60 + conflictEndM;

        if (newStart < conflictEnd && newEnd > conflictStart) {
          throw createError.conflict("Teacher is already assigned to another class at this time");
        }
      }

      // Insert the new routine
      const [newRoutine] = await tx
        .insert(routines)
        .values({
          sectionId: routineData.sectionId,
          courseTeacherId: courseTeacherRecord.courseTeacherId,
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
          updatedBy: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            updatedAt: newRoutine.updatedAt.toISOString(),
          },
        },
      }, 201);
    });
  } catch (error) {
    throw error;
  }
});

// Get routines
routinesRouter.get('/', requireAuth, zValidator('query', getRoutinesSchema), async (c) => {
  const query = c.req.valid('query');
  const offset = (query.page - 1) * query.limit;

  try {
    // Base count query for total items
    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(routines)
      .innerJoin(sections, eq(routines.sectionId, sections.sectionId))
      .innerJoin(batches, eq(sections.batchId, batches.batchId))
      .innerJoin(courseTeacher, eq(routines.courseTeacherId, courseTeacher.courseTeacherId))
      .innerJoin(courses, eq(courseTeacher.courseCode, courses.courseCode))
      .innerJoin(teacherProfiles, eq(courseTeacher.teacherId, teacherProfiles.teacherId))
      .innerJoin(users, eq(teacherProfiles.userId, users.id))
      .innerJoin(rooms, eq(routines.roomId, rooms.roomId));

    // Base data query with all joins
    let dataQuery = db
      .select({
        routine: {
          routineId: routines.routineId,
          dayOfWeek: routines.dayOfWeek,
          startTime: routines.startTime,
          endTime: routines.endTime,
          updatedAt: routines.updatedAt,
        },
        section: {
          sectionId: sections.sectionId,
          sectionName: sections.sectionName,
          semester: sections.semester,
        },
        batch: {
          batchId: batches.batchId,
          batchName: batches.batchName,
        },
        course: {
          courseCode: courses.courseCode,
          courseName: courses.courseName,
          creditHours: courses.creditHours,
        },
        teacher: {
          userId: users.id,
          teacherId: teacherProfiles.teacherId,
          name: users.name,
          email: users.email,
          phone: users.phone,
          gender: users.gender,
          address: users.address,
        },
        room: {
          roomId: rooms.roomId,
          roomName: rooms.roomName,
          location: rooms.location,
        }
      })
      .from(routines)
      .innerJoin(sections, eq(routines.sectionId, sections.sectionId))
      .innerJoin(batches, eq(sections.batchId, batches.batchId))
      .innerJoin(courseTeacher, eq(routines.courseTeacherId, courseTeacher.courseTeacherId))
      .innerJoin(courses, eq(courseTeacher.courseCode, courses.courseCode))
      .innerJoin(teacherProfiles, eq(courseTeacher.teacherId, teacherProfiles.teacherId))
      .innerJoin(users, eq(teacherProfiles.userId, users.id))
      .innerJoin(rooms, eq(routines.roomId, rooms.roomId))
      .limit(query.limit)
      .offset(offset);

    // Apply filters to both queries
    const applyFilters = (queryBuilder: any) => {
      if (query.dayOfWeek) {
        queryBuilder = queryBuilder.where(
          eq(routines.dayOfWeek, query.dayOfWeek)
        );
      }
      if (query.semester) {
        queryBuilder = queryBuilder.where(
          eq(sections.semester, query.semester)
        );
      }
      if (query.sectionId) {
        queryBuilder = queryBuilder.where(
          eq(routines.sectionId, query.sectionId)
        );
      }
      if (query.teacherId) {
        queryBuilder = queryBuilder.where(
          eq(teacherProfiles.teacherId, query.teacherId)
        );
      }
      if (query.courseCode) {
        queryBuilder = queryBuilder.where(
          eq(courses.courseCode, query.courseCode)
        );
      }
      if (query.batchId) {
        queryBuilder = queryBuilder.where(
          eq(batches.batchId, query.batchId)
        );
      }
      return queryBuilder;
    };

    // Apply filters to both queries
    countQuery = applyFilters(countQuery);
    dataQuery = applyFilters(dataQuery);

    // Execute queries in parallel
    const [totalResult, routinesData] = await Promise.all([
      countQuery,
      dataQuery
    ]);

    const totalItems = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / query.limit);

    return c.json({
      data: routinesData,
      meta: {
        total: totalItems,
        page: query.page,
        limit: query.limit,
        totalPages: totalPages,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    console.log('Failed to fetch routines', error);
    throw createError.internalServer('Failed to fetch routines');
  }
});

// Update routine with routineId - Only accessible for admin
routinesRouter.put('/:routineId', requireAdmin, zValidator('json', updateRoutineSchema), async (c) => {
  const routineId = c.req.param('routineId');
  const updateData = c.req.valid('json');
  const user = c.get('user')!;

  try {
    await db.transaction(async (tx) => {
      // 1. Get existing routine
      const [existingRoutine] = await tx
        .select()
        .from(routines)
        .where(eq(routines.routineId, routineId))
        .limit(1);

      if (!existingRoutine) {
        throw createError.notFound("Routine not found");
      }

      // 2. Validate course-teacher relationship if being updated
      let courseTeacherId = existingRoutine.courseTeacherId;
      if (updateData.courseCode || updateData.teacherId) {
        const currentAssignment = await tx
          .select({
            courseCode: courseTeacher.courseCode,
            teacherId: courseTeacher.teacherId
          })
          .from(courseTeacher)
          .where(eq(courseTeacher.courseTeacherId, existingRoutine.courseTeacherId))
          .limit(1);

        if (!currentAssignment[0]) {
          throw createError.badRequest("Teacher not assigned to this course");
        }

        const courseCode = updateData.courseCode ?? currentAssignment[0].courseCode;
        const teacherId = updateData.teacherId ?? currentAssignment[0].teacherId;

        if (typeof courseCode !== 'string' || courseCode.trim() === '') {
          throw createError.badRequest("Invalid course code");
        }

        if (typeof teacherId !== 'string' || teacherId.trim() === '') {
          throw createError.badRequest("Invalid teacher ID");
        }

        const [newCourseTeacher] = await tx
          .select()
          .from(courseTeacher)
          .where(
            and(
              eq(courseTeacher.courseCode, courseCode),
              eq(courseTeacher.teacherId, teacherId)
            )
          )
          .limit(1);

        if (!newCourseTeacher) {
          throw createError.badRequest("Teacher is not assigned to this course");
        }

        courseTeacherId = newCourseTeacher.courseTeacherId;
      }

      // 3. Validate section if being updated
      if (updateData.sectionId && updateData.sectionId !== existingRoutine.sectionId) {
        const [section] = await tx
          .select()
          .from(sections)
          .where(eq(sections.sectionId, updateData.sectionId))
          .limit(1);

        if (!section) {
          throw createError.notFound("Section not found");
        }
      }

      // 4. Validate room if being updated
      if (updateData.roomId && updateData.roomId !== existingRoutine.roomId) {
        const [room] = await tx
          .select()
          .from(rooms)
          .where(eq(rooms.roomId, updateData.roomId))
          .limit(1);

        if (!room) {
          throw createError.notFound("Room not found");
        }
      }

      // 5. Prepare merged time data
      const dayToCheck = updateData.dayOfWeek ?? existingRoutine.dayOfWeek;
      const startTimeToCheck = updateData.startTime ?? existingRoutine.startTime;
      const endTimeToCheck = updateData.endTime ?? existingRoutine.endTime;

      // 6. Validate time relationships
      if (updateData.startTime || updateData.endTime) {
        const [startH, startM] = startTimeToCheck.split(':').map(Number);
        const [endH, endM] = endTimeToCheck.split(':').map(Number);
        const newStart = startH * 60 + startM;
        const newEnd = endH * 60 + endM;

        if (newStart >= newEnd) {
          throw createError.badRequest("Start time must be before end time");
        }
      }

      // 7. Check for conflicts if day/time is being updated
      if (updateData.dayOfWeek || updateData.startTime || updateData.endTime) {
        const sectionIdToCheck = updateData.sectionId ?? existingRoutine.sectionId;
        const roomIdToCheck = updateData.roomId ?? existingRoutine.roomId;
        const teacherIdToCheck = updateData.teacherId ?? (
          await tx
            .select({ teacherId: courseTeacher.teacherId })
            .from(courseTeacher)
            .where(eq(courseTeacher.courseTeacherId, courseTeacherId))
            .limit(1)
        )[0]?.teacherId;

        // Check section conflicts
        const sectionConflicts = await tx
          .select()
          .from(routines)
          .where(
            and(
              eq(routines.sectionId, sectionIdToCheck),
              eq(routines.dayOfWeek, dayToCheck),
              ne(routines.routineId, routineId)
            )
          );

        // Check room conflicts
        const roomConflicts = await tx
          .select()
          .from(routines)
          .where(
            and(
              eq(routines.roomId, roomIdToCheck),
              eq(routines.dayOfWeek, dayToCheck),
              ne(routines.routineId, routineId)
            )
          );

        // Check teacher conflicts
        const teacherConflicts = teacherIdToCheck ? await tx
          .select()
          .from(routines)
          .innerJoin(courseTeacher, eq(routines.courseTeacherId, courseTeacher.courseTeacherId))
          .where(
            and(
              eq(courseTeacher.teacherId, teacherIdToCheck),
              eq(routines.dayOfWeek, dayToCheck),
              ne(routines.routineId, routineId)
            )
          ) : [];

        // Convert times to minutes for comparison
        const [startH, startM] = startTimeToCheck.split(':').map(Number);
        const [endH, endM] = endTimeToCheck.split(':').map(Number);
        const newStart = startH * 60 + startM;
        const newEnd = endH * 60 + endM;

        // Check section and room conflicts
        const sectionRoomHasConflict = [...sectionConflicts, ...roomConflicts]
          .some(conflict => {
            const [cStartH, cStartM] = conflict.startTime.split(':').map(Number);
            const [cEndH, cEndM] = conflict.endTime.split(':').map(Number);
            const cStart = cStartH * 60 + cStartM;
            const cEnd = cEndH * 60 + cEndM;
            return newStart < cEnd && newEnd > cStart;
          });

        // Check teacher conflicts (different structure due to join)
        const teacherHasConflict = teacherConflicts
          .some(conflict => {
            const [cStartH, cStartM] = conflict.routines.startTime.split(':').map(Number);
            const [cEndH, cEndM] = conflict.routines.endTime.split(':').map(Number);
            const cStart = cStartH * 60 + cStartM;
            const cEnd = cEndH * 60 + cEndM;
            return newStart < cEnd && newEnd > cStart;
          });

        const hasConflict = sectionRoomHasConflict || teacherHasConflict;

        if (hasConflict) {
          throw createError.conflict("Time slot conflicts with existing routine");
        }
      }

      // 8. Perform the update
      const [updatedRoutine] = await tx
        .update(routines)
        .set({
          sectionId: updateData.sectionId ?? existingRoutine.sectionId,
          courseTeacherId: courseTeacherId,
          roomId: updateData.roomId ?? existingRoutine.roomId,
          dayOfWeek: dayToCheck,
          startTime: startTimeToCheck,
          endTime: endTimeToCheck,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(routines.routineId, routineId))
        .returning();

      // 9. Return full updated routine with relationships
      const [fullRoutine] = await tx
        .select({
          routine: routines,
          section: {
            sectionId: sections.sectionId,
            sectionName: sections.sectionName,
          },
          course: {
            courseCode: courses.courseCode,
            courseName: courses.courseName,
          },
          teacher: {
            teacherId: teacherProfiles.teacherId,
            name: users.name,
            email: users.email,
          },
          room: {
            roomId: rooms.roomId,
            roomName: rooms.roomName,
          }
        })
        .from(routines)
        .innerJoin(sections, eq(routines.sectionId, sections.sectionId))
        .innerJoin(courseTeacher, eq(routines.courseTeacherId, courseTeacher.courseTeacherId))
        .innerJoin(courses, eq(courseTeacher.courseCode, courses.courseCode))
        .innerJoin(teacherProfiles, eq(courseTeacher.teacherId, teacherProfiles.teacherId))
        .innerJoin(users, eq(teacherProfiles.userId, users.id))
        .innerJoin(rooms, eq(routines.roomId, rooms.roomId))
        .where(eq(routines.routineId, routineId))
        .limit(1);

      const { updatedAt, ...routineWithoutUpdatedAt } = fullRoutine.routine;
      return c.json({
        data: {
          ...routineWithoutUpdatedAt,
          section: fullRoutine.section,
          course: fullRoutine.course,
          teacher: fullRoutine.teacher,
          room: fullRoutine.room,
          updatedBy: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            updatedAt: updatedAt.toISOString(),
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.log('Failed to update routine', error);
    throw createError.internalServer('Failed to update routine.');
  }
});

// Delete routine with routineId - Only accessible for admin
routinesRouter.delete('/:routineId', requireAdmin, async (c) => {
  const routineId = c.req.param('routineId');
  try {
    await db.delete(routines).where(eq(routines.routineId, routineId));
    return c.json({
      message: 'Routine deleted successfully',
      routineId: routineId
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.log('Failed to delete routine', error);
    throw createError.internalServer('Failed to delete routine.');
  }
});

export { routinesRouter };