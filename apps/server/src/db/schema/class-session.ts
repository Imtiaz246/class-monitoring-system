import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { routine } from "./routine";
import { batch } from "./batch";
import { section } from "./section";
import { course } from "./course";
import { userProfile } from "./user-profile";
import { room } from "./room";
import { sessionStatus } from "./enum";

export const classSession = pgTable("class_session", {
  id: serial("id").primaryKey(),
  routineId: integer("routine_id").references(() => routine.id),
  batchId: integer("batch_id").references(() => batch.id),
  sectionId: integer("section_id").references(() => section.id),
  courseId: integer("course_id").references(() => course.id),
  teacherId: text("teacher_id").references(() => userProfile.id),
  roomid: integer("room_id").references(() => room.id),
  originalScheduledAt: timestamp("original_schedule_at", {
    withTimezone: true,
  }),
  actualScheduledAt: timestamp("actual_scheduled_at", { withTimezone: true }),
  session_status: sessionStatus("session_status"),
  rescheduleOrCancelReason: varchar("reschedule_or_cancel_reason", {
    length: 2047,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  updatedBy: text("updated_by").references(() => userProfile.id, {
    onDelete: "set null",
  }),
});
