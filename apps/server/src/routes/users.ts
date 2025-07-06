import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, users, studentProfiles, teacherProfiles, batches, sections } from '../db';
import { jwtAuth } from '../lib/jwt-auth';
import { createError } from '../utils/errors';
import type { HonoContext } from '../utils/types';
import { uuidParamSchema } from '../utils/validation';
import { eq, and } from 'drizzle-orm';
import { 
  requireAuth, 
  requireSuperAdmin,
  requireAdmin
} from '../middleware/jwt-auth';

const usersRouter = new Hono<HonoContext>();

// Validation schemas
const createSuperAdminSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  developerKey: z.string().min(1, 'Developer key is required'),
});

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

const createStudentSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  studentId: z.string().min(1, 'Student ID is required'),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  semester: z.number().int().min(1).max(12),
  batchId: z.string().uuid('Invalid batch ID'),
  sectionId: z.string().uuid('Invalid section ID'),
  priority: z.number().int().min(0).max(1).default(1), // 0 = CR, 1 = normal
});

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});



// Create Super Admin (requires developer key)
usersRouter.post('/create-super-admin', zValidator('json', createSuperAdminSchema), async (c) => {
  const { email, name, gender, phone, address, developerKey } = c.req.valid('json');

  // Verify developer key
  const expectedDeveloperKey = process.env.DEVELOPER_KEY || 'dev-key-12345';
  if (developerKey !== expectedDeveloperKey) {
    throw createError.forbidden('Invalid developer key');
  }

  try {
    // Check if super admin already exists
    const [existingSuperAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.role, 'super_admin'))
      .limit(1);

    if (existingSuperAdmin) {
      throw createError.conflict('Super Admin already exists');
    }

    // Check if user with email exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      throw createError.conflict('User with this email already exists');
    }

    // Generate temporary password
    const tempPassword = jwtAuth.generateRandomPassword(12);
    const hashedPassword = jwtAuth.hashPassword(tempPassword);

    // Create super admin
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name,
        role: 'super_admin',
        gender,
        phone,
        address,
        emailVerified: true, // Super admin is auto-verified
        isActive: true,
      })
      .returning();

    return c.json({
      message: 'Super Admin created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      temporaryPassword: tempPassword, // In production, send via email
    }, 201);
  } catch (error) {
    if (error instanceof Error && (error.message.includes('already exists') || error.message.includes('Invalid'))) {
      throw error;
    }
    console.error('Create super admin error:', error);
    throw createError.internalServer('Failed to create super admin');
  }
});

// Create Admin/Chairman (Super Admin only)
usersRouter.post('/create-admin', requireSuperAdmin, zValidator('json', createAdminSchema), async (c) => {
  const { email, name, role, gender, phone, address } = c.req.valid('json');
  const currentUser = c.get('user')!;

  try {
    // Check if user with email exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      throw createError.conflict('User with this email already exists');
    }

    // Generate temporary password
    const tempPassword = jwtAuth.generateRandomPassword(12);
    const hashedPassword = jwtAuth.hashPassword(tempPassword);

    // Create admin/chairman
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name,
        role,
        gender,
        phone,
        address,
        emailVerified: false, // Will need to verify email
        isActive: true,
      })
      .returning();

    return c.json({
      message: `${role} created successfully`,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      temporaryPassword: tempPassword, // In production, send via email
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw error;
    }
    console.error('Create admin error:', error);
    throw createError.internalServer('Failed to create admin');
  }
});

// Create Teacher (Admin and above)
usersRouter.post('/create-teacher', requireAdmin, zValidator('json', createTeacherSchema), async (c) => {
  const { email, name, gender, phone, address, isGuestTeacher } = c.req.valid('json');
  const currentUser = c.get('user')!;

  try {
    // Check if user with email exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      throw createError.conflict('User with this email already exists');
    }

    // Generate temporary password
    const tempPassword = jwtAuth.generateRandomPassword(12);
    const hashedPassword = jwtAuth.hashPassword(tempPassword);

    // Create teacher user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name,
        role: 'teacher',
        gender,
        phone,
        address,
        emailVerified: false,
        isActive: true,
      })
      .returning();

    // Create teacher profile
    await db.insert(teacherProfiles).values({
      userId: newUser.id,
      isGuestTeacher,
      updatedBy: currentUser.id,
    });

    return c.json({
      message: 'Teacher created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      temporaryPassword: tempPassword, // In production, send via email
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw error;
    }
    console.error('Create teacher error:', error);
    throw createError.internalServer('Failed to create teacher');
  }
});

