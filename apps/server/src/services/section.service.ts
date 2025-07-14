import { db, sections, users, batches } from '../db';
import { createError, AppError } from '../utils/errors';
import { eq, and } from 'drizzle-orm';
import type { CreateSectionData, SectionResponse, SectionsListResponse } from '../types/section.types.ts';

export class SectionService {
  static async createSection(data: CreateSectionData, userId: string): Promise<SectionResponse> {
    const { sectionName, semester, batchId } = data;

    try {
      // Check if section with same name and semester already exists
      const existingSection = await db
        .select()
        .from(sections)
        .where(and(
          eq(sections.sectionName, sectionName),
          eq(sections.semester, semester),
          eq(sections.batchId, batchId)
        ))
        .limit(1);

      if (existingSection.length > 0) {
        if (existingSection[0].semester !== semester) {
          throw createError.conflict("Batch was assigned to another semester");
        }
        throw createError.conflict("Section with same name already exists for this semester");
      }

      // Get user details for response
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw createError.unauthorized('User not found');
      }

      const [newSection] = await db
        .insert(sections)
        .values({
          sectionName: sectionName,
          semester: semester,
          batchId: batchId,
          updatedBy: userId,
        })
        .returning();

      return {
        message: 'Section created successfully',
        data: {
          sectionId: newSection.sectionId,
          sectionName: newSection.sectionName,
          semester: newSection.semester,
          batchId: newSection.batchId,
          updatedBy: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            updatedAt: newSection.updatedAt.toISOString(),
          },
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Create section error:', error);
      throw createError.internalServer('Failed to create section');
    }
  }

  static async getSectionsByBatchId(batchId: string): Promise<SectionsListResponse> {
    try {
      // Check if batch exists
      const existingBatch = await db
        .select()
        .from(batches)
        .where(eq(batches.batchId, batchId))
        .limit(1);

      if (existingBatch.length === 0) {
        throw createError.notFound('Batch not found');
      }

      const sectionsWithUpdater = await db
        .select({
          sectionId: sections.sectionId,
          sectionName: sections.sectionName,
          semester: sections.semester,
          updatedBy: {
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            updatedAt: sections.updatedAt,
          },
        })
        .from(sections)
        .leftJoin(users, eq(sections.updatedBy, users.id))
        .where(eq(sections.batchId, batchId))
        .orderBy(sections.sectionName);

      // Transform the response to add batch information and convert dates
      const transformedSections = sectionsWithUpdater.map(section => ({
        ...section,
        batch: {
          batchId: existingBatch[0].batchId,
          batchName: existingBatch[0].batchName,
        },
        updatedBy: section.updatedBy ? {
          ...section.updatedBy,
          updatedAt: section.updatedBy.updatedAt.toISOString(),
        } : null,
      }));

      return {
        data: transformedSections,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Get sections error:', error);
      throw createError.internalServer("Failed to fetch sections");
    }
  }
}