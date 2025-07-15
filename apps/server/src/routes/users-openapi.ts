import { createRoute, z } from '@hono/zod-openapi';
import { 
  createOpenAPIApp, 
  SuccessResponseSchema,
  ErrorResponseSchema
} from '../lib/swagger';
import {
  UserResponseSchema,
  TeacherResponseSchema,
  StudentResponseSchema,
  CreateAdminSchema,
  CreateTeacherSchema,
  UpdateUserSchema,
  UpdateTeacherSchema,
  UpdateStudentSchema
} from '../types/user.types';
import { 
  requireSuperAdmin,
  requireAdmin,
  requireSelf,
  requireTeacherOrAdmin,
  requireAuth
} from '../middleware/jwt-auth';
import { uuidParamSchema, genderSchema, roleSchema } from '../utils/validation';
import { createError, AppError } from '../utils/errors';
import { UserService } from '../services/user.service';

// Create OpenAPI app instance
const usersRouter = createOpenAPIApp();

// Use centralized schemas from swagger.ts
const createAdminSchema = CreateAdminSchema;

const createTeacherSchema = CreateTeacherSchema;

const adminOrChairmanUpdateSchema = UpdateUserSchema;

const updateTeacherSchema = UpdateTeacherSchema;

const updateStudentSchema = UpdateStudentSchema;

// Response schemas are now imported from swagger.ts

