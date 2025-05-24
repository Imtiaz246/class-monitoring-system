import { section } from "@/db/schema/section";
import { loggedIn } from "@/middleware/logged-in";
import type { HonoContext } from "@/utils/types";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "@/db";
import { PG_ERROR } from "@/utils/pg-error";

const app = new Hono<HonoContext>();

const sectionSchema = z.object({
  batchId: z.number({
    required_error: "Batch id is required",
    invalid_type_error: "Batch id must be an integer",
  }),
  name: z
    .string()
    .trim()
    .min(1, { message: "Name must be non empty." })
    .max(30, { message: "Name can't exceed 30 characters long." }),
});

export const sectionRouter = app.post("/", loggedIn, async (c) => {
  const body = await c.req.json();
  const parsedBody = sectionSchema.safeParse(body);
  if (!parsedBody.success) {
    const errors = parsedBody.error.errors.map((el) => ({
      path: el.path,
      message: el.message,
    }));
    return c.json({ error: errors }, 400);
  }
  try {
    const insertedSection = await db
      .insert(section)
      .values({
        batchId: parsedBody.data.batchId,
        name: parsedBody.data.name,
      })
      .returning();
    return c.json(insertedSection);
  } catch (ex: any) {
    if (ex.code === PG_ERROR.FOREIGN_KEY_VIOLATION) {
      return c.json({ message: "Batch id does not exist." }, 400);
    }
    return c.json({ message: "An unexpected error occured" }, 500);
  }
});
