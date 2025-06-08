import { loggedIn } from "@/middleware/logged-in";
import type { HonoContext } from "@/utils/types";
import { Hono } from "hono";
import { z } from "zod";

const app = new Hono<HonoContext>();

const DayOfWeekEnum = z.enum([
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
]);

const routineSchema = z.object({
  batchId: z.number(),
  sectionId: z.number(),
  courseId: z.number(),
  teacherId: z.number(),
  roomId: z.number(),
  dayOfWeek: z
    .string()
    .transform((el) => el.toLowerCase())
    .pipe(DayOfWeekEnum),
  startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  updatedBy: z.string().optional(),
});

export const routineRouter = app.post("/", loggedIn, async (c) => {
  const body = await c.req.json();
  const parsedBody = routineSchema.safeParse(body);
  if (!parsedBody.success) {
    return c.json({ error: parsedBody.error.flatten() }, 400);
  }

  return c.json({ success: true });
});
