import { Hono } from 'hono';
import { z } from 'zod';
import { AppError, createError } from '../utils/errors';
import type { HonoContext } from '../utils/types';
import { uuidParamSchema } from '../utils/validation';
import { zValidator } from '../utils/validation';
import { 
  requireSuperAdmin,
  requireAdmin,
  requireSelf,
  requireTeacherOrAdmin,
  requireAuth
} from '../middleware/jwt-auth';
import { UserService } from '../services/user.service';

const usersRouter = new Hono<HonoContext>();

const createAdminSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['chairman', 'admin']),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const createTeacherSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isGuestTeacher: z.boolean().default(false),
});

const adminOrChairmanUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const updateTeacherSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isGuestTeacher: z.boolean().optional(),
});

const updateStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  priority: z.number().int().optional(),
});

// Create Admin/Chairman (Super Admin only)
usersRouter.post('/admin-or-chairman', requireSuperAdmin, zValidator('json', createAdminSchema), async (c) => {
  const data = c.req.valid('json');

  try {
    const result = await UserService.createAdminOrChairman(data);
    
    return c.json({
      message: result.message,
      user: result.user
    }, 201);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Create admin error:', error);
    throw createError.internalServer('Failed to create admin');
  }
});

// Create Teacher (Admin and above)
usersRouter.post('/teacher', requireAdmin, zValidator('json', createTeacherSchema), async (c) => {
  const data = c.req.valid('json');
  const currentUser = c.get('user')!;

  try {
    const result = await UserService.createTeacher(data, currentUser.id);
    
    return c.json({
      message: result.message,
      user: result.user
    }, 201);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Create teacher error:', error);
    throw createError.internalServer('Failed to create teacher');
  }
});

// Get all teachers
usersRouter.get('/teachers', requireAdmin, async (c) => {
  try {
    const result = await UserService.getAllTeachers();
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Get teachers error:', error);
    throw createError.internalServer('Failed to fetch teachers');
  }
});

// Get all students
usersRouter.get('/students', requireAdmin, async (c) => {
  try {
    const result = await UserService.getAllStudents();
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Get students error:', error);
    throw createError.internalServer('Failed to fetch students');
  }
});

// Get admin or chairman by id
usersRouter.get('/admin-or-chairman/:id', requireAdmin, zValidator('param', uuidParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const result = await UserService.getAdminOrChairmanById(id);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Get admin or chairman error:', error);
    throw createError.internalServer('Failed to fetch admin or chairman');
  }
});

// Get teacher by id
usersRouter.get('/teacher/:id', requireTeacherOrAdmin, zValidator('param', uuidParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const currentUser = c.get('user');
    if (currentUser?.role == 'teacher' && currentUser?.id != id) {
      throw createError.forbidden('You can only access your own profile');
    }
    const result = await UserService.getTeacherById(id);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Get teacher by id error:', error);
    throw createError.internalServer('Failed to get teacher');
  }
});

// Get student by id
usersRouter.get('/student/:id', requireAuth, zValidator('param', uuidParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const currentUser = c.get('user');
    if ((currentUser?.role == 'cr_student' || currentUser?.role == 'student') && currentUser?.id != id) {
      throw createError.forbidden('You can only access your own profile');
    }
    const result = await UserService.getStudentById(id);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Get student by id error:', error);
    throw createError.internalServer('Failed to get student');
  }
});

// Update admin or chairman by id
usersRouter.put('/admin-or-chariman/:id', requireSelf, zValidator('param', uuidParamSchema), zValidator('json', adminOrChairmanUpdateSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');

    const currentUser = c.get('user')!;
    const result = await UserService.updateAdminOrChairman(id, data, currentUser.id);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Update admin or chairman error:', error);
    throw createError.internalServer('Failed to update admin or chairman');
  }
});

// Update teacher
usersRouter.put('/teacher/:id', requireAdmin, zValidator('param', uuidParamSchema), zValidator('json', updateTeacherSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
    const currentUser = c.get('user')!;

    const result = await UserService.updateTeacher(id, data, currentUser.id);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Update teacher error:', error);
    throw createError.internalServer('Failed to update teacher');
  }
});

// Update student
usersRouter.put('/student/:id', requireAdmin, zValidator('param', uuidParamSchema), zValidator('json', updateStudentSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
    const currentUser = c.get('user')!;

    const result = await UserService.updateStudent(id, data, currentUser.id);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Update student error:', error);
    throw createError.internalServer('Failed to update student');
  }
});

// Deactivate user (For now super admin can do this operation.. Will add more role based operation in the future)
usersRouter.post('/deactivate/:id', requireSuperAdmin, zValidator('param', uuidParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const currentUser = c.get('user')!;
    
    const result = await UserService.deactivateUser(id, currentUser.id);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Deactivate user error:', error);
    throw createError.internalServer('Failed to deactivate user');
  }
});

export { usersRouter };