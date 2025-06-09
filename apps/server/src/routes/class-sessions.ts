import { db } from "@/db";
import { classSession } from "@/db/schema/class-session";
import { loggedIn } from "@/middleware/logged-in";
import { canCreate, canRead, canUpdate } from "@/middleware/check-role";
import { PG_ERROR } from "@/utils/pg-error";
import type { HonoContext } from "@/utils/types";
import { Hono } from "hono";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

const app = new Hono<HonoContext>();

const classSessionSchema = z.object({
  routineId: z.number({
    required_error: "Routine id is required",
    invalid_type_error: "Routine id must be an integer",
  }),
  batchId: z.number({
    required_error: "Batch id is required",
    invalid_type_error: "Batch id must be an integer",
  }),
  sectionId: z.number({
    required_error: "Section id is required",
    invalid_type_error: "Section id must be an integer",
  }),
  courseId: z.number({
    required_error: "Course id is required",
    invalid_type_error: "Course id must be an integer",
  }),
  teacherId: z.string().min(1, { message: "Teacher id is required" }),
  roomId: z.number({
    required_error: "Room id is required",
    invalid_type_error: "Room id must be an integer",
  }),
  originalScheduledAt: z.string().datetime({
    message: "Original scheduled time must be a valid ISO datetime string",
  }),
  actualScheduledAt: z.string().datetime({
    message: "Actual scheduled time must be a valid ISO datetime string",
  }).optional(),
  session_status: z.enum(["scheduled", "completed", "canceled", "re_scheduled"], {
    required_error: "Session status is required",
    invalid_type_error: "Invalid session status",
  }),
  rescheduleOrCancelReason: z.string().max(2047).optional(),
});

// Create a new class session - only admin, chairman, super_admin can create
const classSessionRouter = app.post("/", loggedIn, canCreate, async (c) => {
  const body = await c.req.json();
  const parsedBody = classSessionSchema.safeParse(body);
  
  if (!parsedBody.success) {
    const errors = parsedBody.error.errors.map((el) => ({
      path: el.path,
      message: el.message,
    }));
    return c.json({ error: errors }, 400);
  }
  
  try {
    const insertedSession = await db
      .insert(classSession)
      .values({
        routineId: parsedBody.data.routineId,
        batchId: parsedBody.data.batchId,
        sectionId: parsedBody.data.sectionId,
        courseId: parsedBody.data.courseId,
        teacherId: parsedBody.data.teacherId,
        roomId: parsedBody.data.roomId,
        originalScheduledAt: new Date(parsedBody.data.originalScheduledAt),
        actualScheduledAt: parsedBody.data.actualScheduledAt 
          ? new Date(parsedBody.data.actualScheduledAt) 
          : undefined,
        session_status: parsedBody.data.session_status,
        rescheduleOrCancelReason: parsedBody.data.rescheduleOrCancelReason,
        updatedBy: c.get("user")?.id,
      })
      .returning();
    
    return c.json(insertedSession);
  } catch (ex: any) {
    if (ex.code === PG_ERROR.FOREIGN_KEY_VIOLATION) {
      return c.json({ message: "One or more referenced IDs do not exist." }, 400);
    }
    return c.json({ message: "An unexpected error occurred" }, 500);
  }
});

// Get all class sessions - all roles can read
app.get("/", loggedIn, canRead, async (c) => {
  try {
    const sessions = await db.select().from(classSession);
    return c.json(sessions);
  } catch (ex) {
    return c.json({ message: "An unexpected error occurred" }, 500);
  }
});

// Get class session by ID - all roles can read
app.get("/:id", loggedIn, canRead, async (c) => {
  const id = parseInt(c.req.param("id"));
  
  if (isNaN(id)) {
    return c.json({ message: "Invalid ID format" }, 400);
  }
  
  try {
    const session = await db
      .select()
      .from(classSession)
      .where(eq(classSession.id, id));
    
    if (session.length === 0) {
      return c.json({ message: "Class session not found" }, 404);
    }
    
    return c.json(session[0]);
  } catch (ex) {
    return c.json({ message: "An unexpected error occurred" }, 500);
  }
});

// Update class session status - admin, chairman, super_admin, teacher can update
const updateSessionSchema = z.object({
  session_status: z.enum(["scheduled", "completed", "canceled", "re_scheduled"]),
  actualScheduledAt: z.string().datetime().optional(),
  rescheduleOrCancelReason: z.string().max(2047).optional(),
});

app.patch("/:id", loggedIn, canUpdate, async (c) => {
  const id = parseInt(c.req.param("id"));
  
  if (isNaN(id)) {
    return c.json({ message: "Invalid ID format" }, 400);
  }
  
  const body = await c.req.json();
  const parsedBody = updateSessionSchema.safeParse(body);
  
  if (!parsedBody.success) {
    const errors = parsedBody.error.errors.map((el) => ({
      path: el.path,
      message: el.message,
    }));
    return c.json({ error: errors }, 400);
  }
  
  try {
    const updatedSession = await db
      .update(classSession)
      .set({
        session_status: parsedBody.data.session_status,
        actualScheduledAt: parsedBody.data.actualScheduledAt 
          ? new Date(parsedBody.data.actualScheduledAt) 
          : undefined,
        rescheduleOrCancelReason: parsedBody.data.rescheduleOrCancelReason,
        updatedAt: new Date(),
        updatedBy: c.get("user")?.id,
      })
      .where(eq(classSession.id, id))
      .returning();
    
    if (updatedSession.length === 0) {
      return c.json({ message: "Class session not found" }, 404);
    }
    
    return c.json(updatedSession[0]);
  } catch (ex) {
    return c.json({ message: "An unexpected error occurred" }, 500);
  }
});

// Get class sessions by batch and section - all roles can read
app.get("/batch/:batchId/section/:sectionId", loggedIn, canRead, async (c) => {
  const batchId = parseInt(c.req.param("batchId"));
  const sectionId = parseInt(c.req.param("sectionId"));
  
  if (isNaN(batchId) || isNaN(sectionId)) {
    return c.json({ message: "Invalid ID format" }, 400);
  }
  
  try {
    const sessions = await db
      .select()
      .from(classSession)
      .where(
        and(
          eq(classSession.batchId, batchId),
          eq(classSession.sectionId, sectionId)
        )
      );
    
    return c.json(sessions);
  } catch (ex) {
    return c.json({ message: "An unexpected error occurred" }, 500);
  }
});

export { app as classSessionRouter };