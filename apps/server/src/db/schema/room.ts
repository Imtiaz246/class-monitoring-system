import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const room = pgTable('room', {
  id: serial('id').primaryKey(),
  roomNumber: varchar('room_number', { length: 31 }),
  location: varchar('location', { length: 63 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});