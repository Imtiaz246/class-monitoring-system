import { pgTable, uuid, timestamp, time, text, integer } from "drizzle-orm/pg-core";
import { dayOfWeekEnum, sessionStatusEnum } from "./enums";
import { users } from "./auth";
import { sections, rooms, courseTeacher, teacherProfiles } from "./core";

export const routines = pgTable("routines", {
  routineId: uuid("routine_id").primaryKey().defaultRandom(),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => sections.sectionId),
  courseTeacherId: uuid("course_teacher_id")
    .notNull()
    .references(() => courseTeacher.courseTeacherId),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.roomId),
  dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: uuid("updated_by")
    .notNull()
    .references(() => users.id),
});

export const classSessions = pgTable("class_sessions", {
  sessionId: uuid("session_id").primaryKey().defaultRandom(),
  routineId: uuid("routine_id")
    .notNull()
    .references(() => routines.routineId),
  sessionDate: timestamp("session_date").notNull(),
  originalScheduleAt: timestamp("original_schedule_at").notNull(),
  actualScheduleAt: timestamp("actual_schedule_at"),
  sessionStatus: sessionStatusEnum("session_status").notNull().default('scheduled'),
  rescheduleOrCancelReason: text("reschedule_or_cancel_reason"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: uuid("updated_by")
    .references(() => users.id),
});

export const bookedRooms = pgTable("booked_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => classSessions.sessionId, { onDelete: "cascade" }),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.roomId),
  bookedDate: timestamp("booked_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  bookedAt: timestamp("booked_at").notNull().defaultNow(),
  bookedBy: uuid("booked_by")
    .notNull()
    .references(() => users.id),
});

export const bookedTeachers = pgTable("booked_teachers", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => classSessions.sessionId, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teacherProfiles.teacherId),
  bookedDate: timestamp("booked_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  bookedAt: timestamp("booked_at").notNull().defaultNow(),
  bookedBy: uuid("booked_by")
    .notNull()
    .references(() => users.id),
});