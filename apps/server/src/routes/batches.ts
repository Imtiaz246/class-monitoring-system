import { db } from "@/db";
import { batch } from "@/db/schema/batch";
import { loggedIn } from "@/middleware/logged-in";
import type { HonoContext } from "@/utils/types";
import { Hono } from "hono";
import { z } from "zod";
import { PG_ERROR } from "@/utils/pg-error";

const app = new Hono<HonoContext>();

const batchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, { message: "Name must be at least 3 character long." })
    .max(30, { message: "Name can't exceed 30 characters long" }),
});

export const batchRouter = app.post("/", loggedIn, async (c) => {
  const body = await c.req.json();
  const parsedBody = batchSchema.safeParse(body);
  if (!parsedBody.success) {
    const errors = parsedBody.error.errors.map((el) => ({
      path: el.path,
      message: el.message,
    }));
    return c.json({ error: errors }, 400);
  }
  try {
    const insertedBatch = await db
      .insert(batch)
      .values({
        name: parsedBody.data.name,
      })
      .returning();
    return c.json(insertedBatch);
  } catch (ex: any) {
    if (ex.code === PG_ERROR.UNIQUE_VIOLATION) {
      return c.json({ message: "A batch with this name already exists." }, 400);
    }
    return c.json({ message: "An unexpected error occured" }, 500);
  }
});
