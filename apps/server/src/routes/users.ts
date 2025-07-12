import { Hono } from 'hono';
import crypto from 'crypto';
import { z } from 'zod';
import { db, users, teacherProfiles, studentProfiles, sections, batches } from '../db';
import { jwtAuth } from '../lib/jwt-auth';
import { AppError, createError } from '../utils/errors';
import type { HonoContext } from '../utils/types';
import { uuidParamSchema } from '../utils/validation';
import { eq, and, not } from 'drizzle-orm';
import { zValidator } from '../utils/validation';
import { 
  requireSuperAdmin,
  requireAdmin,
  requireSelf,
  requireTeacherOrAdmin,
  requireAuth
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
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Create admin error:', error);
    throw createError.internalServer('Failed to create admin');
  }
});

// Create Teacher (Admin and above)
usersRouter.post('/teacher', requireAdmin, zValidator('json', createTeacherSchema), async (c) => {
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
        isActive: users.isActive,
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
        isActive: users.isActive,
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
      .where(
        and(
          eq(users.id, id),
          not(eq(users.role, 'super_admin')),
          not(eq(users.role, 'cr_student')),
          not(eq(users.role, 'student')),
        )
      )
      .limit(1);

    if (!user) {
      throw createError.notFound('User not found');
    }

    return c.json({ user });
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
    const updater = alias(users, 'updater');
    const teacher = await db
      .select({
        userId: users.id,
        teacherId: teacherProfiles.teacherId,
        name: users.name,
        email: users.email,
        phone: users.phone,
        address: users.address,
        gender: users.gender,
        isGuestTeacher: teacherProfiles.isGuestTeacher,
        isActive: users.isActive,
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
      .where(
        and(
          eq(users.role, 'teacher'),
          eq(users.id, id)
        )
      )
      .limit(1);
    return c.json(teacher);
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
    const updater = alias(users, 'updater');
    const student = await db
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
        isActive: users.isActive,
        updatedByUser: {
          id: updater.id,
          name: updater.name,
          email: updater.email,
          updatedAt: studentProfiles.updatedAt
        },
        updatedAt: studentProfiles.updatedAt
      })
      .from(users)
      .innerJoin(studentProfiles, eq(users.id, studentProfiles.userId))
      .innerJoin(sections, eq(studentProfiles.sectionId, sections.sectionId))
      .innerJoin(batches, eq(studentProfiles.batchId, batches.batchId))
      .innerJoin(updater, eq(studentProfiles.updatedBy, updater.id))
      .where(
        and(
          eq(users.role, 'student'),
          eq(users.id, id)
        )
      )
      .limit(1);
    return c.json(student);
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

    const updatedData: Partial<typeof users.$inferInsert> = {};
    if (data.name !== undefined) updatedData.name = data.name;
    if (data.gender !== undefined) updatedData.gender = data.gender;
    if (data.phone !== undefined) updatedData.phone = data.phone;
    if (data.address !== undefined) updatedData.address = data.address;

    if (Object.keys(updatedData).length > 0) {
      await db.update(users).set(updatedData).where(eq(users.id, id));
      return c.json({ message: 'User updated successfully' })
    } else {
      throw createError.badRequest('No fields to update');
    }
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
    const updatedByUserId = c.get('user')?.id;

    const updatedUserData: Partial<typeof users.$inferInsert> = {};
    const updatedTeacherProfileData: Partial<typeof teacherProfiles.$inferInsert> = {};
    if (data.name !== undefined) updatedUserData.name = data.name;
    if (data.gender !== undefined) updatedUserData.gender = data.gender;
    if (data.phone !== undefined) updatedUserData.phone = data.phone;
    if (data.address !== undefined) updatedUserData.address = data.address;
    if (data.isGuestTeacher !== undefined) updatedTeacherProfileData.isGuestTeacher = data.isGuestTeacher;

    if (Object.keys(updatedUserData).length + Object.keys(updatedTeacherProfileData).length > 0) {
      updatedTeacherProfileData.updatedAt = new Date();
      updatedTeacherProfileData.updatedBy = updatedByUserId;
      await db.transaction(async (tx) => {
        await tx.update(users).set(updatedUserData).where(eq(users.id, id));
        await tx.update(teacherProfiles).set(updatedTeacherProfileData).where(eq(teacherProfiles.userId, id));
      })
      return c.json({ message: 'User updated successfully' });
    } else {
      throw createError.badRequest('No fields to update');
    }
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
    const updatedByUserId = c.get('user')?.id;

    const updatedUserData: Partial<typeof users.$inferInsert> = {};
    const updatedStudentProfileData: Partial<typeof studentProfiles.$inferInsert> = {};
    if (data.name !== undefined) updatedUserData.name = data.name;
    if (data.gender !== undefined) updatedUserData.gender = data.gender;
    if (data.phone !== undefined) updatedUserData.phone = data.phone;
    if (data.address !== undefined) updatedUserData.address = data.address;
    if (data.priority !== undefined) updatedStudentProfileData.priority = data.priority;

    if (Object.keys(updatedUserData).length + Object.keys(updatedStudentProfileData).length > 0) {
      updatedStudentProfileData.updatedAt = new Date();
      updatedStudentProfileData.updatedBy = updatedByUserId;
      await db.transaction(async (tx) => {
        await tx.update(users).set(updatedUserData).where(eq(users.id, id));
        await tx.update(studentProfiles).set(updatedStudentProfileData).where(eq(studentProfiles.userId, id));
      })
      return c.json({ message: 'User updated successfully' });
    } else {
      throw createError.badRequest('No fields to update');
    }
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
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!targetUser) {
      throw createError.notFound('User not found');
    }
    if (currentUser.id === id) {
      throw createError.forbidden('You cannot deactivate your own account');
    }
    if (!targetUser.isActive) {
      throw createError.badRequest('User is already inactive');
    }
    await db.update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
    return c.json({ message: 'User deactivated successfully' });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Deactivate user error:', error);
    throw createError.internalServer('Failed to deactivate user');
  }
});

export { usersRouter };