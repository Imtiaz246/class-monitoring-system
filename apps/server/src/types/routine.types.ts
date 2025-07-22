import { z } from '@hono/zod-openapi';
import { dayOfWeekSchema, timeSchema, uuidSchema, DayOfWeekType } from './common.types';

// Base routine data structure
export interface RoutineData {
  routineId: string;
  sectionId: string;
  courseTeacherId: string;
  roomId: string;
  dayOfWeek: DayOfWeekType;
  startTime: string;
  endTime: string;
  updatedBy: string;
  updatedAt: Date;
}

// Response types
export interface RoutineResponse {
  routineId: string;
  sectionId: string;
  courseTeacherId: string;
  roomId: string;
  dayOfWeek: DayOfWeekType;
  startTime: string;
  endTime: string;
  updatedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
    updatedAt: string;
  };
}

export interface RoutineListItem {
  routine: {
    routineId: string;
    dayOfWeek: DayOfWeekType;
    startTime: string;
    endTime: string;
    updatedAt: string;
  };
  section: {
    sectionId: string;
    sectionName: string;
    semester: number;
  };
  batch: {
    batchId: string;
    batchName: string;
  };
  course: {
    courseCode: string;
    courseName: string;
    creditHours: number;
  };
  teacher: {
    userId: string;
    teacherId: string;
    name: string;
    email: string;
    phone: string | null;
    gender: string | null;
    address: string | null;
  };
  room: {
    roomId: string;
    roomName: string;
    location: string | null;
  };
}

export interface RoutineDetailResponse {
  routineId: string;
  section: {
    sectionId: string;
    sectionName: string;
  };
  course: {
    courseCode: string;
    courseName: string;
  };
  teacher: {
    teacherId: string;
    name: string;
    email: string;
  };
  room: {
    roomId: string;
    roomName: string;
  };
  dayOfWeek: DayOfWeekType;
  startTime: string;
  endTime: string;
  updatedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
    updatedAt: string;
  };
}

// Request types
export interface CreateRoutineData {
  sectionId: string;
  courseCode: string;
  teacherId: string;
  roomId: string;
  dayOfWeek: DayOfWeekType;
  startTime: string;
  endTime: string;
}

export interface UpdateRoutineData {
  sectionId?: string;
  courseCode?: string;
  teacherId?: string;
  roomId?: string;
  dayOfWeek?: DayOfWeekType;
  startTime?: string;
  endTime?: string;
}

export interface GetRoutinesQuery {
  page: number;
  limit: number;
  batchId?: string;
  semester?: number;
  courseCode?: string;
  sectionId?: string;
  teacherId?: string;
  dayOfWeek?: DayOfWeekType;
}

// OpenAPI schemas
export const RoutineResponseSchema = z.object({
  routineId: uuidSchema,
  sectionId: uuidSchema,
  courseTeacherId: uuidSchema,
  roomId: uuidSchema,
  dayOfWeek: dayOfWeekSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  updatedBy: z.object({
    id: uuidSchema,
    name: z.string(),
    email: z.string().email(),
    role: z.string(),
    updatedAt: z.string()
  })
});

export const RoutineListResponseSchema = z.object({
  routine: z.object({
    routineId: uuidSchema,
    dayOfWeek: dayOfWeekSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    updatedAt: z.string().datetime()
  }),
  section: z.object({
    sectionId: uuidSchema,
    sectionName: z.string(),
    semester: z.number().int().positive()
  }),
  batch: z.object({
    batchId: uuidSchema,
    batchName: z.string()
  }),
  course: z.object({
    courseCode: z.string(),
    courseName: z.string(),
    creditHours: z.number().int().positive()
  }),
  teacher: z.object({
    userId: uuidSchema,
    teacherId: uuidSchema,
    name: z.string(),
    email: z.string().email(),
    phone: z.string().nullable(),
    gender: z.string().nullable(),
    address: z.string().nullable()
  }),
  room: z.object({
    roomId: uuidSchema,
    roomName: z.string(),
    location: z.string().nullable()
  })
});