// Create Admin/Chairman Route
const createAdminOrChairmanRoute = createRoute({
  method: 'post',
  path: '/admin-or-chairman',
  tags: ['User Management'],
  summary: 'Create Admin or Chairman',
  description: 'Create a new admin or chairman user. Only accessible by super admin.',
  security: [{ Bearer: [] }],
  middleware: requireSuperAdmin,
  request: {
    body: {
      content: {
        'application/json': {
          schema: createAdminSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Admin/Chairman created successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            user: z.object({
              id: z.string().uuid(),
              email: z.string().email(),
              name: z.string(),
              role: roleSchema,
            }),
          }),
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Conflict - User already exists',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

usersRouter.openapi(createAdminOrChairmanRoute, async (c) => {
  const data = c.req.valid('json');
  
  const result = await UserService.createAdminOrChairman(data);
  
  return c.json({
    message: result.message,
    user: result.user
  }, 201);
});

// Create Teacher Route
const createTeacherRoute = createRoute({
  method: 'post',
  path: '/teacher',
  tags: ['User Management'],
  summary: 'Create Teacher',
  description: 'Create a new teacher user. Only accessible by admin and above.',
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  request: {
    body: {
      content: {
        'application/json': {
          schema: createTeacherSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Teacher created successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            user: z.object({
              id: z.string().uuid(),
              email: z.string().email(),
              name: z.string(),
              role: roleSchema,
              isGuestTeacher: z.boolean(),
            }),
          }),
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Conflict - User already exists',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

usersRouter.openapi(createTeacherRoute, async (c) => {
  const data = c.req.valid('json');
  const currentUser = c.get('user')!;

  const result = await UserService.createTeacher(data, currentUser.id);
  
  return c.json({
    message: result.message,
    user: result.user
  }, 201);
});

// Get All Teachers Route
const getAllTeachersRoute = createRoute({
  method: 'get',
  path: '/teachers',
  tags: ['User Management'],
  summary: 'Get All Teachers',
  description: 'Retrieve a list of all teachers. Only accessible by admin and above.',
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  responses: {
    200: {
      description: 'Teachers retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            teachers: z.array(TeacherResponseSchema),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

usersRouter.openapi(getAllTeachersRoute, async (c) => {
  const result = await UserService.getAllTeachers();
  return c.json(result, 200);
});

// Get All Students Route
const getAllStudentsRoute = createRoute({
  method: 'get',
  path: '/students',
  tags: ['User Management'],
  summary: 'Get All Students',
  description: 'Retrieve a list of all students. Only accessible by admin and above.',
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  responses: {
    200: {
      description: 'Students retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            students: z.array(StudentResponseSchema),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

usersRouter.openapi(getAllStudentsRoute, async (c) => {
  const result = await UserService.getAllStudents();
  return c.json(result, 200);
});

// Get Admin or Chairman by ID Route
const getAdminOrChairmanByIdRoute = createRoute({
  method: 'get',
  path: '/admin-or-chairman/{id}',
  tags: ['User Management'],
  summary: 'Get Admin or Chairman by ID',
  description: 'Retrieve admin or chairman user by ID. Only accessible by admin and above.',
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  request: {
    params: uuidParamSchema,
  },
  responses: {
    200: {
      description: 'User retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            user: UserResponseSchema,
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

usersRouter.openapi(getAdminOrChairmanByIdRoute, async (c) => {
  const { id } = c.req.valid('param');
  
  const result = await UserService.getAdminOrChairmanById(id);
  return c.json(result, 200);
});

// Get Teacher by ID Route
const getTeacherByIdRoute = createRoute({
  method: 'get',
  path: '/teacher/{id}',
  tags: ['User Management'],
  summary: 'Get Teacher by ID',
  description: 'Retrieve teacher by ID. Accessible by teacher (self only) or admin and above.',
  security: [{ Bearer: [] }],
  middleware: requireTeacherOrAdmin,
  request: {
    params: uuidParamSchema,
  },
  responses: {
    200: {
      description: 'Teacher retrieved successfully',
      content: {
        'application/json': {
          schema: TeacherResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Teacher not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

usersRouter.openapi(getTeacherByIdRoute, async (c) => {
  const { id } = c.req.valid('param');
  const currentUser = c.get('user');
  
  // Check if current user is teacher and trying to access their own profile
  if (currentUser?.role === 'teacher' && currentUser?.id !== id) {
    throw createError.forbidden('Teachers can only view their own profile');
  }
  
  const result = await UserService.getTeacherById(id);
  return c.json(result, 200);
});

// Get Student by ID Route
const getStudentByIdRoute = createRoute({
  method: 'get',
  path: '/student/{id}',
  tags: ['User Management'],
  summary: 'Get Student by ID',
  description: 'Retrieve student by ID. Accessible by student (self only) or admin and above.',
  security: [{ Bearer: [] }],
  middleware: requireAuth,
  request: {
    params: uuidParamSchema,
  },
  responses: {
    200: {
      description: 'Student retrieved successfully',
      content: {
        'application/json': {
          schema: StudentResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Student not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

usersRouter.openapi(getStudentByIdRoute, async (c) => {
  const { id } = c.req.valid('param');
  const currentUser = c.get('user');
  
  // Check if current user is student and trying to access their own profile
  if ((currentUser?.role === 'cr_student' || currentUser?.role === 'student') && currentUser?.id !== id) {
    throw createError.forbidden('Students can only view their own profile');
  }
  
  const result = await UserService.getStudentById(id);
  return c.json(result, 200);
});

// Update Teacher Route
const updateTeacherRoute = createRoute({
  method: 'put',
  path: '/teacher/{id}',
  tags: ['User Management'],
  summary: 'Update Teacher Profile',
  description: 'Update teacher profile. Only accessible by admin and above.',
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  request: {
    params: uuidParamSchema,
    body: {
      content: {
        'application/json': {
          schema: updateTeacherSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Teacher updated successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Teacher not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

usersRouter.openapi(updateTeacherRoute, async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const currentUser = c.get('user')!;
  
  const result = await UserService.updateTeacher(id, data, currentUser.id);
  return c.json(result, 200);
});

// Update Student Route
const updateStudentRoute = createRoute({
  method: 'put',
  path: '/student/{id}',
  tags: ['User Management'],
  summary: 'Update Student Profile',
  description: 'Update student profile. Only accessible by admin and above.',
  security: [{ Bearer: [] }],
  middleware: requireAdmin,
  request: {
    params: uuidParamSchema,
    body: {
      content: {
        'application/json': {
          schema: updateStudentSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Student updated successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Student not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

usersRouter.openapi(updateStudentRoute, async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const currentUser = c.get('user')!;
  
  const result = await UserService.updateStudent(id, data, currentUser.id);
  return c.json(result, 200);
});

// Update Admin or Chairman Route
const updateAdminOrChairmanRoute = createRoute({
  method: 'put',
  path: '/admin-or-chairman/{id}',
  tags: ['User Management'],
  summary: 'Update Admin or Chairman Profile',
  description: 'Update admin or chairman profile. Only accessible by the user themselves.',
  security: [{ Bearer: [] }],
  middleware: requireSelf,
  request: {
    params: uuidParamSchema,
    body: {
      content: {
        'application/json': {
          schema: adminOrChairmanUpdateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Admin/Chairman updated successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

usersRouter.openapi(updateAdminOrChairmanRoute, async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  
  // For admin/chairman updates, we'll handle this directly since UserService doesn't have this method
  const updatedData: any = {};
  if (data.name !== undefined) updatedData.name = data.name;
  if (data.gender !== undefined) updatedData.gender = data.gender;
  if (data.phone !== undefined) updatedData.phone = data.phone;
  if (data.address !== undefined) updatedData.address = data.address;

  if (Object.keys(updatedData).length === 0) {
    throw createError.badRequest('No fields to update');
  }

  updatedData.updatedAt = new Date();
  
  // Import db and users here for this specific operation
  const { db, users } = await import('../db');
  const { eq } = await import('drizzle-orm');
  
  await db.update(users).set(updatedData).where(eq(users.id, id));
  
  return c.json({ message: 'User updated successfully' }, 200);
});

// Deactivate User Route
const deactivateUserRoute = createRoute({
  method: 'post',
  path: '/deactivate/{id}',
  tags: ['User Management'],
  summary: 'Deactivate User',
  description: 'Deactivate a user account. Only accessible by super admin.',
  security: [{ Bearer: [] }],
  middleware: requireSuperAdmin,
  request: {
    params: uuidParamSchema,
  },
  responses: {
    200: {
      description: 'User deactivated successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request - User already inactive',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - Cannot deactivate own account',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

usersRouter.openapi(deactivateUserRoute, async (c) => {
  const { id } = c.req.valid('param');
  const currentUser = c.get('user')!;
  
  const result = await UserService.deactivateUser(id, currentUser.id);
  return c.json(result, 200);
});

export { usersRouter };