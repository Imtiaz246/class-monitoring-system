import { Hono } from "hono";
import { zValidator } from "../utils/validation";
import { createRoutineSchema, getRoutinesSchema, updateRoutineSchema } from "../utils/validation";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { AppError, createError } from "../utils/errors";
import type { HonoContext } from "../utils/types";
import { RoutineService } from "../services/routine.service";

const routinesRouter = new Hono<HonoContext>();

// Upload routine - Only accessible for admin
routinesRouter.post('/', requireAdmin, zValidator('json', createRoutineSchema), async (c) => {
  const routineData = c.req.valid('json');
  const user = c.get('user')!;

  try {
    const result = await RoutineService.createRoutine({
      sectionId: routineData.sectionId,
      courseCode: routineData.courseCode,
      roomId: routineData.roomId,
      teacherId: routineData.teacherId,
      dayOfWeek: routineData.dayOfWeek,
      startTime: routineData.startTime,
      endTime: routineData.endTime,
      userId: user.id
    });

    return c.json({
      data: result
    }, 201);
  } catch (error) {
    throw error;
  }
});

// Get routines
routinesRouter.get('/', requireAuth, zValidator('query', getRoutinesSchema), async (c) => {
  const query = c.req.valid('query');

  try {
    const result = await RoutineService.getRoutines({
      page: query.page,
      limit: query.limit,
      dayOfWeek: query.dayOfWeek,
      semester: query.semester,
      sectionId: query.sectionId,
      teacherId: query.teacherId,
      courseCode: query.courseCode,
      batchId: query.batchId
    });

    return c.json(result);
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
    const result = await RoutineService.updateRoutine(routineId, updateData, user.id);
    return c.json(result);
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
    const result = await RoutineService.deleteRoutine(routineId);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.log('Failed to delete routine', error);
    throw createError.internalServer('Failed to delete routine.');
  }
});

export { routinesRouter };