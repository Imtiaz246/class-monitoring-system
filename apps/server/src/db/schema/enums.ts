import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum('role', [
  'super_admin',
  'chairman', 
  'admin',
  'cr_student',
  'teacher',
  'student',
]);

export const genderEnum = pgEnum('gender', [
  'male',
  'female', 
  'other',
]);

export const dayOfWeekEnum = pgEnum('day_of_week', [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

export const sessionStatusEnum = pgEnum('session_status', [
  'scheduled',
  'delivered',
  'rescheduled',
  'cancelled',
]);