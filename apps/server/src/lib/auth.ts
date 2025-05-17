import { db } from "@/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "@/db/schema/auth-schema";
import { admin } from "better-auth/plugins";
import { ac, roles } from "@/utils/permission";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  plugins: [
    admin({
      defaultRole: "STUDENT",
      adminRoles: ["ADMIN", "SUPER_ADMIN", "CHAIRMAN"],
      ac: ac,
      roles: roles,
    }),
  ],
});
