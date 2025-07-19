import { db, courses, users, courseTeacher, teacherProfiles } from '../db';
import { createError } from '../utils/errors';
import { eq, sql, or, and, inArray } from 'drizzle-orm';
import type { CreateCourseData, UpdateCourseData, GetCoursesQuery, AddTeachersToCourseData } from '../types/course.types';

export class CourseService {
  static async createCourse(data: CreateCourseData, updatedById: string) {
    const { courseCode, courseName, creditHours, semester } = data;

    // Check if course code or course name already exists
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(
        or(
          eq(courses.courseCode, courseCode),
          eq(courses.courseName, courseName)
        )
      )
      .limit(1);

    if (existingCourse) {
      throw createError.conflict('Course code or course name already exists');
    }

    // Get user info for response
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, updatedById))
      .limit(1);

    if (!user) {
      throw createError.notFound('User not found');
    }

    // Create new course
    const [newCourse] = await db
      .insert(courses)
      .values({
        courseCode,
        courseName,
        creditHours,
        semester,
        updatedBy: updatedById,
      })
      .returning();

    return {
      message: 'Course created successfully',
      data: {
        courseCode: newCourse.courseCode,
        courseName: newCourse.courseName,
        creditHours: newCourse.creditHours,
        semester: newCourse.semester,
        updatedBy: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          updatedAt: newCourse.updatedAt.toISOString(),
        },
      },
    };
  }

  static async getAllCourses(query: GetCoursesQuery) {
    const { page, limit, semester } = query;
    const offset = (page - 1) * limit;

    // Build where condition
    const whereCondition = semester ? eq(courses.semester, semester) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(courses)
      .where(whereCondition);

    // Get courses with updater info
    const coursesWithUpdater = await db
      .select({
        courseCode: courses.courseCode,
        courseName: courses.courseName,
        creditHours: courses.creditHours,
        semester: courses.semester,
        updatedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          updatedAt: courses.updatedAt,
        },
      })
      .from(courses)
      .leftJoin(users, eq(courses.updatedBy, users.id))
      .where(whereCondition)
      .orderBy(courses.courseCode)
      .limit(limit)
      .offset(offset);

    // Transform the data to ensure proper serialization
    const transformedCourses = coursesWithUpdater.map(course => ({
      courseCode: course.courseCode,
      courseName: course.courseName,
      creditHours: course.creditHours,
      semester: course.semester,
      updatedBy: {
        id: course.updatedBy.id,
        name: course.updatedBy.name,
        email: course.updatedBy.email,
        role: course.updatedBy.role,
        updatedAt: course.updatedBy.updatedAt.toISOString(),
      },
    }));

    return {
      data: transformedCourses,
      meta: {
        total: count,
        page: page,
        limit: limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  static async getCourseByCode(courseCode: string) {
    // Get course with updater info
    const [courseWithUpdater] = await db
      .select({
        courseCode: courses.courseCode,
        courseName: courses.courseName,
        creditHours: courses.creditHours,
        semester: courses.semester,
        updatedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          updatedAt: courses.updatedAt,
        },
      })
      .from(courses)
      .leftJoin(users, eq(courses.updatedBy, users.id))
      .where(eq(courses.courseCode, courseCode))
      .limit(1);

    if (!courseWithUpdater) {
      throw createError.notFound('Course not found');
    }

    return {
      data: {
        courseCode: courseWithUpdater.courseCode,
        courseName: courseWithUpdater.courseName,
        creditHours: courseWithUpdater.creditHours,
        semester: courseWithUpdater.semester,
        updatedBy: {
          id: courseWithUpdater.updatedBy.id,
          name: courseWithUpdater.updatedBy.name,
          email: courseWithUpdater.updatedBy.email,
          role: courseWithUpdater.updatedBy.role,
          updatedAt: courseWithUpdater.updatedBy.updatedAt.toISOString(),
        },
      },
    };
  }

  static async updateCourse(courseCode: string, data: UpdateCourseData, updatedById: string) {
    const { courseName, creditHours, semester } = data;

    // Check if course exists
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.courseCode, courseCode))
      .limit(1);

    if (!existingCourse) {
      throw createError.notFound('Course not found');
    }

    // Check if new course name already exists (excluding current course)
    if (courseName) {
      const [duplicateCourse] = await db
        .select()
        .from(courses)
        .where(eq(courses.courseName, courseName))
        .limit(1);

      if (duplicateCourse && duplicateCourse.courseCode !== courseCode) {
        throw createError.conflict('Course name already exists');
      }
    }

    // Get user info for response
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, updatedById))
      .limit(1);

    if (!user) {
      throw createError.notFound('User not found');
    }

    // Prepare update data
    const updateData: any = {
      updatedBy: updatedById,
      updatedAt: new Date(),
    };

    if (courseName !== undefined) updateData.courseName = courseName;
    if (creditHours !== undefined) updateData.creditHours = creditHours;
    if (semester !== undefined) updateData.semester = semester;

    // Update course
    const [updatedCourse] = await db
      .update(courses)
      .set(updateData)
      .where(eq(courses.courseCode, courseCode))
      .returning();

    return {
      message: 'Course updated successfully',
      data: {
        courseCode: updatedCourse.courseCode,
        courseName: updatedCourse.courseName,
        creditHours: updatedCourse.creditHours,
        semester: updatedCourse.semester,
        updatedBy: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          updatedAt: updatedCourse.updatedAt.toISOString(),
        },
      },
    };
  }

  static async deleteCourse(courseCode: string) {
    // Check if course exists
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.courseCode, courseCode))
      .limit(1);

    if (!existingCourse) {
      throw createError.notFound('Course not found');
    }

    // Check if course has assigned teachers
    const [assignedTeachers] = await db
      .select()
      .from(courseTeacher)
      .where(eq(courseTeacher.courseCode, courseCode))
      .limit(1);

    if (assignedTeachers) {
      throw createError.conflict('Cannot delete course with assigned teachers. Remove teachers first.');
    }

    // Delete course
    await db
      .delete(courses)
      .where(eq(courses.courseCode, courseCode));

    return {
      message: 'Course deleted successfully',
    };
  }

  static async addTeachersToCourse(data: AddTeachersToCourseData, updatedById: string) {
    const { courseCode, teacherIds } = data;

    // Check if course exists
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.courseCode, courseCode))
      .limit(1);

    if (!course) {
      throw createError.notFound('Course not found');
    }

    // Check if all teachers exist
    const teachers = await db
      .select()
      .from(teacherProfiles)
      .where(inArray(teacherProfiles.teacherId, teacherIds));

    if (teachers.length !== teacherIds.length) {
      throw createError.notFound('One or more teachers not found');
    }

    // Check for existing course teacher assignments
    const existingAssignments = await db
      .select()
      .from(courseTeacher)
      .where(
        and(
          eq(courseTeacher.courseCode, courseCode),
          inArray(courseTeacher.teacherId, teacherIds)
        )
      );

    if (existingAssignments.length > 0) {
      throw createError.conflict('One or more teachers are already assigned to this course');
    }

    // Create course-teacher assignments
    const assignments = teacherIds.map(teacherId => ({
      courseCode,
      teacherId,
      updatedBy: updatedById,
    }));

    await db.insert(courseTeacher).values(assignments);

    return {
      data: {
        courseCode: courseCode,
        teacherIds: teacherIds,
        message: `Successfully assigned ${teacherIds.length} ${teacherIds.length > 1 ? 'teachers' : 'teacher'} to course ${courseCode}`,
      },
    };
  }

  static async getTeacherCourses(teacherId: string) {
    // Get courses assigned to the teacher
    const teacherCourses = await db
      .select({
        courseCode: courses.courseCode,
        courseName: courses.courseName,
        creditHours: courses.creditHours,
        semester: courses.semester,
        updatedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          updatedAt: courses.updatedAt,
        },
      })
      .from(courses)
      .innerJoin(courseTeacher, eq(courses.courseCode, courseTeacher.courseCode))
      .leftJoin(users, eq(courses.updatedBy, users.id))
      .where(eq(courseTeacher.teacherId, teacherId))
      .orderBy(courses.courseCode);

    // Transform the data to ensure proper serialization
    const transformedCourses = teacherCourses.map(course => ({
      courseCode: course.courseCode,
      courseName: course.courseName,
      creditHours: course.creditHours,
      semester: course.semester,
      updatedBy: {
        id: course.updatedBy.id,
        name: course.updatedBy.name,
        email: course.updatedBy.email,
        role: course.updatedBy.role,
        updatedAt: course.updatedBy.updatedAt.toISOString(),
      },
    }));

    return {
      data: transformedCourses,
    };
  }

  static async getCoursesBySemester(semester: number) {
    // Get courses by semester
    const coursesWithUpdater = await db
      .select({
        courseCode: courses.courseCode,
        courseName: courses.courseName,
        creditHours: courses.creditHours,
        semester: courses.semester,
        updatedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          updatedAt: courses.updatedAt,
        },
      })
      .from(courses)
      .leftJoin(users, eq(courses.updatedBy, users.id))
      .where(eq(courses.semester, semester))
      .orderBy(courses.courseCode);

    // Transform the data to ensure proper serialization
    const transformedCourses = coursesWithUpdater.map(course => ({
      courseCode: course.courseCode,
      courseName: course.courseName,
      creditHours: course.creditHours,
      semester: course.semester,
      updatedBy: {
        id: course.updatedBy.id,
        name: course.updatedBy.name,
        email: course.updatedBy.email,
        role: course.updatedBy.role,
        updatedAt: course.updatedBy.updatedAt.toISOString(),
      },
    }));

    return {
      data: transformedCourses,
    };
  }
}