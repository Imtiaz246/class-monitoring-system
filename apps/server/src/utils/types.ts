import type { User, Session } from "../lib/auth";

export interface HonoContext {
  Variables: {
    user: User | null;
    session: Session | null;
  };
}

export type UserRole = 'super_admin' | 'chairman' | 'admin' | 'cr_student' | 'teacher' | 'student';

export type Gender = 'male' | 'female' | 'other';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type SessionStatus = 'delivered' | 'rescheduled' | 'cancelled';

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}