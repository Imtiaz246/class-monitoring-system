import { db, routines, sections, courses, rooms, teacherProfiles, users, courseTeacher, batches } from '../db';
import { createError } from '../utils/errors';
import { eq, and, ne, sql, count, desc } from 'drizzle-orm';
import type { CreateRoutineData, UpdateRoutineData, GetRoutinesQuery, RoutineResponse, RoutineListItem } from '../types/routine.types';
import type { DayOfWeekType } from '../types/common.types';

export class RoutineService {
  /**
   * Create a new routine
   * @param data - Routine creation data
   * @param userId - ID of the user creating the routine
   * @returns Created routine data
   */
  static async createRoutine(data: CreateRoutineData & { userId: string }): Promise<RoutineResponse> {
    // Start transaction
    return await db.transaction(async (tx) => {
      // Check section existence
      const [section] = await tx
        .select()
        .from(sections)
        .where(eq(sections.sectionId, data.sectionId))
        .limit(1);
      if (!section) {
        throw createError.notFound("Section not found");
      }

      // Check course existence
      const [course] = await tx
        .select()
        .from(courses)
        .where(eq(courses.courseCode, data.courseCode))
        .limit(1);
      if (!course) {
        throw createError.notFound("Course not found");
      }

      // Check room existence
      const [room] = await tx
        .select()
        .from(rooms)
        .where(eq(rooms.roomId, data.roomId))
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
            eq(courseTeacher.courseCode, data.courseCode),
            eq(courseTeacher.teacherId, data.teacherId)
          )
        )
        .limit(1);
      if (!courseTeacherRecord) {
        throw createError.badRequest("Teacher is not assigned to this course");
      }

      // Convert times to minutes for comparison
      const [startH, startM] = data.startTime.split(':').map(Number);
      const [endH, endM] = data.endTime.split(':').map(Number);
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
            eq(routines.sectionId, data.sectionId),
            eq(routines.dayOfWeek, data.dayOfWeek)
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
            eq(routines.roomId, data.roomId),
            eq(routines.dayOfWeek, data.dayOfWeek)
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
            eq(courseTeacher.teacherId, data.teacherId),
            eq(routines.dayOfWeek, data.dayOfWeek)
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
          sectionId: data.sectionId,
          courseTeacherId: courseTeacherRecord.courseTeacherId,
          roomId: data.roomId,
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          updatedBy: data.userId,
        })
        .returning();

      // Get user info for response
      const [user] = await tx
        .select({
          name: users.name,
          email: users.email,
          role: users.role
        })
        .from(users)
        .where(eq(users.id, data.userId))
        .limit(1);

      return {
        routineId: newRoutine.routineId,
        sectionId: newRoutine.sectionId,
        courseTeacherId: newRoutine.courseTeacherId,
        roomId: newRoutine.roomId,
        dayOfWeek: newRoutine.dayOfWeek,
        startTime: newRoutine.startTime,
        endTime: newRoutine.endTime,
        updatedBy: {
          id: data.userId,
          name: user?.name || 'Unknown',
          email: user?.email || 'Unknown',
          role: user?.role || 'Unknown',
          updatedAt: newRoutine.updatedAt.toISOString(),
        },
      };
    });
  }

  /**
   * Get paginated list of routines with filtering
   * @param query - Query parameters for pagination and filtering
   * @returns Paginated routines response
   */
  static async getRoutines(query: GetRoutinesQuery) {
    const { page, limit } = query;
    const offset = (page - 1) * limit;

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
      .limit(limit)
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
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: routinesData,
      meta: {
        total: totalItems,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Update an existing routine
   * @param routineId - ID of the routine to update
   * @param updateData - Updated routine data
   * @param userId - ID of the user updating the routine
   * @returns Updated routine data
   */
  static async updateRoutine(routineId: string, updateData: UpdateRoutineData, userId: string) {
    return await db.transaction(async (tx) => {
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
          updatedBy: userId,
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

      // Get user info for response
      const [user] = await tx
        .select({
          name: users.name,
          email: users.email,
          role: users.role
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return {
        routineId: fullRoutine.routine.routineId,
        section: fullRoutine.section,
        course: fullRoutine.course,
        teacher: fullRoutine.teacher,
        room: fullRoutine.room,
        dayOfWeek: fullRoutine.routine.dayOfWeek,
        startTime: fullRoutine.routine.startTime,
        endTime: fullRoutine.routine.endTime,
        updatedBy: {
          id: userId,
          name: user?.name || 'Unknown',
          email: user?.email || 'Unknown',
          role: user?.role || 'Unknown',
          updatedAt: fullRoutine.routine.updatedAt.toISOString(),
        },
      };
    });
  }

  /**
   * Delete a routine
   * @param routineId - ID of the routine to delete
   * @returns Success message
   */
  static async deleteRoutine(routineId: string) {
    // Check if routine exists
    const [existingRoutine] = await db
      .select()
      .from(routines)
      .where(eq(routines.routineId, routineId))
      .limit(1);

    if (!existingRoutine) {
      throw createError.notFound("Routine not found");
    }

    // Delete the routine
    await db.delete(routines).where(eq(routines.routineId, routineId));

    return {
      message: 'Routine deleted successfully',
      routineId: routineId
    };
  }
}