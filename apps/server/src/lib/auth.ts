import { db } from "@/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "@/db/schema/auth-schema";
import { admin } from "better-auth/plugins";
import { ac, roles } from "@/utils/permission";
import { sendVerificationEmail } from "@/services/email/send-verification-email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 60 * 60,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      const link = new URL(url);
      await sendVerificationEmail({
        to: user.email,
        subject: "Verify your email address",
        meta: {
          description:
            "Please verify your email address to complete the registration process.",
          link: String(link),
        },
      });
    },
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
