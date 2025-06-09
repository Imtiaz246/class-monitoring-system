import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { HonoContext } from "@/utils/types";

// Define allowed roles for different operations
type Operation = "create" | "read" | "update" | "delete";

const rolePermissions: Record<string, Operation[]> = {
  super_admin: ["create", "read", "update", "delete"],
  chairman: ["create", "read", "update", "delete"],
  admin: ["create", "read", "update", "delete"],
  teacher: ["read", "update"],
  cr_student: ["read", "update"],
  student: ["read"],
};

// Check if a role has permission for a specific operation
const hasPermission = (role: string | null | undefined, operation: Operation): boolean => {
  if (!role || !rolePermissions[role]) return false;
  return rolePermissions[role].includes(operation);
};

// Middleware factory to check role permissions
export const checkRole = (operation: Operation) =>
  createMiddleware<HonoContext>(async (ctx, next) => {
    const user = ctx.get("user");
    
    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }
    
    // Get user profile to check role
    const userRole = user.role;
    
    if (!hasPermission(userRole, operation)) {
      throw new HTTPException(403, { message: "Forbidden: Insufficient permissions" });
    }
    
    await next();
  });

// Convenience exports for common operations
export const canCreate = checkRole("create");
export const canRead = checkRole("read");
export const canUpdate = checkRole("update");
export const canDelete = checkRole("delete");