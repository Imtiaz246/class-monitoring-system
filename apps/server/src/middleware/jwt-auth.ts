import type { Context, Next } from 'hono';
import { jwtAuth } from '../lib/jwt-auth';
import { db, users } from '../db';
import { eq } from 'drizzle-orm';
import type { HonoContext, UserRole } from '../utils/types';
import { createError } from '../utils/errors';

// Middleware to extract and verify JWT token
export const authenticateToken = async (c: Context<HonoContext>, next: Next) => {
  const authHeader = c.req.header('Authorization');
  const token = jwtAuth.extractTokenFromHeader(authHeader);

  if (!token) {
    c.set('user', null);
    c.set('session', null);
    await next();
    return;
  }

  const payload = jwtAuth.verifyAccessToken(token);
  if (!payload) {
    c.set('user', null);
    c.set('session', null);
    await next();
    return;
  }

  // Fetch user from database to ensure they still exist and are active
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user || !user.isActive) {
      c.set('user', null);
      c.set('session', null);
      await next();
      return;
    }

    // Set user in context
    c.set('user', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      gender: user.gender,
      phone: user.phone,
      address: user.address,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    
    c.set('session', {
      token,
      userId: user.id,
      expiresAt: new Date(payload.exp * 1000),
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    c.set('user', null);
    c.set('session', null);
  }

  await next();
};

// Middleware to require authentication
export const requireAuth = async (c: Context<HonoContext>, next: Next) => {
  const user = c.get('user');
  
  if (!user) {
    throw createError.unauthorized('Authentication required');
  }
  
  await next();
};

// Middleware to check user roles
export const requireRole = (allowedRoles: UserRole[]) => {
  return async (c: Context<HonoContext>, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      throw createError.unauthorized('Authentication required');
    }
    
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw createError.forbidden('Insufficient permissions');
    }
    
    await next();
  };
};

// Middleware for admin-only access
export const requireAdmin = requireRole(['super_admin', 'chairman', 'admin']);

// Middleware for super admin only
export const requireSuperAdmin = requireRole(['super_admin']);

// Middleware for chairman and above
export const requireChairmanOrAbove = requireRole(['super_admin', 'chairman']);

// Middleware for teacher or admin access
export const requireTeacherOrAdmin = requireRole(['super_admin', 'chairman', 'admin', 'teacher']);

// Middleware to allow self or admin access
export const requireSelfOrAdmin = async (c: Context<HonoContext>, next: Next) => {
  const user = c.get('user');
  const targetUserId = c.req.param('id');
  
  if (!user) {
    throw createError.unauthorized('Authentication required');
  }
  
  const isAdmin = ['super_admin', 'chairman', 'admin', 'teacher'].includes(user.role as UserRole);
  const isSelf = user.id === targetUserId;
  
  if (!isAdmin && !isSelf) {
    throw createError.forbidden('You can only access your own profile');
  }
  
  await next();
};

export const requireCROrTeacher = async (c: Context<HonoContext>, next: Next) => {
  const user = c.get('user');
  
  if (!user) {
    throw createError.unauthorized('Authentication required');
  }
  
  const allowedRoles = ['super_admin', 'chairman', 'admin', 'teacher', 'cr_student'];
  
  if (!allowedRoles.includes(user.role as UserRole)) {
    throw createError.forbidden('Access restricted to teachers, admins, and class representatives');
  }
  
  await next();
};

// Middleware to check if user can modify other users
export const requireUserModificationPermission = (targetRole?: UserRole) => {
  return async (c: Context<HonoContext>, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      throw createError.unauthorized('Authentication required');
    }
    
    const userRole = user.role as UserRole;
    
    // Super admin can modify anyone except other super admins
    if (userRole === 'super_admin') {
      if (targetRole === 'super_admin') {
        throw createError.forbidden('Cannot modify other super admins');
      }
      await next();
      return;
    }
    
    // Chairman can modify admins, teachers, and students
    if (userRole === 'chairman') {
      if (['super_admin', 'chairman'].includes(targetRole || '')) {
        throw createError.forbidden('Cannot modify super admins or other chairmen');
      }
      await next();
      return;
    }
    
    // Admin can modify teachers and students
    if (userRole === 'admin') {
      if (['super_admin', 'chairman', 'admin'].includes(targetRole || '')) {
        throw createError.forbidden('Cannot modify super admins, chairmen, or other admins');
      }
      await next();
      return;
    }
    
    // Teachers and students cannot modify other users
    throw createError.forbidden('Insufficient permissions to modify users');
  };
};