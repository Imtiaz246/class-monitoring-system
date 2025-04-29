import { pgEnum } from "drizzle-orm/pg-core";

export const role = pgEnum('role', [
  'super_admin',
  'chairman',
  'admin',
  'teacher',
  'cr_student',
  'student',
]);

export const dayOfWeek = pgEnum('day_of_week', [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
]);

export const sessionStatus = pgEnum('session_status', [
  'scheduled',
  'completed',
  'canceled',
  're_scheduled',
]);