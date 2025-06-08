import { boolean, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { classSession } from "./class-session";
import { userProfile } from "./user-profile";

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  classSessionId: integer("class_session_id").references(() => classSession.id),
  studentId: text("student_id").references(() => userProfile.id),
  isPresent: boolean("is_present").default(false),
  remarks: varchar("remarks", { length: 255 }),
  markedBy: text("marked_by").references(() => userProfile.id),
  markedAt: timestamp("marked_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  updatedBy: text("updated_by").references(() => userProfile.id, {
    onDelete: "set null",
  }),
});