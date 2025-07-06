import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, courses, users, courseTeacher, teacherProfiles } from "../db";
import { createCourseSchema, addTeachersToCourseSchema } from "../utils/validation";
import { requireAdmin } from "../middleware/auth";
import { createError } from "../utils/errors";
import type { HonoContext } from "../utils/types";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";

const coursesRouter = new Hono<HonoContext>();

// POST /api/v1/courses - Create a course
coursesRouter.post(
  "/",
  requireAdmin,
  zValidator("json", createCourseSchema),
  async (c) => {
    const { courseCode, courseName, creditHours, semester } = c.req.valid("json");
    const user = c.get("user")!;

    try {
      // Check if course code already exists
      const existingCourse = await db
        .select()
        .from(courses)
        .where(eq(courses.courseCode, courseCode))
        .limit(1);

      if (existingCourse.length > 0) {
        throw createError.conflict("Course code already exists");
      }

      // Check if course name already exists
      const existingCourseName = await db
        .select()
        .from(courses)
        .where(eq(courses.courseName, courseName))
        .limit(1);

      if (existingCourseName.length > 0) {
        throw createError.conflict("Course name already exists");
      }

      const [newCourse] = await db
        .insert(courses)
        .values({
          courseCode,
          courseName,
          creditHours,
          semester,
          updatedBy: user.id,
        })
        .returning();

      return c.json({
        data: {
          courseCode: newCourse.courseCode,
          courseName: newCourse.courseName,
          creditHours: newCourse.creditHours,
          semester: newCourse.semester,
          updatedAt: newCourse.updatedAt,
          updatedBy: {
            name: user.name,
            userId: user.id,
            role: user.role,
          },
        },
      }, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes("duplicate")) {
        throw createError.conflict("Course code or name already exists");
      }
      throw error;
    }
  }
);

// GET /api/v1/courses/:id - List courses by semester
coursesRouter.get(
  "/:id",
  zValidator("param", z.object({ id: z.coerce.number().int().positive() })),
  async (c) => {
    const semester = c.req.valid("param").id;

    try {
      const coursesWithUpdater = await db
        .select({
          courseCode: courses.courseCode,
          courseName: courses.courseName,
          creditHours: courses.creditHours,
          semester: courses.semester,
          updatedAt: courses.updatedAt,
          updatedBy: {
            name: users.name,
            userId: users.id,
            role: users.role,
          },
        })
        .from(courses)
        .leftJoin(users, eq(courses.updatedBy, users.id))
        .where(eq(courses.semester, semester))
        .orderBy(courses.courseCode);

      return c.json({
        data: coursesWithUpdater,
      });
    } catch (error) {
      throw createError.internalServer("Failed to fetch courses");
    }
  }
);

// POST /api/v1/courses/add-teachers - Add teachers to a course
coursesRouter.post(
  "/add-teachers",
  requireAdmin,
  zValidator("json", addTeachersToCourseSchema),
  async (c) => {
    const { courseCode, teacherIds } = c.req.valid("json");
    const user = c.get("user")!;

    try {
      // Check if course exists
      const course = await db
        .select()
        .from(courses)
        .where(eq(courses.courseCode, courseCode))
        .limit(1);

      if (course.length === 0) {
        throw createError.notFound("Course not found");
      }

      // Check if all teachers exist
      const teachers = await db
        .select()
        .from(teacherProfiles)
        .where(inArray(teacherProfiles.teacherId, teacherIds));

      if (teachers.length !== teacherIds.length) {
        throw createError.notFound("One or more teachers not found");
      }

      // Check for existing assignments
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
        throw createError.conflict("One or more teachers are already assigned to this course");
      }

      // Create course-teacher assignments
      const assignments = teacherIds.map(teacherId => ({
        courseCode,
        teacherId,
        updatedBy: user.id,
      }));

      const newAssignments = await db
        .insert(courseTeacher)
        .values(assignments)
        .returning();

      return c.json({
        data: {
          courseCode,
          assignedTeachers: newAssignments.length,
          message: `Successfully assigned ${newAssignments.length} teachers to course ${courseCode}`,
        },
      }, 201);
    } catch (error) {
      throw error;
    }
  }
);

export { coursesRouter };