import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { batch } from "./batch";
import { section } from "./section";
import { userProfile } from "./user-profile";

export const batchStudents = pgTable("batch_students", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").references(() => batch.id),
  sectionId: integer("section_id").references(() => section.id),
  studentId: text("student_id").references(() => userProfile.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
