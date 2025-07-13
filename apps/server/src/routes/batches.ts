import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, batches, users } from "../db";
import { createBatchSchema, updateBatchSchema, getBatchesSchema, uuidParamSchema } from "../utils/validation";
import { requireAdmin } from "../middleware/auth";
import { AppError, createError } from "../utils/errors";
import type { HonoContext } from "../utils/types";
import { eq, sql } from "drizzle-orm";

const batchesRouter = new Hono<HonoContext>();

// Create batch
batchesRouter.post('/', requireAdmin, zValidator("json", createBatchSchema), async (c) => {
  const { batchName } = c.req.valid("json");
  const user = c.get("user")!;
  try {
    const existingBatch = await db
      .select()
      .from(batches)
      .where(eq(batches.batchName, batchName))
      .limit(1);
    if (existingBatch.length > 0) {
      throw createError.conflict("Batch name already exists");
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
        updatedBy: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          updatedAt: newBatch.updatedAt,
        },
      },
    }, 201);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Create batch error:', error);
    throw createError.internalServer('Failed to create batch');
  }
});

// Get batches (open for all)
batchesRouter.get('/', zValidator("query", getBatchesSchema), async (c) => {
  const { page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(batches);
    const batchesWithUpdater = await db
      .select({
        batchId: batches.batchId,
        batchName: batches.batchName,
        updatedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          updatedAt: batches.updatedAt,
        },
      })
      .from(batches)
      .leftJoin(users, eq(batches.updatedBy, users.id))
      .orderBy(batches.updatedAt)
      .limit(limit)
      .offset(offset);

    return c.json({
      data: batchesWithUpdater,
      meta: {
        total: count,
        page: page,
        limit: limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error(error);
    throw createError.internalServer('Failed to fetch batches');
  }
});

// Update batch
batchesRouter.put('/:id', requireAdmin, zValidator("param", uuidParamSchema), zValidator("json", updateBatchSchema), async (c) => {
  const { id: batchId } = c.req.valid("param");
  const { batchName } = c.req.valid("json");
  const user = c.get("user")!;

  try {
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
      throw createError.conflict("Batch name already exists");
    }

    await db
      .update(batches)
      .set({
        batchName,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(batches.batchId, batchId));

    return c.json({ message: 'Batch updated successfully' });
  } catch (error) {
    throw error;
  }
});

export { batchesRouter };