import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, sections, users } from "../db";
import { createSectionSchema } from "../utils/validation";
import { requireAdmin } from "../middleware/auth";
import { createError } from "../utils/errors";
import type { HonoContext } from "../utils/types";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const sectionsRouter = new Hono<HonoContext>();

// POST /api/v1/sections - Create a section
sectionsRouter.post(
  "/",
  requireAdmin,
  zValidator("json", createSectionSchema),
  async (c) => {
    const { sectionName, semester } = c.req.valid("json");
    const user = c.get("user")!;

    try {
      // Check if section with same name and semester already exists
      const existingSection = await db
        .select()
        .from(sections)
        .where(and(
          eq(sections.sectionName, sectionName),
          eq(sections.semester, semester)
        ))
        .limit(1);

      if (existingSection.length > 0) {
        throw createError.conflict("Section with same name already exists for this semester");
      }

      const [newSection] = await db
        .insert(sections)
        .values({
          sectionName,
          semester,
          batchId: '', // This should be set when creating the section with a batch
          updatedBy: user.id,
        })
        .returning();

      return c.json({
        data: {
          sectionId: newSection.sectionId,
          sectionName: newSection.sectionName,
          semester: newSection.semester,
          updatedAt: newSection.updatedAt,
          updatedBy: {
            name: user.name,
            userId: user.id,
            role: user.role,
          },
        },
      }, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes("duplicate")) {
        throw createError.conflict("Section with same name already exists for this semester");
      }
      throw error;
    }
  }
);

// GET /api/v1/sections/:id - List sections by semester
sectionsRouter.get(
  "/:id",
  requireAdmin,
  zValidator("param", z.object({ id: z.coerce.number().int().positive() })),
  async (c) => {
    const semester = c.req.valid("param").id;

    try {
      const sectionsWithUpdater = await db
        .select({
          sectionId: sections.sectionId,
          sectionName: sections.sectionName,
          semester: sections.semester,
          updatedAt: sections.updatedAt,
          updatedBy: {
            name: users.name,
            userId: users.id,
            role: users.role,
          },
        })
        .from(sections)
        .leftJoin(users, eq(sections.updatedBy, users.id))
        .where(eq(sections.semester, semester))
        .orderBy(sections.sectionName);

      return c.json({
        data: sectionsWithUpdater,
      });
    } catch (error) {
      throw createError.internalServer("Failed to fetch sections");
    }
  }
);

export { sectionsRouter };