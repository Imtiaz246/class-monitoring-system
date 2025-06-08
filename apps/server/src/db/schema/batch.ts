import { integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { semester } from "./semester";

export const batch = pgTable("batch", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).unique(),
  semesterId: integer("semester_id").references(() => semester.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
