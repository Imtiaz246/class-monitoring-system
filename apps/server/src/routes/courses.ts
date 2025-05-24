import { db } from "@/db";
import { course } from "@/db/schema/course";
import { loggedIn } from "@/middleware/logged-in";
import { PG_ERROR } from "@/utils/pg-error";
import type { HonoContext } from "@/utils/types";
import { Hono } from "hono";
import { z } from "zod";

const app = new Hono<HonoContext>();

const courseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name must be non empty." })
    .max(64, { message: "Name can't exceed 64 characters long." }),
  courseCode: z
    .string()
    .trim()
    .min(1, { message: "Course code must be non empty." })
    .max(16, { message: "Course code can't exceed 16 characters long." }),
  creditHours: z.number().gte(0.5).lte(10),
});

export const courseRouter = app.post("/", loggedIn, async (c) => {
  const body = await c.req.json();
  const parsedBody = courseSchema.safeParse(body);
  if (!parsedBody.success) {
    const errors = parsedBody.error.errors.map((el) => ({
      path: el.path,
      message: el.message,
    }));
    return c.json({ error: errors }, 400);
  }
  try {
    const insertedBatch = await db
      .insert(course)
      .values({
        name: parsedBody.data.name,
        courseCode: parsedBody.data.courseCode,
        creditHours: parsedBody.data.creditHours,
      })
      .returning();
    return c.json(insertedBatch);
  } catch (ex: any) {
    if (ex.code === PG_ERROR.UNIQUE_VIOLATION) {
      return c.json(
        { message: "A course with same course code already exist." },
        400
      );
    }
    return c.json({ message: "An unexpected error occured" }, 500);
  }
});
