import { relations } from "drizzle-orm";
import { users, refreshTokens, userSessions } from "./auth";
import { 
  courses, 
  rooms, 
  batches, 
  sections, 
  studentProfiles, 
  teacherProfiles, 
  courseTeacher 
} from "./core";
import { 
  routines, 
  classSessions, 
  bookedRooms, 
  bookedTeachers 
} from "./sessions";

// Export all tables
export {
  users,
  refreshTokens,
  userSessions,
  courses,
  rooms,
  batches,
  sections,
  studentProfiles,
  teacherProfiles,
  courseTeacher,
  routines,
  classSessions,
  bookedRooms,
  bookedTeachers,
};

// Export enums
export * from "./enums";

// Define relations
// Note: Basic usersRelations, refreshTokensRelations, and userSessionsRelations are defined in auth.ts
// Extended usersRelations with core table relations defined here to avoid circular imports
export const usersRelations = relations(users, ({ many, one }) => ({
  refreshTokens: many(refreshTokens),
  sessions: many(userSessions),
  studentProfile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId],
  }),
  teacherProfile: one(teacherProfiles, {
    fields: [users.id],
    references: [teacherProfiles.userId],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const batchesRelations = relations(batches, ({ many, one }) => ({
  sections: many(sections),
  studentProfiles: many(studentProfiles),
  updatedByUser: one(users, {
    fields: [batches.updatedBy],
    references: [users.id],
  }),
}));

export const sectionsRelations = relations(sections, ({ many, one }) => ({
  batch: one(batches, {
    fields: [sections.batchId],
    references: [batches.batchId],
  }),
  studentProfiles: many(studentProfiles),
  routines: many(routines),
  updatedByUser: one(users, {
    fields: [sections.updatedBy],
    references: [users.id],
  }),
}));

export const studentProfilesRelations = relations(studentProfiles, ({ one }) => ({
  user: one(users, {
    fields: [studentProfiles.userId],
    references: [users.id],
  }),
  batch: one(batches, {
    fields: [studentProfiles.batchId],
    references: [batches.batchId],
  }),
  section: one(sections, {
    fields: [studentProfiles.sectionId],
    references: [sections.sectionId],
  }),
  updatedByUser: one(users, {
    fields: [studentProfiles.updatedBy],
    references: [users.id],
  }),
}));

export const teacherProfilesRelations = relations(teacherProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [teacherProfiles.userId],
    references: [users.id],
  }),
  courseTeachers: many(courseTeacher),
  bookedTeachers: many(bookedTeachers),
  updatedByUser: one(users, {
    fields: [teacherProfiles.updatedBy],
    references: [users.id],
  }),
}));

export const coursesRelations = relations(courses, ({ many, one }) => ({
  courseTeachers: many(courseTeacher),
  updatedByUser: one(users, {
    fields: [courses.updatedBy],
    references: [users.id],
  }),
}));

export const courseTeacherRelations = relations(courseTeacher, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseTeacher.courseCode],
    references: [courses.courseCode],
  }),
  teacher: one(teacherProfiles, {
    fields: [courseTeacher.teacherId],
    references: [teacherProfiles.teacherId],
  }),
  routines: many(routines),
  updatedByUser: one(users, {
    fields: [courseTeacher.updatedBy],
    references: [users.id],
  }),
}));

export const roomsRelations = relations(rooms, ({ many, one }) => ({
  routines: many(routines),
  bookedRooms: many(bookedRooms),
  updatedByUser: one(users, {
    fields: [rooms.updatedBy],
    references: [users.id],
  }),
}));

export const routinesRelations = relations(routines, ({ one, many }) => ({
  section: one(sections, {
    fields: [routines.sectionId],
    references: [sections.sectionId],
  }),
  courseTeacher: one(courseTeacher, {
    fields: [routines.courseTeacherId],
    references: [courseTeacher.courseTeacherId],
  }),
  room: one(rooms, {
    fields: [routines.roomId],
    references: [rooms.roomId],
  }),
  classSessions: many(classSessions),
  updatedByUser: one(users, {
    fields: [routines.updatedBy],
    references: [users.id],
  }),
}));

export const classSessionsRelations = relations(classSessions, ({ one, many }) => ({
  routine: one(routines, {
    fields: [classSessions.routineId],
    references: [routines.routineId],
  }),
  bookedRooms: many(bookedRooms),
  bookedTeachers: many(bookedTeachers),
  updatedByUser: one(users, {
    fields: [classSessions.updatedBy],
    references: [users.id],
  }),
}));

export const bookedRoomsRelations = relations(bookedRooms, ({ one }) => ({
  session: one(classSessions, {
    fields: [bookedRooms.sessionId],
    references: [classSessions.sessionId],
  }),
  room: one(rooms, {
    fields: [bookedRooms.roomId],
    references: [rooms.roomId],
  }),
  bookedByUser: one(users, {
    fields: [bookedRooms.bookedBy],
    references: [users.id],
  }),
}));

export const bookedTeachersRelations = relations(bookedTeachers, ({ one }) => ({
  session: one(classSessions, {
    fields: [bookedTeachers.sessionId],
    references: [classSessions.sessionId],
  }),
  teacher: one(teacherProfiles, {
    fields: [bookedTeachers.teacherId],
    references: [teacherProfiles.teacherId],
  }),
  bookedByUser: one(users, {
    fields: [bookedTeachers.bookedBy],
    references: [users.id],
  }),
}));