// Create Student (Admin and above)
usersRouter.post('/create-student', requireAdmin, zValidator('json', createStudentSchema), async (c) => {
  const { email, name, studentId, gender, phone, address, semester, batchId, sectionId, priority } = c.req.valid('json');
  const currentUser = c.get('user')!;

  try {
    // Check if user with email exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      throw createError.conflict('User with this email already exists');
    }

    // Check if student ID exists
    const [existingStudent] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.studentId, studentId))
      .limit(1);

    if (existingStudent) {
      throw createError.conflict('Student ID already exists');
    }

    // Verify batch and section exist
    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.batchId, batchId))
      .limit(1);

    if (!batch) {
      throw createError.badRequest('Invalid batch ID');
    }

    const [section] = await db
      .select()
      .from(sections)
      .where(and(
        eq(sections.sectionId, sectionId),
        eq(sections.batchId, batchId)
      ))
      .limit(1);

    if (!section) {
      throw createError.badRequest('Invalid section ID or section does not belong to the specified batch');
    }

    // Generate temporary password
    const tempPassword = jwtAuth.generateRandomPassword(12);
    const hashedPassword = jwtAuth.hashPassword(tempPassword);

    // Determine role based on priority
    const role = priority === 0 ? 'cr_student' : 'student';

    // Create student user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name,
        role,
        gender,
        phone,
        address,
        emailVerified: false,
        isActive: true,
      })
      .returning();

    // Create student profile
    await db.insert(studentProfiles).values({
      studentId,
      userId: newUser.id,
      semester,
      batchId,
      sectionId,
      priority,
      updatedBy: currentUser.id,
    });

    return c.json({
      message: `${role === 'cr_student' ? 'CR Student' : 'Student'} created successfully`,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        studentId,
      },
      temporaryPassword: tempPassword, // In production, send via email
    }, 201);
  } catch (error) {
    if (error instanceof Error && (error.message.includes('already exists') || error.message.includes('Invalid'))) {
      throw error;
    }
    console.error('Create student error:', error);
    throw createError.internalServer('Failed to create student');
  }
});

// Get all users (Super Admin only)
usersRouter.get('/', requireSuperAdmin, async (c) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        gender: users.gender,
        phone: users.phone,
        address: users.address,
        emailVerified: users.emailVerified,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    return c.json({ users: allUsers });
  } catch (error) {
    console.error('Get users error:', error);
    throw createError.internalServer('Failed to fetch users');
  }
});

// Get user by ID
usersRouter.get('/:id', requireAuth, zValidator('param', uuidParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const currentUser = c.get('user')!;

  try {
    // Check if user can access this profile
    const isAdmin = ['super_admin', 'chairman', 'admin', 'teacher'].includes(currentUser.role);
    const isSelf = currentUser.id === id;

    if (!isAdmin && !isSelf) {
      throw createError.forbidden('You can only access your own profile');
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        gender: users.gender,
        phone: users.phone,
        address: users.address,
        emailVerified: users.emailVerified,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw createError.notFound('User not found');
    }

    return c.json({ user });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('not found') || error.message.includes('forbidden'))) {
      throw error;
    }
    console.error('Get user error:', error);
    throw createError.internalServer('Failed to fetch user');
  }
});

// Update user
usersRouter.put('/:id', requireAuth, zValidator('param', uuidParamSchema), zValidator('json', updateUserSchema), async (c) => {
  const { id } = c.req.valid('param');
  const updateData = c.req.valid('json');
  const currentUser = c.get('user')!;

  try {
    // Get target user to check their role
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!targetUser) {
      throw createError.notFound('User not found');
    }

    // Check permissions
    const isAdmin = ['super_admin', 'chairman', 'admin'].includes(currentUser.role);
    const isSelf = currentUser.id === id;

    if (!isAdmin && !isSelf) {
      throw createError.forbidden('You can only update your own profile');
    }

    // Students can only update limited fields
    if (currentUser.role === 'student' || currentUser.role === 'cr_student') {
      if (updateData.isActive !== undefined) {
        throw createError.forbidden('Students cannot change account status');
      }
    }

    // Check role-based modification permissions for admin operations
    if (isAdmin && !isSelf) {
      const userRole = currentUser.role;
      const targetRole = targetUser.role;

      if (userRole === 'admin' && ['super_admin', 'chairman', 'admin'].includes(targetRole)) {
        throw createError.forbidden('Admins cannot modify super admins, chairmen, or other admins');
      }

      if (userRole === 'chairman' && ['super_admin', 'chairman'].includes(targetRole)) {
        throw createError.forbidden('Chairmen cannot modify super admins or other chairmen');
      }
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        gender: users.gender,
        phone: users.phone,
        address: users.address,
        emailVerified: users.emailVerified,
        isActive: users.isActive,
        updatedAt: users.updatedAt,
      });

    return c.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('not found') || error.message.includes('forbidden'))) {
      throw error;
    }
    console.error('Update user error:', error);
    throw createError.internalServer('Failed to update user');
  }
});

// Deactivate user (Admin and above)
usersRouter.post('/:id/deactivate', requireAdmin, zValidator('param', uuidParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const currentUser = c.get('user')!;

  try {
    // Get target user
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!targetUser) {
      throw createError.notFound('User not found');
    }

    // Check permissions
    const userRole = currentUser.role;
    const targetRole = targetUser.role;

    if (userRole === 'admin' && ['super_admin', 'chairman', 'admin'].includes(targetRole)) {
      throw createError.forbidden('Admins cannot deactivate super admins, chairmen, or other admins');
    }

    if (userRole === 'chairman' && ['super_admin', 'chairman'].includes(targetRole)) {
      throw createError.forbidden('Chairmen cannot deactivate super admins or other chairmen');
    }

    if (currentUser.id === id) {
      throw createError.forbidden('You cannot deactivate your own account');
    }

    // Deactivate user
    await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return c.json({ message: 'User deactivated successfully' });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('not found') || error.message.includes('forbidden'))) {
      throw error;
    }
    console.error('Deactivate user error:', error);
    throw createError.internalServer('Failed to deactivate user');
  }
});

export { usersRouter };