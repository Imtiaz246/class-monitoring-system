import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, teacherProfiles, users } from "../db";
import { updateTeacherProfileSchema } from "../utils/validation";
import { requireSelfOrAdmin } from "../middleware/auth";
import { createError } from "../utils/errors";
import type { HonoContext } from "../utils/types";
import { eq } from "drizzle-orm";
import { z } from "zod";

const teacherProfilesRouter = new Hono<HonoContext>();

// GET /api/v1/teacher-profiles/:id - Get teacher profile
teacherProfilesRouter.get(
  "/:id",
  requireSelfOrAdmin,
  zValidator("param", z.object({ id: z.string() })),
  async (c) => {
    const { id: userId } = c.req.valid("param");

    try {
      const teacherProfile = await db
        .select({
          name: users.name,
          teacherId: teacherProfiles.teacherId,
          userId: users.id,
          email: users.email,
          isGuestTeacher: teacherProfiles.isGuestTeacher,
          role: users.role,
          gender: users.gender,
          phone: users.phone,
          address: users.address,
          updatedAt: teacherProfiles.updatedAt,
          updatedBy: teacherProfiles.updatedBy,
        })
        .from(teacherProfiles)
        .innerJoin(users, eq(teacherProfiles.userId, users.id))
        .where(eq(users.id, userId))
        .limit(1);

      if (teacherProfile.length === 0) {
        throw createError.notFound("Teacher profile not found");
      }

      return c.json({
        data: teacherProfile[0],
      });
    } catch (error) {
      throw error;
    }
  }
);

// PUT /api/v1/teacher-profiles/:id - Update teacher profile
teacherProfilesRouter.put(
  "/:id",
  requireSelfOrAdmin,
  zValidator("param", z.object({ id: z.string() })),
  zValidator("json", updateTeacherProfileSchema),
  async (c) => {
    const { id: userId } = c.req.valid("param");
    const updateData = c.req.valid("json");
    const currentUser = c.get("user")!;

    try {
      // Check if teacher profile exists
      const existingProfile = await db
        .select()
        .from(teacherProfiles)
        .where(eq(teacherProfiles.userId, userId))
        .limit(1);

      if (existingProfile.length === 0) {
        throw createError.notFound("Teacher profile not found");
      }

      // Separate user table updates from teacher profile updates
      const userUpdates: any = {};
      const profileUpdates: any = {};

      if (updateData.name !== undefined) userUpdates.name = updateData.name;
      if (updateData.gender !== undefined) userUpdates.gender = updateData.gender;
      if (updateData.phone !== undefined) userUpdates.phone = updateData.phone;
      if (updateData.address !== undefined) userUpdates.address = updateData.address;

      if (updateData.isGuestTeacher !== undefined) profileUpdates.isGuestTeacher = updateData.isGuestTeacher;

      // Update user table if there are user-related changes
      if (Object.keys(userUpdates).length > 0) {
        userUpdates.updatedAt = new Date();
        await db
          .update(users)
          .set(userUpdates)
          .where(eq(users.id, userId));
      }

      // Update teacher profile table
      profileUpdates.updatedBy = currentUser.id;
      profileUpdates.updatedAt = new Date();

      const [updatedProfile] = await db
        .update(teacherProfiles)
        .set(profileUpdates)
        .where(eq(teacherProfiles.userId, userId))
        .returning();

      // Fetch updated profile with all related data
      const fullProfile = await db
        .select({
          name: users.name,
          teacherId: teacherProfiles.teacherId,
          userId: users.id,
          email: users.email,
          isGuestTeacher: teacherProfiles.isGuestTeacher,
          role: users.role,
          gender: users.gender,
          phone: users.phone,
          address: users.address,
          updatedAt: teacherProfiles.updatedAt,
          updatedBy: teacherProfiles.updatedBy,
        })
        .from(teacherProfiles)
        .innerJoin(users, eq(teacherProfiles.userId, users.id))
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

export { teacherProfilesRouter };