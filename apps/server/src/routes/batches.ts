import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, batches, users } from "../db";
import { createBatchSchema, updateBatchSchema, getBatchesSchema, uuidSchema } from "../utils/validation";
import { requireAdmin } from "../middleware/auth";
import { createError } from "../utils/errors";
import type { HonoContext } from "../utils/types";
import { eq } from "drizzle-orm";
import { z } from "zod";

const batchesRouter = new Hono<HonoContext>();

// POST /api/v1/batches - Create a batch
batchesRouter.post(
  "/",
  requireAdmin,
  zValidator("json", createBatchSchema),
  async (c) => {
    const { batchName } = c.req.valid("json");
    const user = c.get("user")!;

    try {
      // Check if batch name already exists
      const existingBatch = await db
        .select()
        .from(batches)
        .where(eq(batches.batchName, batchName))
        .limit(1);

      if (existingBatch.length > 0) {
        throw createError.conflict(
          "Batch name already exists",
          "DUPLICATE_BATCH_NAME"
        );
      }

      const [newBatch] = await db
        .insert(batches)
        .values({
          batchName,
          updatedBy: user.id,
        })
        .returning();

      return c.json({
        data: {
          batchId: newBatch.batchId,
          batchName: newBatch.batchName,
          updatedAt: newBatch.updatedAt,
          updatedBy: {
            name: user.name,
            userId: user.id,
            role: user.role,
          },
        },
      }, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes("duplicate")) {
        throw createError.conflict(
          "Batch name already exists",
          "DUPLICATE_BATCH_NAME"
        );
      }
      throw error;
    }
  }
);

// GET /api/v1/batches - List batches
batchesRouter.get(
  "/",
  requireAdmin,
  zValidator("query", getBatchesSchema),
  async (c) => {
    const { page, limit } = c.req.valid("query");
    const offset = (page - 1) * limit;

    try {
      const batchesWithUpdater = await db
        .select({
          batchId: batches.batchId,
          batchName: batches.batchName,
          updatedAt: batches.updatedAt,
          updatedBy: {
            name: users.name,
            userId: users.id,
            role: users.role,
          },
        })
        .from(batches)
        .leftJoin(users, eq(batches.updatedBy, users.id))
        .limit(limit)
        .offset(offset)
        .orderBy(batches.updatedAt);

      return c.json({
        data: batchesWithUpdater,
      });
    } catch (error) {
      throw createError.internalServer("Failed to fetch batches");
    }
  }
);

// PUT /api/v1/batches/:id - Update batch
batchesRouter.put(
  "/:id",
  requireAdmin,
  zValidator("param", z.object({ id: uuidSchema })),
  zValidator("json", updateBatchSchema),
  async (c) => {
    const { id: batchId } = c.req.valid("param");
    const { batchName } = c.req.valid("json");
    const user = c.get("user")!;

    try {
      // Check if batch exists
      const existingBatch = await db
        .select()
        .from(batches)
        .where(eq(batches.batchId, batchId))
        .limit(1);

      if (existingBatch.length === 0) {
        throw createError.notFound("Batch not found");
      }

      // Check if new batch name already exists (excluding current batch)
      const duplicateBatch = await db
        .select()
        .from(batches)
        .where(eq(batches.batchName, batchName))
        .limit(1);

      if (duplicateBatch.length > 0 && duplicateBatch[0].batchId !== batchId) {
        throw createError.conflict(
          "Batch name already exists",
          "DUPLICATE_BATCH_NAME"
        );
      }

      const [updatedBatch] = await db
        .update(batches)
        .set({
          batchName,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(batches.batchId, batchId))
        .returning();

      return c.json({
        data: {
          batchId: updatedBatch.batchId,
          batchName: updatedBatch.batchName,
          updatedAt: updatedBatch.updatedAt,
          updatedBy: {
            name: user.name,
            userId: user.id,
            role: user.role,
          },
        },
      });
    } catch (error) {
      throw error;
    }
  }
);

export { batchesRouter };