// This file is deprecated - use ../middleware/jwt-auth.ts instead
// Keeping for backward compatibility during migration

import type { Context, Next } from "hono";
import type { HonoContext, UserRole } from "../utils/types";
import { createError } from "../utils/errors";

// Re-export from jwt-auth for backward compatibility
export { 
  requireAuth,
  requireRole,
  requireAdmin,
  requireSelfOrAdmin,
  requireSuperAdmin,
  requireChairmanOrAbove,
  requireTeacherOrAdmin,
  requireCROrTeacher,
  requireUserModificationPermission
} from "./jwt-auth";