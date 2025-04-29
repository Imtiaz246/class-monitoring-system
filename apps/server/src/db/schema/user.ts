import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { role } from "./enum";

export const user = pgTable('user', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 255 }),
	email: varchar('email', { length: 255 }).unique(),
	passwordHash: varchar('password_hash', { length: 255 }),
	phone: varchar('phone', { length: 15 }),
	role: role('role'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});