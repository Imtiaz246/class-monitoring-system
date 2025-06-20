import type { User } from "../db/schema/auth";

export interface JWTSession {
  token: string;
  userId: string;
  expiresAt: Date;
}

export interface HonoContext {
  Variables: {
    user: Omit<User, 'password'> | null;
    session: JWTSession | null;
  };
}

export type UserRole = 'super_admin' | 'chairman' | 'admin' | 'teacher' | 'cr_student' | 'student';

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