import { db, users, teacherProfiles, studentProfiles, sections, batches } from '../db';
import { jwtAuth } from '../lib/jwt-auth';
import { createError } from '../utils/errors';
import { sendVerificationEmail } from '../utils/email';
import { eq, and, not, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import crypto from 'crypto';

export interface CreateAdminData {
  email: string;
  name: string;
  role: 'chairman' | 'admin';
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  address?: string;
}

export interface CreateTeacherData {
  email: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  address?: string;
  isGuestTeacher: boolean;
}

export interface UpdateTeacherData {
  name?: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  address?: string;
  isGuestTeacher?: boolean;
}

export interface UpdateStudentData {
  name?: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  address?: string;
  semester?: number;
  sectionId?: string;
  batchId?: string;
}

export class UserService {
  static async createAdminOrChairman(data: CreateAdminData) {
    const { email, name, role, gender, phone, address } = data;

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

    return {
      message: `${role} created successfully. Please check email to verify account before logging in.`,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      }
    };
  }

  static async createTeacher(data: CreateTeacherData, currentUserId: string) {
    const { email, name, gender, phone, address, isGuestTeacher } = data;

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
    const tempPassword = "12345678";
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
        emailVerified: true,
        emailVerificationToken: emailVerificationToken,
        emailVerificationExpires: emailVerificationTokenExpires,
        isActive: true,
      })
      .returning();

    await db.insert(teacherProfiles)
      .values({
        userId: newUser.id,
        isGuestTeacher: isGuestTeacher,
        updatedBy: currentUserId
      });
    
    try {
      await sendVerificationEmail(email, emailVerificationToken, name, tempPassword);
      console.log('✅ Verification email sent successfully');
    } catch (emailError) {
      console.warn('⚠️ Failed to send verification email (continuing anyway):', emailError instanceof Error ? emailError.message : String(emailError));
    }

    return {
      message: `Teacher created successfully. Please check email to verify account before logging in.`,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isGuestTeacher: isGuestTeacher
      }
    };
  }

  static async getAllTeachers() {
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

    return { teachers: allTeachers };
  }

  static async getAllStudents() {
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
  
    return { students: allStudents };
  }

  static async getAdminOrChairmanById(id: string) {
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
          not(eq(users.role, 'teacher')),
        )
      )
      .limit(1);

    if (!user) {
      throw createError.notFound('User not found');
    }

    return { user };
  }

  static async getTeacherById(id: string) {
    const updater = alias(users, 'updater');
    const [teacher] = await db
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

    if (!teacher) {
      throw createError.notFound('Teacher not found');
    }

    return teacher;
  }

  static async getStudentById(id: string) {
    const updater = alias(users, 'updater');
    const [student] = await db
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
          or(eq(users.role, 'student'), eq(users.role, 'cr_student')),
          eq(users.id, id)
        )
      )
      .limit(1);

    if (!student) {
      throw createError.notFound('Student not found');
    }

    return student;
  }

  static async updateTeacher(id: string, data: UpdateTeacherData, currentUserId: string) {
    // Check if teacher exists
    const [existingTeacher] = await db
      .select()
      .from(users)
      .innerJoin(teacherProfiles, eq(users.id, teacherProfiles.userId))
      .where(and(eq(users.id, id), eq(users.role, 'teacher')))
      .limit(1);

    if (!existingTeacher) {
      throw createError.notFound('Teacher not found');
    }

    await db.transaction(async (tx) => {
      // Update user table
      const userUpdates: any = {};
      if (data.name !== undefined) userUpdates.name = data.name;
      if (data.phone !== undefined) userUpdates.phone = data.phone;
      if (data.address !== undefined) userUpdates.address = data.address;
      if (data.gender !== undefined) userUpdates.gender = data.gender;
      
      if (Object.keys(userUpdates).length > 0) {
        userUpdates.updatedAt = new Date();
        await tx
          .update(users)
          .set(userUpdates)
          .where(eq(users.id, id));
      }

      // Update teacher profile
      const teacherUpdates: any = {
        updatedBy: currentUserId,
        updatedAt: new Date(),
      };
      if (data.isGuestTeacher !== undefined) {
        teacherUpdates.isGuestTeacher = data.isGuestTeacher;
      }

      await tx
        .update(teacherProfiles)
        .set(teacherUpdates)
        .where(eq(teacherProfiles.userId, id));
    });

    return { message: 'Teacher updated successfully' };
  }

  static async updateStudent(id: string, data: UpdateStudentData, currentUserId: string) {
    // Check if student exists
    const [existingStudent] = await db
      .select()
      .from(users)
      .innerJoin(studentProfiles, eq(users.id, studentProfiles.userId))
      .where(
        and(
          eq(users.id, id),
          or(eq(users.role, 'student'), eq(users.role, 'cr_student'))
        )
      )
      .limit(1);

    if (!existingStudent) {
      throw createError.notFound('Student not found');
    }

    await db.transaction(async (tx) => {
      // Update user table
      const userUpdates: any = {};
      if (data.name !== undefined) userUpdates.name = data.name;
      if (data.phone !== undefined) userUpdates.phone = data.phone;
      if (data.address !== undefined) userUpdates.address = data.address;
      if (data.gender !== undefined) userUpdates.gender = data.gender;
      
      if (Object.keys(userUpdates).length > 0) {
        userUpdates.updatedAt = new Date();
        await tx
          .update(users)
          .set(userUpdates)
          .where(eq(users.id, id));
      }

      // Update student profile
      const studentUpdates: any = {
        updatedBy: currentUserId,
        updatedAt: new Date(),
      };
      if (data.semester !== undefined) studentUpdates.semester = data.semester;
      if (data.sectionId !== undefined) studentUpdates.sectionId = data.sectionId;
      if (data.batchId !== undefined) studentUpdates.batchId = data.batchId;

      await tx
        .update(studentProfiles)
        .set(studentUpdates)
        .where(eq(studentProfiles.userId, id));
    });

    return { message: 'Student updated successfully' };
  }

  static async updateAdminOrChairman(id: string, data: Partial<CreateAdminData>, currentUserId: string) {
    // Check if admin or chairman exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, id),
          or(eq(users.role, 'admin'), eq(users.role, 'chairman'))
        )
      )
      .limit(1);

    if (!existingUser) {
      throw createError.notFound('Admin or Chairman not found');
    }

    // Update user data
    const userUpdates: any = {};
    if (data.name !== undefined) userUpdates.name = data.name;
    if (data.phone !== undefined) userUpdates.phone = data.phone;
    if (data.address !== undefined) userUpdates.address = data.address;
    if (data.gender !== undefined) userUpdates.gender = data.gender;
    
    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updatedAt = new Date();
      await db
        .update(users)
        .set(userUpdates)
        .where(eq(users.id, id));
    }

    return { message: 'User updated successfully' };
  }

  static async deactivateUser(id: string, currentUserId: string) {
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
      
    if (!targetUser) {
      throw createError.notFound('User not found');
    }
    
    if (currentUserId === id) {
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
      
    return { message: 'User deactivated successfully' };
  }
}