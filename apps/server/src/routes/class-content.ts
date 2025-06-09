import { db } from "@/db";
import { classContent } from "@/db/schema/class-content";
import { loggedIn } from "@/middleware/logged-in";
import { canCreate, canRead, canUpdate } from "@/middleware/check-role";
import { PG_ERROR } from "@/utils/pg-error";
import type { HonoContext } from "@/utils/types";
import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";

const app = new Hono<HonoContext>();

const classContentSchema = z.object({
  classSessionId: z.number({
    required_error: "Class session id is required",
    invalid_type_error: "Class session id must be an integer",
  }),
  topicsCovered: z.string().max(1000, {
    message: "Topics covered cannot exceed 1000 characters",
  }),
  notes: z.string().optional(),
  resources: z.string().optional(),
});

// Create class content - admin, chairman, super_admin, teacher can create
const classContentRouter = app.post("/", loggedIn, canCreate, async (c) => {
  const body = await c.req.json();
  const parsedBody = classContentSchema.safeParse(body);
  
  if (!parsedBody.success) {
    const errors = parsedBody.error.errors.map((el) => ({
      path: el.path,
      message: el.message,
    }));
    return c.json({ error: errors }, 400);
  }
  
  try {
    // Check if content already exists for this session
    const existingContent = await db
      .select()
      .from(classContent)
      .where(eq(classContent.classSessionId, parsedBody.data.classSessionId));
    
    if (existingContent.length > 0) {
      return c.json(
        { message: "Content already exists for this class session" },
        400
      );
    }
    
    const insertedContent = await db
      .insert(classContent)
      .values({
        classSessionId: parsedBody.data.classSessionId,
        topicsCovered: parsedBody.data.topicsCovered,
        notes: parsedBody.data.notes,
        resources: parsedBody.data.resources,
        createdBy: c.get("user")?.id,
        updatedBy: c.get("user")?.id,
      })
      .returning();
    
    return c.json(insertedContent[0]);
  } catch (ex: any) {
    if (ex.code === PG_ERROR.FOREIGN_KEY_VIOLATION) {
      return c.json({ message: "Class session does not exist." }, 400);
    }
    return c.json({ message: "An unexpected error occurred" }, 500);
  }
});

// Get class content by session ID - all roles can read
app.get("/session/:sessionId", loggedIn, canRead, async (c) => {
  const sessionId = parseInt(c.req.param("sessionId"));
  
  if (isNaN(sessionId)) {
    return c.json({ message: "Invalid session ID format" }, 400);
  }
  
  try {
    const content = await db
      .select()
      .from(classContent)
      .where(eq(classContent.classSessionId, sessionId));
    
    if (content.length === 0) {
      return c.json({ message: "Content not found for this session" }, 404);
    }
    
    return c.json(content[0]);
  } catch (ex) {
    return c.json({ message: "An unexpected error occurred" }, 500);
  }
});

// Update class content - admin, chairman, super_admin, teacher can update
app.patch("/:id", loggedIn, canUpdate, async (c) => {
  const id = parseInt(c.req.param("id"));
  
  if (isNaN(id)) {
    return c.json({ message: "Invalid ID format" }, 400);
  }
  
  const body = await c.req.json();
  const parsedBody = classContentSchema.partial().safeParse(body);
  
  if (!parsedBody.success) {
    const errors = parsedBody.error.errors.map((el) => ({
      path: el.path,
      message: el.message,
    }));
    return c.json({ error: errors }, 400);
  }
  
  try {
    const updatedContent = await db
      .update(classContent)
      .set({
        topicsCovered: parsedBody.data.topicsCovered,
        notes: parsedBody.data.notes,
        resources: parsedBody.data.resources,
        updatedAt: new Date(),
        updatedBy: c.get("user")?.id,
      })
      .where(eq(classContent.id, id))
      .returning();
    
    if (updatedContent.length === 0) {
      return c.json({ message: "Content not found" }, 404);
    }
    
    return c.json(updatedContent[0]);
  } catch (ex) {
    return c.json({ message: "An unexpected error occurred" }, 500);
  }
});

export { app as classContentRouter };