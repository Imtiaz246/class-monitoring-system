import type { Context, Next } from "hono";
import type { HonoContext, UserRole } from "../utils/types";
import { createError } from "../utils/errors";

// Middleware to require authentication
export const requireAuth = async (c: Context<HonoContext>, next: Next) => {
  const user = c.get("user");
  
  if (!user) {
    throw createError.unauthorized("Authentication required");
  }
  
  await next();
};

// Middleware to check user roles
export const requireRole = (allowedRoles: UserRole[]) => {
  return async (c: Context<HonoContext>, next: Next) => {
    const user = c.get("user");
    
    if (!user) {
      throw createError.unauthorized("Authentication required");
    }
    
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw createError.forbidden("Insufficient permissions");
    }
    
    await next();
  };
};

// Predefined role middleware
export const requireAdmin = requireRole(['super_admin', 'chairman', 'admin']);
export const requireSuperAdmin = requireRole(['super_admin']);
export const requireTeacherOrAdmin = requireRole(['super_admin', 'chairman', 'admin', 'teacher']);
export const requireCROrTeacher = requireRole(['super_admin', 'chairman', 'admin', 'teacher', 'cr_student']);

// Middleware to check if user can access their own profile or is admin
export const requireSelfOrAdmin = async (c: Context<HonoContext>, next: Next) => {
  const user = c.get("user");
  const targetUserId = c.req.param("id");
  
  if (!user) {
    throw createError.unauthorized("Authentication required");
  }
  
  const isAdmin = ['super_admin', 'chairman', 'admin', 'teacher'].includes(user.role as UserRole);
  const isSelf = user.id === targetUserId;
  
  if (!isAdmin && !isSelf) {
    throw createError.forbidden("You can only access your own profile");
  }
  
  await next();
};