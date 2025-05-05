import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { role } from "./enum";
import { user } from "./auth-schema";

export const userProfile = pgTable("user_profile", {
  id: text("id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 8 }).unique(),
  phone: varchar("phone", { length: 15 }),
  role: role("role"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
