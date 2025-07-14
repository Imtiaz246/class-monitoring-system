import { z } from 'zod';
import { createSectionSchema } from '../utils/validation';

// Input types
export type CreateSectionData = z.infer<typeof createSectionSchema>;

// Response types
export interface SectionResponse {
  message: string;
  data: {
    sectionId: string;
    sectionName: string;
    semester: number;
    batchId: string;
    updatedBy: {
      id: string;
      name: string;
      email: string;
      role: 'super_admin' | 'chairman' | 'admin' | 'cr_student' | 'teacher' | 'student';
      updatedAt: string;
    };
  };
}

export interface SectionWithBatch {
  sectionId: string;
  sectionName: string;
  semester: number;
  batch: {
    batchId: string;
    batchName: string;
  } | null;
  updatedBy: {
    id: string | null;
    name: string | null;
    email: string | null;
    role: 'super_admin' | 'chairman' | 'admin' | 'cr_student' | 'teacher' | 'student' | null;
    updatedAt: string | null;
  } | null;
}

export interface SectionsListResponse {
  data: SectionWithBatch[];
}