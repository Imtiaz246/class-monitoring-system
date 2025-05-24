import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const batch = pgTable("batch", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
