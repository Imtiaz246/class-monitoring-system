import { pgTable, real, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const course = pgTable('course', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }),
  courseCode: varchar('course_code', { length: 63 }),
  creditHours: real('creadit_hours'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});