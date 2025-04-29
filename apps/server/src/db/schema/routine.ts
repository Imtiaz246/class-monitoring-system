import { integer, pgTable, serial, time, timestamp } from "drizzle-orm/pg-core";
import { batch } from "./batch";
import { section } from "./section";
import { course } from "./course";
import { user } from "./user";
import { room } from "./room";
import { dayOfWeek } from "./enum";

export const routine = pgTable('routine', {
  id: serial('id').primaryKey(),
  batchId: integer('batch_id').references(() => batch.id),
  sectionId: integer('section_id').references(() => section.id),
  courseId: integer('course_id').references(() => course.id),
  teacherId: integer('teacher_id').references(() => user.id),
  roomId: integer('room_id').references(() => room.id),
  dayOfWeek: dayOfWeek('day_of_week'),
  startTime: time('start_time', { withTimezone: false }),
  endTime: time('end_time', { withTimezone: false }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: integer('updated_by').references(() => user.id),
});