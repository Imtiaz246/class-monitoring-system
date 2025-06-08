import { integer, pgEnum, pgTable, real, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { course } from "./course";
import { batch } from "./batch";
import { section } from "./section";
import { userProfile } from "./user-profile";

export const assignmentType = pgEnum("assignment_type", [
  "homework",
  "quiz",
  "midterm",
  "final",
  "project",
  "presentation",
  "other",
]);

export const assignment = pgTable("assignment", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  type: assignmentType("type"),
  courseId: integer("course_id").references(() => course.id),
  batchId: integer("batch_id").references(() => batch.id),
  sectionId: integer("section_id").references(() => section.id),
  totalMarks: real("total_marks"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  createdBy: text("created_by").references(() => userProfile.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const assignmentSubmission = pgTable("assignment_submission", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").references(() => assignment.id),
  studentId: text("student_id").references(() => userProfile.id),
  submissionLink: varchar("submission_link", { length: 1000 }),
  submissionText: text("submission_text"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow(),
  marks: real("marks"),
  feedback: text("feedback"),
  gradedBy: text("graded_by").references(() => userProfile.id),
  gradedAt: timestamp("graded_at", { withTimezone: true }),
});