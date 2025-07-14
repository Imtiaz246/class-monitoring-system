import { z } from '@hono/zod-openapi';
import { uuidSchema, roleSchema, genderSchema } from './common.types';

// Section input/creation schemas
export const createSectionSchema = z.object({
  sectionName: z.string().min(1, "Section name is required"),
  semester: z.number().int().positive("Semester must be greater than 0"),
  batchId: uuidSchema,
});



// Zod schemas for responses
export const SectionResponseSchema = z.object({
  sectionId: z.string().uuid().openapi({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the section'
  }),
  sectionName: z.string().openapi({
    example: 'Section A',
    description: 'Name of the section'
  }),
  semester: z.number().int().positive().openapi({
    example: 1,
    description: 'Semester number'
  }),
  batchId: z.string().uuid().openapi({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'Unique identifier for the batch'
  }),
  updatedBy: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    role: roleSchema,
    updatedAt: z.string().datetime(),
  }).openapi({
    description: 'Information about the user who last updated this section'
  }),
});

export const SectionWithBatchSchema = z.object({
  sectionId: z.string().uuid().openapi({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the section'
  }),
  sectionName: z.string().openapi({
    example: 'Section A',
    description: 'Name of the section'
  }),
  semester: z.number().int().positive().openapi({
    example: 1,
    description: 'Semester number'
  }),
  batch: z.object({
    batchId: z.string().uuid(),
    batchName: z.string(),
  }).nullable().openapi({
    description: 'Batch information associated with this section'
  }),
  updatedBy: z.object({
    id: z.string().uuid().nullable(),
    name: z.string().nullable(),
    email: z.string().email().nullable(),
    role: roleSchema.nullable(),
    updatedAt: z.string().datetime().nullable(),
  }).nullable().openapi({
    description: 'Information about the user who last updated this section'
  }),
});

export const CreateSectionResponseSchema = z.object({
  message: z.string().openapi({
    example: 'Section created successfully',
    description: 'Success message'
  }),
  data: SectionResponseSchema,
});

export const SectionsListResponseSchema = z.object({
  data: z.array(SectionWithBatchSchema).openapi({
    description: 'List of sections with batch information'
  }),
});

// Inferred TypeScript types
export type CreateSectionData = z.infer<typeof createSectionSchema>;
export type SectionResponse = z.infer<typeof CreateSectionResponseSchema>;
export type SectionWithBatch = z.infer<typeof SectionWithBatchSchema>;
export type CreateSectionResponse = z.infer<typeof CreateSectionResponseSchema>;
export type SectionsListResponse = z.infer<typeof SectionsListResponseSchema>;