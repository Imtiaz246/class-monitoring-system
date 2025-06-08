import { date, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const semester = pgTable("semester", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).unique(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});