import { integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { classSession } from "./class-session";
import { userProfile } from "./user-profile";

export const classContent = pgTable("class_content", {
  id: serial("id").primaryKey(),
  classSessionId: integer("class_session_id").references(() => classSession.id),
  topicsCovered: varchar("topics_covered", { length: 1000 }),
  notes: text("notes"),
  resources: text("resources"), // Links to slides, documents, etc.
  createdBy: text("created_by").references(() => userProfile.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  updatedBy: text("updated_by").references(() => userProfile.id, {
    onDelete: "set null",
  }),
});