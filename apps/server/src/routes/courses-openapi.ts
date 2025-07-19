import { createRoute, z } from '@hono/zod-openapi';
import {
  createOpenAPIApp,
  commonErrorResponses,
} from '../lib/swagger';
import { CourseService } from '../services/course.service';
import { requireAdmin, requireAuth, requireTeacherOrAdmin } from '../middleware/auth';
import {
  createCourseSchema,
  updateCourseSchema,
  getCoursesSchema,
  addTeachersToCourseSchema,
  CourseResponseSchema,
  CourseListResponseSchema,
  CourseErrorResponseSchema,
  AddTeachersToCourseResponseSchema,
} from '../types/course.types';
import { AppError, createError } from '../utils/errors';

// Create OpenAPI app instance
const coursesRouter = createOpenAPIApp();

// Create course route
const createCourseRoute = createRoute({
  method: 'post',
  path: '/',
  summary: 'Create a new course',
  description: 'Create a new course with course code, name, credit hours, and semester',
  tags: ['Courses'],
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  request: {
    body: {
      content: {
        'application/json': {
          schema: createCourseSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Course created successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            data: CourseResponseSchema,
          }),
        },
      },
    },
    ...commonErrorResponses,
    409: {
      description: 'Conflict - Course already exists',
      content: {
        'application/json': {
          schema: CourseErrorResponseSchema,
        },
      },
    },
  },
});

