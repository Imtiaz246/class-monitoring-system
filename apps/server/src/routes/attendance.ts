import { db } from "@/db";
import { attendance } from "@/db/schema/attendance";
import { loggedIn } from "@/middleware/logged-in";
import { canCreate, canRead, canUpdate } from "@/middleware/check-role";
import { PG_ERROR } from "@/utils/pg-error";
import type { HonoContext } from "@/utils/types";
import { Hono } from "hono";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

const app = new Hono<HonoContext>();

const attendanceSchema = z.object({
  classSessionId: z.number({
    required_error: "Class session id is required",
    invalid_type_error: "Class session id must be an integer",
  }),
  studentId: z.string().min(1, { message: "Student id is required" }),
  isPresent: z.boolean({
    required_error: "Attendance status is required",
  }),
  remarks: z.string().max(255).optional(),
});

// Create or update attendance record - admin, chairman, super_admin, teacher can create/update
const attendanceRouter = app.post("/", loggedIn, canCreate, async (c) => {
  const body = await c.req.json();
  const parsedBody = attendanceSchema.safeParse(body);
  
  if (!parsedBody.success) {
    const errors = parsedBody.error.errors.map((el) => ({
      path: el.path,
      message: el.message,
    }));
    return c.json({ error: errors }, 400);
  }
  
  try {
    // Check if attendance record already exists
    const existingRecord = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.classSessionId, parsedBody.data.classSessionId),
          eq(attendance.studentId, parsedBody.data.studentId)
        )
      );
    
    if (existingRecord.length > 0) {
      // Update existing record
      const updatedRecord = await db
        .update(attendance)
        .set({
          isPresent: parsedBody.data.isPresent,
          remarks: parsedBody.data.remarks,
          updatedAt: new Date(),
          updatedBy: c.get("user")?.id,
        })
        .where(
          and(
            eq(attendance.classSessionId, parsedBody.data.classSessionId),
            eq(attendance.studentId, parsedBody.data.studentId)
          )
        )
        .returning();
      
      return c.json(updatedRecord[0]);
    } else {
      // Create new record
      const insertedRecord = await db
        .insert(attendance)
        .values({
          classSessionId: parsedBody.data.classSessionId,
          studentId: parsedBody.data.studentId,
          isPresent: parsedBody.data.isPresent,
          remarks: parsedBody.data.remarks,
          markedBy: c.get("user")?.id,
          updatedBy: c.get("user")?.id,
        })
        .returning();
      
      return c.json(insertedRecord[0]);
    }
  } catch (ex: any) {
    if (ex.code === PG_ERROR.FOREIGN_KEY_VIOLATION) {
      return c.json({ message: "Class session or student does not exist." }, 400);
    }
    return c.json({ message: "An unexpected error occurred" }, 500);
  }
});

// Get attendance records for a class session - all roles can read
app.get("/session/:sessionId", loggedIn, canRead, async (c) => {
  const sessionId = parseInt(c.req.param("sessionId"));
  
  if (isNaN(sessionId)) {
    return c.json({ message: "Invalid session ID format" }, 400);
  }
  
  try {
    const records = await db
      .select()
      .from(attendance)
      .where(eq(attendance.classSessionId, sessionId));
    
    return c.json(records);
  } catch (ex) {
    return c.json({ message: "An unexpected error occurred" }, 500);
  }
});

// Get attendance records for a student - all roles can read
app.get("/student/:studentId", loggedIn, canRead, async (c) => {
  const studentId = c.req.param("studentId");
  
  try {
    const records = await db
      .select()
      .from(attendance)
      .where(eq(attendance.studentId, studentId));
    
    return c.json(records);
  } catch (ex) {
    return c.json({ message: "An unexpected error occurred" }, 500);
  }
});

// Bulk create/update attendance records - admin, chairman, super_admin, teacher can create/update
const bulkAttendanceSchema = z.object({
  classSessionId: z.number({
    required_error: "Class session id is required",
    invalid_type_error: "Class session id must be an integer",
  }),
  records: z.array(
    z.object({
      studentId: z.string().min(1, { message: "Student id is required" }),
      isPresent: z.boolean({
        required_error: "Attendance status is required",
      }),
      remarks: z.string().max(255).optional(),
    })
  ),
});

app.post("/bulk", loggedIn, canCreate, async (c) => {
  const body = await c.req.json();
  const parsedBody = bulkAttendanceSchema.safeParse(body);
  
  if (!parsedBody.success) {
    const errors = parsedBody.error.errors.map((el) => ({
      path: el.path,
      message: el.message,
    }));
    return c.json({ error: errors }, 400);
  }
  
  try {
    const results = [];
    
    for (const record of parsedBody.data.records) {
      // Check if attendance record already exists
      const existingRecord = await db
        .select()
        .from(attendance)
        .where(
          and(
            eq(attendance.classSessionId, parsedBody.data.classSessionId),
            eq(attendance.studentId, record.studentId)
          )
        );
      
      if (existingRecord.length > 0) {
        // Update existing record
        const updatedRecord = await db
          .update(attendance)
          .set({
            isPresent: record.isPresent,
            remarks: record.remarks,
            updatedAt: new Date(),
            updatedBy: c.get("user")?.id,
          })
          .where(
            and(
              eq(attendance.classSessionId, parsedBody.data.classSessionId),
              eq(attendance.studentId, record.studentId)
            )
          )
          .returning();
        
        results.push(updatedRecord[0]);
      } else {
        // Create new record
        const insertedRecord = await db
          .insert(attendance)
          .values({
            classSessionId: parsedBody.data.classSessionId,
            studentId: record.studentId,
            isPresent: record.isPresent,
            remarks: record.remarks,
            markedBy: c.get("user")?.id,
            updatedBy: c.get("user")?.id,
          })
          .returning();
        
        results.push(insertedRecord[0]);
      }
    }
    
    return c.json(results);
  } catch (ex: any) {
    if (ex.code === PG_ERROR.FOREIGN_KEY_VIOLATION) {
      return c.json({ message: "Class session or student does not exist." }, 400);
    }
    return c.json({ message: "An unexpected error occurred" }, 500);
  }
});

export { app as attendanceRouter };