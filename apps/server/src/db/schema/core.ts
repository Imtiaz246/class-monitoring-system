import { pgTable, text, doublePrecision, integer, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

export const courses = pgTable("courses", {
  courseCode: text("course_code").primaryKey(),
  courseName: text("course_name").notNull().unique(),
  creditHours: doublePrecision("credit_hours").notNull(),
  semester: integer("semester").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by")
    .notNull()
    .references(() => users.id),
});

export const rooms = pgTable("rooms", {
  roomId: uuid("room_id").primaryKey().defaultRandom(),
  roomName: text("room_name").notNull(),
  location: text("location").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by")
    .notNull()
    .references(() => users.id),
});

export const batches = pgTable("batches", {
  batchId: uuid("batch_id").primaryKey().defaultRandom(),
  batchName: text("batch_name").notNull().unique(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by")
    .notNull()
    .references(() => users.id),
});

export const sections = pgTable("sections", {
  sectionId: uuid("section_id").primaryKey().defaultRandom(),
  sectionName: text("section_name").notNull(),
  semester: integer("semester").notNull(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.batchId),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by")
    .notNull()
    .references(() => users.id),
});

export const studentProfiles = pgTable("student_profiles", {
  studentId: text("student_id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  semester: integer("semester").notNull(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.batchId),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => sections.sectionId),
  priority: integer("priority").notNull().default(1), // 0 = CR, 1 = normal student
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by")
    .notNull()
    .references(() => users.id),
});

export const teacherProfiles = pgTable("teacher_profiles", {
  teacherId: uuid("teacher_id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  isGuestTeacher: boolean("is_guest_teacher").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by")
    .notNull()
    .references(() => users.id),
});

export const courseTeacher = pgTable("course_teacher", {
  courseTeacherId: uuid("course_teacher_id").primaryKey().defaultRandom(),
  courseCode: text("course_code")
    .notNull()
    .references(() => courses.courseCode),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teacherProfiles.teacherId),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by")
    .notNull()
    .references(() => users.id),
});