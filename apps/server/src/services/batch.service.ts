import { db, batches, users } from '../db';
import { createError } from '../utils/errors';
import { eq, sql } from 'drizzle-orm';
import type { CreateBatchData, UpdateBatchData, GetBatchesQuery } from '../types/batch.types.ts';

export class BatchService {
  static async createBatch(data: CreateBatchData, updatedById: string) {
    const { batchName } = data;

    // Check if batch name already exists
    const [existingBatch] = await db
      .select()
      .from(batches)
      .where(eq(batches.batchName, batchName))
      .limit(1);

    if (existingBatch) {
      throw createError.conflict('Batch name already exists');
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

    // Create new batch
    const [newBatch] = await db
      .insert(batches)
      .values({
        batchName,
        updatedBy: updatedById,
      })
      .returning();

    return {
      message: 'Batch created successfully',
      data: {
        batchId: newBatch.batchId,
        batchName: newBatch.batchName,
        updatedBy: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          updatedAt: newBatch.updatedAt.toISOString(),
        },
      },
    };
  }

  static async getAllBatches(query: GetBatchesQuery) {
    const { page, limit } = query;
    const offset = (page - 1) * limit;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(batches);

    // Get batches with updater info
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

    // Transform the data to ensure proper serialization
    const transformedBatches = batchesWithUpdater.map(batch => ({
      batchId: batch.batchId,
      batchName: batch.batchName,
      updatedBy: {
        id: batch.updatedBy.id,
        name: batch.updatedBy.name,
        email: batch.updatedBy.email,
        role: batch.updatedBy.role,
        updatedAt: batch.updatedBy.updatedAt.toISOString(),
      },
    }));

    return {
      data: transformedBatches,
      meta: {
        total: count,
        page: page,
        limit: limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  static async updateBatch(batchId: string, data: UpdateBatchData, updatedById: string) {
    const { batchName } = data;

    // Check if batch exists
    const [existingBatch] = await db
      .select()
      .from(batches)
      .where(eq(batches.batchId, batchId))
      .limit(1);

    if (!existingBatch) {
      throw createError.notFound('Batch not found');
    }

    // Check if new batch name already exists (excluding current batch)
    const [duplicateBatch] = await db
      .select()
      .from(batches)
      .where(eq(batches.batchName, batchName))
      .limit(1);

    if (duplicateBatch && duplicateBatch.batchId !== batchId) {
      throw createError.conflict('Batch name already exists');
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

    // Update batch
    const [updatedBatch] = await db
      .update(batches)
      .set({
        batchName,
        updatedBy: updatedById,
        updatedAt: new Date(),
      })
      .where(eq(batches.batchId, batchId))
      .returning();

    return {
      message: 'Batch updated successfully',
      data: {
        batchId: updatedBatch.batchId,
        batchName: updatedBatch.batchName,
        updatedBy: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          updatedAt: updatedBatch.updatedAt.toISOString(),
        },
      },
    };
  }

}