import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class AppError<T> extends HTTPException {
  constructor(
    status: ContentfulStatusCode,
    code: string,
    message: string,
    details?: T
  ) {
    super(status, {
      message: message,
      cause: {
        code: code,
        ...(details ? { details } : {})
      }
    });
  }
}

export const createError = {
  badRequest: (message = 'Bad request') => 
    new AppError(400, errorCodes.BAD_REQUEST, message),

  validationFailed: <T>(message = 'Validation failed', details: T) => 
    new AppError(400, errorCodes.VALIDATION_ERROR, message, details),
  
  unauthorized: (message = 'Unauthorized') => 
    new AppError(401, errorCodes.UNAUTHORIZED, message),
  
  forbidden: (message = 'Forbidden') => new AppError(403, errorCodes.FORBIDDEN, message),
  
  notFound: (message = 'Not found') => new AppError(404, errorCodes.NOT_FOUND, message),
  
  conflict: (message = 'Conflict') => new AppError(409, errorCodes.CONFLICT, message),
  
  unprocessableEntity: (message = 'Unprocessable entity') => 
    new AppError(422, errorCodes.UNPROCESSABLE_ENTITY, message),
  
  internalServer: (message = 'Internal server error') => 
    new AppError(500, errorCodes.INTERNAL_SERVER_ERROR, message),
};

export const errorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;