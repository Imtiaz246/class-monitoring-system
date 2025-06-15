import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class AppError extends HTTPException {
  constructor(
    status: ContentfulStatusCode,
    message: string,
    public code: string = 'UNKNOWN_ERROR'
  ) {
    super(status, { message });
  }
}

export const createError = {
  badRequest: (message: string, code = 'BAD_REQUEST') => 
    new AppError(400, message, code),
  
  unauthorized: (message = 'Unauthorized', code = 'UNAUTHORIZED') => 
    new AppError(401, message, code),
  
  forbidden: (message = 'Forbidden', code = 'FORBIDDEN') => 
    new AppError(403, message, code),
  
  notFound: (message = 'Not found', code = 'NOT_FOUND') => 
    new AppError(404, message, code),
  
  conflict: (message: string, code = 'CONFLICT') => 
    new AppError(409, message, code),
  
  unprocessableEntity: (message: string, code = 'UNPROCESSABLE_ENTITY') => 
    new AppError(422, message, code),
  
  internalServer: (message = 'Internal server error', code = 'INTERNAL_SERVER_ERROR') => 
    new AppError(500, message, code),
};

export const errorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Business Logic
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT_ROOM: 'CONFLICT_ROOM',
  CONFLICT_TEACHER: 'CONFLICT_TEACHER',
  INVALID_TIME_RANGE: 'INVALID_TIME_RANGE',
  TEACHER_NOT_ASSIGNED: 'TEACHER_NOT_ASSIGNED',
  PAST_DATE_NOT_ALLOWED: 'PAST_DATE_NOT_ALLOWED',
  INVALID_SESSION_STATUS: 'INVALID_SESSION_STATUS',
  
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
} as const;