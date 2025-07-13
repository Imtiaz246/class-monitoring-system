import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createBatchSchema, updateBatchSchema, getBatchesSchema, uuidParamSchema } from "../utils/validation";
import { requireAdmin } from "../middleware/auth";
import { AppError, createError } from "../utils/errors";
import type { HonoContext } from "../utils/types";
import { BatchService } from "../services/batch.service";

const batchesRouter = new Hono<HonoContext>();

// Create batch
batchesRouter.post('/', requireAdmin, zValidator("json", createBatchSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const user = c.get("user")!;
    const result = await BatchService.createBatch(data, user.id);
    return c.json(result, 201);
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
  try {
    const query = c.req.valid('query');
    const result = await BatchService.getAllBatches(query);
    return c.json(result, 200);
  } catch (error) {
    console.error('Get batches error:', error);
    throw createError.internalServer('Failed to fetch batches');
  }
});

// Update batch
batchesRouter.put('/:id', requireAdmin, zValidator("param", uuidParamSchema), zValidator("json", updateBatchSchema), async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const user = c.get("user")!;
    const result = await BatchService.updateBatch(id, data, user.id);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Update batch error:', error);
    throw createError.internalServer('Failed to update batch');
  }
});

export { batchesRouter };