// Get all courses route
const getCoursesRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'Get all courses',
  description: 'Retrieve all courses with optional pagination and semester filtering',
  tags: ['Courses'],
  security: [{ Bearer: [] }],
  middleware: requireAuth,
  request: {
    query: getCoursesSchema,
  },
  responses: {
    200: {
      description: 'Courses retrieved successfully',
      content: {
        'application/json': {
          schema: CourseListResponseSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

// Get course by code route
const getCourseByCodeRoute = createRoute({
  method: 'get',
  path: '/{courseCode}',
  summary: 'Get course by code',
  description: 'Retrieve a specific course by its course code',
  tags: ['Courses'],
  security: [{ Bearer: [] }],
  middleware: requireAuth,
  request: {
    params: z.object({
      courseCode: z.string().min(1, 'Course code is required'),
    }),
  },
  responses: {
    200: {
      description: 'Course retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({ data: CourseResponseSchema }),
        },
      },
    },
    ...commonErrorResponses,
    404: {
      description: 'Course not found',
      content: {
        'application/json': {
          schema: CourseErrorResponseSchema,
        },
      },
    },
  },
});

// Update course route
const updateCourseRoute = createRoute({
  method: 'put',
  path: '/{courseCode}',
  summary: 'Update course',
  description: 'Update an existing course by course code',
  tags: ['Courses'],
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  request: {
    params: z.object({
      courseCode: z.string().min(1, 'Course code is required'),
    }),
    body: {
      content: {
        'application/json': {
          schema: updateCourseSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Course updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            data: CourseResponseSchema,
          }),
        },
      },
    },
    ...commonErrorResponses,
    404: {
      description: 'Course not found',
      content: {
        'application/json': {
          schema: CourseErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Conflict - Course name already exists',
      content: {
        'application/json': {
          schema: CourseErrorResponseSchema,
        },
      },
    },
  },
});

// Delete course route
const deleteCourseRoute = createRoute({
  method: 'delete',
  path: '/{courseCode}',
  summary: 'Delete course',
  description: 'Delete a course by course code',
  tags: ['Courses'],
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  request: {
    params: z.object({
      courseCode: z.string().min(1, 'Course code is required'),
    }),
  },
  responses: {
    200: {
      description: 'Course deleted successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    ...commonErrorResponses,
    404: {
      description: 'Course not found',
      content: {
        'application/json': {
          schema: CourseErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Conflict - Course has assigned teachers',
      content: {
        'application/json': {
          schema: CourseErrorResponseSchema,
        },
      },
    },
  },
});

// Add teachers to course route
const addTeachersToCourseRoute = createRoute({
  method: 'post',
  path: '/add-teachers',
  summary: 'Add teachers to course',
  description: 'Assign one or more teachers to a course',
  tags: ['Courses'],
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  request: {
    body: {
      content: {
        'application/json': {
          schema: addTeachersToCourseSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Teachers added to course successfully',
      content: {
        'application/json': {
          schema: AddTeachersToCourseResponseSchema,
        },
      },
    },
    ...commonErrorResponses,
    404: {
      description: 'Course not found',
      content: {
        'application/json': {
          schema: CourseErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Conflict - Some teachers already assigned',
      content: {
        'application/json': {
          schema: CourseErrorResponseSchema,
        },
      },
    },
  },
});

// Get courses by semester route
const getCoursesBySemesterRoute = createRoute({
  method: 'get',
  path: '/semester/{semester}',
  summary: 'Get courses by semester',
  description: 'Retrieve all courses for a specific semester',
  tags: ['Courses'],
  security: [{ Bearer: [] }],
  middleware: requireAuth,
  request: {
    params: z.object({
      semester: z.coerce.number().int().positive(),
    }),
  },
  responses: {
    200: {
      description: 'Courses retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(CourseResponseSchema),
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});

// Get teacher courses route
const getTeacherCoursesRoute = createRoute({
  method: 'get',
  path: '/teacher/{teacherId}',
  summary: 'Get teacher courses',
  description: 'Retrieve all courses assigned to a specific teacher',
  tags: ['Courses'],
  security: [{ Bearer: [] }],
  middleware: requireTeacherOrAdmin,
  request: {
    params: z.object({
      teacherId: z.string().uuid('Invalid teacher ID format'),
    }),
  },
  responses: {
    200: {
      description: 'Teacher courses retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(CourseResponseSchema),
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});

// Route handlers
coursesRouter.openapi(createCourseRoute, async (c) => {
  try {
    const data = c.req.valid('json');
    const user = c.get('user')!;
    const result = await CourseService.createCourse(data, user.id);
    return c.json(result, 201);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected course creation error:', error);
    throw createError.internalServer('Failed to create course');
  }
});

coursesRouter.openapi(getCoursesRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const result = await CourseService.getAllCourses(query);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected error fetching courses:', error);
    throw createError.internalServer('Failed to fetch courses');
  }
});

coursesRouter.openapi(getCourseByCodeRoute, async (c) => {
  try {
    const { courseCode } = c.req.valid('param');
    const result = await CourseService.getCourseByCode(courseCode);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected error fetching course:', error);
    throw createError.internalServer('Failed to fetch course');
  }
});

coursesRouter.openapi(updateCourseRoute, async (c) => {
  const { courseCode } = c.req.param();
  const data = c.req.valid('json');
  const user = c.get('user')!;

  try {
    const result = await CourseService.updateCourse(courseCode, data, user.id);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.log('Failed to update course:', error);
    throw createError.internalServer('Failed to update course');
  }
});

coursesRouter.openapi(deleteCourseRoute, async (c) => {
  const { courseCode } = c.req.param();

  try {
    const result = await CourseService.deleteCourse(courseCode);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.log('Failed to delete course:', error);
    throw createError.internalServer('Failed to delete course');
  }
});

coursesRouter.openapi(addTeachersToCourseRoute, async (c) => {
  const data = c.req.valid('json');
  const user = c.get('user')!;

  try {
    const result = await CourseService.addTeachersToCourse(data, user.id);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.log('Failed to add teachers to course:', error);
    throw createError.internalServer('Failed to add teachers to course');
  }
});

coursesRouter.openapi(getCoursesBySemesterRoute, async (c) => {
  try {
    const { semester } = c.req.valid('param');
    const result = await CourseService.getCoursesBySemester(semester);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected error fetching courses by semester:', error);
    throw createError.internalServer('Failed to fetch courses by semester');
  }
});

coursesRouter.openapi(getTeacherCoursesRoute, async (c) => {
  try {
    const { teacherId } = c.req.valid('param');
    const result = await CourseService.getTeacherCourses(teacherId);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Unexpected error fetching teacher courses:', error);
    throw createError.internalServer('Failed to fetch teacher courses');
  }
});

export { coursesRouter };