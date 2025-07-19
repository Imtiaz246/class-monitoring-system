import { Hono } from "hono";
import { uuidParamSchema, zValidator } from "../utils/validation";
import { createCourseSchema, updateCourseSchema, addTeachersToCourseSchema, getCoursesSchema } from "../utils/validation";
import { requireAdmin, requireAuth, requireTeacherOrAdmin } from "../middleware/auth";
import { AppError, createError } from "../utils/errors";
import type { HonoContext } from "../utils/types";
import { CourseService } from "../services/course.service";
import { z } from "zod";

const coursesRouter = new Hono<HonoContext>();

// Create a course
coursesRouter.post('/', requireAdmin, zValidator('json', createCourseSchema), async (c) => {
  const data = c.req.valid('json');
  const user = c.get('user')!;

  try {
    const result = await CourseService.createCourse(data, user.id);
    return c.json(result, 201);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.log('Failed to create course:', error);
    throw createError.internalServer('Failed to create course');
  }
});

// Get all courses
coursesRouter.get('/', requireAuth, zValidator('query', getCoursesSchema), async (c) => {
  const query = c.req.valid('query');

  try {
    const result = await CourseService.getAllCourses(query);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.log('Failed to fetch courses:', error);
    throw createError.internalServer('Failed to fetch courses');
  }
});

// Get course by code
coursesRouter.get('/:courseCode', requireAuth, zValidator('param', z.object({ courseCode: z.string().min(1, 'Course code is required') })), async (c) => {
  const { courseCode } = c.req.valid('param');

  try {
    const result = await CourseService.getCourseByCode(courseCode);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.log('Failed to fetch course:', error);
    throw createError.internalServer('Failed to fetch course');
  }
});

// Update course
coursesRouter.put('/:courseCode', requireAdmin, zValidator('param', z.object({ courseCode: z.string().min(1, 'Course code is required') })), zValidator('json', updateCourseSchema), async (c) => {
  const { courseCode } = c.req.valid('param');
  const data = c.req.valid('json');
  const user = c.get('user')!;

  try {
    const result = await CourseService.updateCourse(courseCode, data, user.id);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.log('Failed to update course:', error);
    throw createError.internalServer('Failed to update course');
  }
});

// Delete course
coursesRouter.delete('/:courseCode', requireAdmin, zValidator('param', z.object({ courseCode: z.string().min(1, 'Course code is required') })), async (c) => {
  const { courseCode } = c.req.valid('param');

  try {
    const result = await CourseService.deleteCourse(courseCode);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.log('Failed to delete course:', error);
    throw createError.internalServer('Failed to delete course');
  }
});

// Get courses by semester
coursesRouter.get('/semester/:semester', requireAuth, zValidator('param', z.object({ semester: z.coerce.number().int().positive() })), async (c) => {
  const { semester } = c.req.valid('param');

  try {
    const result = await CourseService.getCoursesBySemester(semester);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.log('Failed to fetch courses by semester:', error);
    throw createError.internalServer('Failed to fetch courses by semester');
  }
});

// Add teachers to a course
coursesRouter.post('/add-teachers', requireAdmin, zValidator('json', addTeachersToCourseSchema), async (c) => {
  const data = c.req.valid('json');
  const user = c.get('user')!;

  try {
    const result = await CourseService.addTeachersToCourse(data, user.id);
    return c.json(result, 201);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.log('Failed to add teachers to course:', error);
    throw createError.internalServer('Failed to add teachers to course');
  }
});

// Get teacher courses
coursesRouter.get('/teacher/:teacherId', requireTeacherOrAdmin, zValidator('param', uuidParamSchema), async (c) => {
  const { id: teacherId } = c.req.valid('param');
  
  try {
    const result = await CourseService.getTeacherCourses(teacherId);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.log('Failed to fetch teacher courses:', error);
    throw createError.internalServer('Failed to fetch teacher courses');
  }
});

export { coursesRouter };