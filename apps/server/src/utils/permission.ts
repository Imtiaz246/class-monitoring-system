import { createAccessControl } from "better-auth/plugins/access";

const statements = {
  permission: ["create", "read", "update", "delete"],
};

export const ac = createAccessControl(statements);

export const roles = {
  SUPER_ADMIN: ac.newRole({
    permission: ["create", "read", "update", "delete"],
  }),
  CHAIRMAN: ac.newRole({
    permission: ["create", "read", "update", "delete"],
  }),
  ADMIN: ac.newRole({
    permission: ["create", "read", "update", "delete"],
  }),
  TEACHER: ac.newRole({
    permission: ["read", "update"],
  }),
  CR_STUDENT: ac.newRole({
    permission: ["read", "update"],
  }),
  STUDENT: ac.newRole({
    permission: ["read"],
  }),
};
