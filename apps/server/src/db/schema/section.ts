import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { batch } from "./batch";

export const section = pgTable('section', {
  id: serial('id').primaryKey(),
  batchId: integer('batch_id').references(() => batch.id),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});