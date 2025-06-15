import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, studentProfiles, users, batches, sections } from "../db";
import { updateStudentProfileSchema, uuidSchema } from "../utils/validation";
import { requireSelfOrAdmin } from "../middleware/auth";
import { createError } from "../utils/errors";
import type { HonoContext } from "../utils/types";
import { eq } from "drizzle-orm";
import { z } from "zod";

const studentProfilesRouter = new Hono<HonoContext>();

// GET /api/v1/student-profiles/:id - Get student profile
studentProfilesRouter.get(
  "/:id",
  requireSelfOrAdmin,
  zValidator("param", z.object({ id: z.string() })),
  async (c) => {
    const { id: userId } = c.req.valid("param");

    try {
      const studentProfile = await db
        .select({
          name: users.name,
          studentId: studentProfiles.studentId,
          userId: users.id,
          email: users.email,
          semester: studentProfiles.semester,
          batchName: batches.batchName,
          sectionName: sections.sectionName,
          role: users.role,
          gender: users.gender,
          phone: users.phone,
          address: users.address,
          updatedAt: studentProfiles.updatedAt,
          updatedBy: studentProfiles.updatedBy,
        })
        .from(studentProfiles)
        .innerJoin(users, eq(studentProfiles.userId, users.id))
        .innerJoin(batches, eq(studentProfiles.batchId, batches.batchId))
        .innerJoin(sections, eq(studentProfiles.sectionId, sections.sectionId))
        .where(eq(users.id, userId))
        .limit(1);

      if (studentProfile.length === 0) {
        throw createError.notFound("Student profile not found");
      }

      return c.json({
        data: studentProfile[0],
      });
    } catch (error) {
      throw error;
    }
  }
);

// PUT /api/v1/student-profiles/:id - Update student profile
studentProfilesRouter.put(
  "/:id",
  requireSelfOrAdmin,
  zValidator("param", z.object({ id: z.string() })),
  zValidator("json", updateStudentProfileSchema),
  async (c) => {
    const { id: userId } = c.req.valid("param");
    const updateData = c.req.valid("json");
    const currentUser = c.get("user")!;

    try {
      // Check if student profile exists
      const existingProfile = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, userId))
        .limit(1);

      if (existingProfile.length === 0) {
        throw createError.notFound("Student profile not found");
      }

      // Separate user table updates from student profile updates
      const userUpdates: any = {};
      const profileUpdates: any = {};

      if (updateData.name !== undefined) userUpdates.name = updateData.name;
      if (updateData.gender !== undefined) userUpdates.gender = updateData.gender;
      if (updateData.phone !== undefined) userUpdates.phone = updateData.phone;
      if (updateData.address !== undefined) userUpdates.address = updateData.address;
      if (updateData.role !== undefined) userUpdates.role = updateData.role;

      // Update user table if there are user-related changes
      if (Object.keys(userUpdates).length > 0) {
        userUpdates.updatedAt = new Date();
        await db
          .update(users)
          .set(userUpdates)
          .where(eq(users.id, userId));
      }

      // Update student profile table
      profileUpdates.updatedBy = currentUser.id;
      profileUpdates.updatedAt = new Date();

      const [updatedProfile] = await db
        .update(studentProfiles)
        .set(profileUpdates)
        .where(eq(studentProfiles.userId, userId))
        .returning();

      // Fetch updated profile with all related data
      const fullProfile = await db
        .select({
          name: users.name,
          studentId: studentProfiles.studentId,
          userId: users.id,
          email: users.email,
          semester: studentProfiles.semester,
          batchName: batches.batchName,
          sectionName: sections.sectionName,
          role: users.role,
          gender: users.gender,
          phone: users.phone,
          address: users.address,
          updatedAt: studentProfiles.updatedAt,
          updatedBy: studentProfiles.updatedBy,
        })
        .from(studentProfiles)
        .innerJoin(users, eq(studentProfiles.userId, users.id))
        .innerJoin(batches, eq(studentProfiles.batchId, batches.batchId))
        .innerJoin(sections, eq(studentProfiles.sectionId, sections.sectionId))
        .where(eq(users.id, userId))
        .limit(1);

      return c.json({
        data: fullProfile[0],
      });
    } catch (error) {
      throw error;
    }
  }
);

export { studentProfilesRouter };