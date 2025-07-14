import { z } from '@hono/zod-openapi';
import { paginationSchema } from './common.types';

// Batch query schemas
export const getBatchesSchema = paginationSchema;

// Batch input/creation schemas
export const createBatchSchema = z.object({
  batchName: z.string().min(1, "Batch name is required").openapi({
    example: 'Batch 2024',
    description: 'Name of the batch'
  }),
});

export const updateBatchSchema = z.object({
  batchName: z.string().min(1, "Batch name is required").openapi({
    example: 'Updated Batch 2024',
    description: 'Updated name of the batch'
  }),
});



// Batch response schemas
export const BatchResponseSchema = z.object({
  batchId: z.string().uuid(),
  batchName: z.string(),
  updatedBy: z.object({
    id: z.string().uuid().nullable(),
    name: z.string().nullable(),
    email: z.string().email().nullable(),
    role: z.string().nullable(),
    updatedAt: z.string().datetime(),
  }),
});

export const BatchListResponseSchema = z.object({
  data: z.array(BatchResponseSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

export const BatchCreateResponseSchema = z.object({
  message: z.string(),
  data: BatchResponseSchema,
});

export const BatchUpdateResponseSchema = z.object({
  message: z.string(),
});

// Inferred TypeScript types
export type GetBatchesQuery = z.infer<typeof getBatchesSchema>;
export type CreateBatchData = z.infer<typeof createBatchSchema>;
export type UpdateBatchData = z.infer<typeof updateBatchSchema>;
export type BatchResponse = z.infer<typeof BatchResponseSchema>;
export type BatchListResponse = z.infer<typeof BatchListResponseSchema>;
export type BatchCreateResponse = z.infer<typeof BatchCreateResponseSchema>;
export type BatchUpdateResponse = z.infer<typeof BatchUpdateResponseSchema>;