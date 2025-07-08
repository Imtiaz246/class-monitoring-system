import { Hono } from 'hono';
import crypto from 'crypto';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, users, teacherProfiles, studentProfiles, sections, batches } from '../db';
import { jwtAuth } from '../lib/jwt-auth';
import { createError } from '../utils/errors';
import type { HonoContext } from '../utils/types';
import { uuidParamSchema } from '../utils/validation';
import { eq } from 'drizzle-orm';
import { 
  requireAuth, 
  requireSuperAdmin,
  requireAdmin
} from '../middleware/jwt-auth';
import { sendVerificationEmail } from '../utils/email';
import { alias } from 'drizzle-orm/pg-core';

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

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Create Admin/Chairman (Super Admin only)
usersRouter.post('/create-admin', requireSuperAdmin, zValidator('json', createAdminSchema), async (c) => {
  const { email, name, role, gender, phone, address } = c.req.valid('json');

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
    const tempPassword = Math.floor(10000000 + Math.random() * 90000000).toString();
    const hashedPassword = jwtAuth.hashPassword(tempPassword);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); 

    const [newUser] = await db
      .insert(users)
      .values({
        email: email,
        password: hashedPassword,
        name: name,
        role: role,
        gender: gender,
        phone: phone,
        address: address,
        emailVerified: false,
        emailVerificationToken: emailVerificationToken,
        emailVerificationExpires: emailVerificationTokenExpires,
        isActive: true,
      })
      .returning();

    try {
      await sendVerificationEmail(email, emailVerificationToken, name, tempPassword);
      console.log('✅ Verification email sent successfully');
    } catch (emailError) {
      console.warn('⚠️ Failed to send verification email (continuing anyway):', emailError instanceof Error ? emailError.message : String(emailError));
    }

    return c.json({
      message: `${role} created successfully. Please check email to verify account before logging in.`,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      }
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
    // use dummy password for strealine the development process (remove this once development done)
    // const tempPassword = Math.floor(10000000 + Math.random() * 90000000).toString();
    const tempPassword = "12345678"
    const hashedPassword = jwtAuth.hashPassword(tempPassword);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); 

    // Create teacher user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email,
        password: hashedPassword,
        name: name,
        role: 'teacher',
        gender: gender,
        phone: phone,
        address: address,
        emailVerified: true, // make it false when development is done
        emailVerificationToken: emailVerificationToken,
        emailVerificationExpires: emailVerificationTokenExpires,
        isActive: true,
      })
      .returning();

    await db.insert(teacherProfiles)
      .values({
        userId: newUser.id,
        isGuestTeacher: isGuestTeacher,
        updatedBy: currentUser.id
      })
    
    try {
      await sendVerificationEmail(email, emailVerificationToken, name, tempPassword);
      console.log('✅ Verification email sent successfully');
    } catch (emailError) {
      console.warn('⚠️ Failed to send verification email (continuing anyway):', emailError instanceof Error ? emailError.message : String(emailError));
    }

    return c.json({
      message: `Teacher created successfully. Please check email to verify account before logging in.`,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isGuestTeacher: isGuestTeacher
      }
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw error;
    }
    console.error('Create teacher error:', error);
    throw createError.internalServer('Failed to create teacher');
  }
});

// Get all teachers
usersRouter.get('/teachers', requireAdmin, async (c) => {
  try {
    const updater = alias(users, 'updater');
    const allTeachers = await db
      .select({
        userId: users.id,
        teacherId: teacherProfiles.teacherId,
        name: users.name,
        email: users.email,
        phone: users.phone,
        address: users.address,
        gender: users.gender,
        isGuestTeacher: teacherProfiles.isGuestTeacher,
        updatedByUser: {
          id: updater.id,
          name: updater.name,
          email: updater.email,
          updatedAt: teacherProfiles.updatedAt
        }
      })
      .from(users)
      .innerJoin(teacherProfiles, eq(users.id, teacherProfiles.userId))
      .innerJoin(updater, eq(teacherProfiles.updatedBy, updater.id))
      .where(eq(users.role, 'teacher'));

    return c.json({ teachers: allTeachers });
  } catch (error) {
    console.error('Get teachers error:', error);
    throw createError.internalServer('Failed to fetch teachers');
  }
});

// Get all students
usersRouter.get('/students', requireAdmin, async (c) => {
  try {
    const updater = alias(users, 'updater');
    const allStudents = await db
      .select({
        userId: users.id,
        studentId: studentProfiles.studentId,
        name: users.name,
        email: users.email,
        phone: users.phone,
        address: users.address,
        gender: users.gender,
        semester: studentProfiles.semester,
        section: {
          sectionId: sections.sectionId,
          sectionName: sections.sectionName,
        },
        batch: {
          batchId: batches.batchId,
          batchName: batches.batchName,
        },
        updatedByUser: {
          id: updater.id,
          name: updater.name,
          email: updater.email,
          updatedAt: studentProfiles.updatedAt
        }
      })
      .from(users)
      .innerJoin(studentProfiles, eq(users.id, studentProfiles.userId))
      .innerJoin(sections, eq(studentProfiles.sectionId, sections.sectionId))
      .innerJoin(batches, eq(studentProfiles.batchId, batches.batchId))
      .innerJoin(updater, eq(studentProfiles.updatedBy, updater.id))
      .where(eq(users.role, 'student'));
  
    return c.json({ students: allStudents });
  } catch (error) {
    console.error('Get students error:', error);
    throw createError.internalServer('Failed to fetch students');
  }

});

// Get user by ID
usersRouter.get('/:id', requireAuth, zValidator('param', uuidParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const currentUser = c.get('user')!;

  try {
    // Check if user can access this profile
    const isAdmin = ['super_admin', 'chairman', 'admin'].includes(currentUser.role);
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