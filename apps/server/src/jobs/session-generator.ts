import { Queue, Worker } from "bullmq";
import { db, routines, classSessions, bookedRooms, bookedTeachers, sections, courses, rooms, teacherProfiles, users, courseTeacher } from "../db";
import { eq, and, or, gte, lte, between } from "drizzle-orm";
import type { DayOfWeek } from "../utils/types";

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
};

// Create queue for session generation
export const sessionGeneratorQueue = new Queue("session-generator", {
  connection: redisConnection,
});

// Day of week mapping
const dayOfWeekMap: Record<DayOfWeek, number> = {
  "monday": 1,
  "tuesday": 2,
  "wednesday": 3,
  "thursday": 4,
  "friday": 5,
  "saturday": 6,
  "sunday": 0,
};

// Function to get all dates for a specific day of week in a month
function getDatesForDayInMonth(year: number, month: number, dayOfWeek: DayOfWeek): Date[] {
  const dates: Date[] = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const targetDay = dayOfWeekMap[dayOfWeek];

  for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
    if (date.getDay() === targetDay) {
      dates.push(new Date(date));
    }
  }

  return dates;
}

// Function to check if room is available
async function isRoomAvailable(
  roomId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const conflicts = await db
    .select()
    .from(bookedRooms)
    .where(
      and(
        eq(bookedRooms.roomId, roomId),
        eq(bookedRooms.bookedDate, date),
        or(
          and(
            gte(bookedRooms.startTime, startTime),
            lte(bookedRooms.startTime, endTime)
          ),
          and(
            gte(bookedRooms.endTime, startTime),
            lte(bookedRooms.endTime, endTime)
          ),
          and(
            lte(bookedRooms.startTime, startTime),
            gte(bookedRooms.endTime, endTime)
          )
        )
      )
    );

  return conflicts.length === 0;
}

// Function to check if teacher is available
async function isTeacherAvailable(
  teacherId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const conflicts = await db
    .select()
    .from(bookedTeachers)
    .where(
      and(
        eq(bookedTeachers.teacherId, teacherId),
        eq(bookedTeachers.bookedDate, date),
        or(
          and(
            gte(bookedTeachers.startTime, startTime),
            lte(bookedTeachers.startTime, endTime)
          ),
          and(
            gte(bookedTeachers.endTime, startTime),
            lte(bookedTeachers.endTime, endTime)
          ),
          and(
            lte(bookedTeachers.startTime, startTime),
            gte(bookedTeachers.endTime, endTime)
          )
        )
      )
    );

  return conflicts.length === 0;
}

// Function to generate class sessions for a month
export async function generateClassSessions(year: number, month: number) {
  console.log(`🔄 Generating class sessions for ${year}-${month.toString().padStart(2, '0')}`);

  try {
    // Get all active routines with teacher information
    const allRoutines = await db
      .select({
        routineId: routines.routineId,
        sectionId: routines.sectionId,
        courseTeacherId: routines.courseTeacherId,
        roomId: routines.roomId,
        dayOfWeek: routines.dayOfWeek,
        startTime: routines.startTime,
        endTime: routines.endTime,
        updatedAt: routines.updatedAt,
        updatedBy: routines.updatedBy,
        teacherId: courseTeacher.teacherId,
        courseCode: courseTeacher.courseCode,
      })
      .from(routines)
      .innerJoin(courseTeacher, eq(routines.courseTeacherId, courseTeacher.courseTeacherId))
      .orderBy(routines.dayOfWeek, routines.startTime);

    console.log(`📋 Found ${allRoutines.length} routines to process`);

    let successCount = 0;
    let conflictCount = 0;
    const notifications: string[] = [];

    for (const routine of allRoutines) {
      // Get all dates for this day of week in the month
      const dates = getDatesForDayInMonth(year, month, routine.dayOfWeek);

      for (const date of dates) {
        try {
          // Check if session already exists
          const existingSession = await db
            .select()
            .from(classSessions)
            .where(
              and(
                eq(classSessions.routineId, routine.routineId),
                eq(classSessions.sessionDate, date)
              )
            )
            .limit(1);

          if (existingSession.length > 0) {
            console.log(`⏭️  Session already exists for routine ${routine.routineId} on ${date.toISOString().split('T')[0]}`);
            continue;
          }

          // Check room availability
          const roomAvailable = await isRoomAvailable(
            routine.roomId,
            date,
            routine.startTime,
            routine.endTime
          );

          // Check teacher availability
          const teacherAvailable = await isTeacherAvailable(
            routine.teacherId,
            date,
            routine.startTime,
            routine.endTime
          );

          if (!roomAvailable || !teacherAvailable) {
            conflictCount++;
            const conflictType = !roomAvailable ? "room" : "teacher";
            notifications.push(
              `⚠️  Conflict detected for routine ${routine.routineId} on ${date.toISOString().split('T')[0]}: ${conflictType} not available`
            );
            console.log(`⚠️  Skipping session creation due to ${conflictType} conflict`);
            continue;
          }

          // Create class session
          const [newSession] = await db.insert(classSessions).values({
            routineId: routine.routineId,
            sessionDate: date,
            originalScheduleAt: new Date(),
            sessionStatus: "scheduled",
            updatedBy: "system", // System-generated
          }).returning();

          // Book the room
          await db.insert(bookedRooms).values({
            sessionId: newSession.sessionId,
            roomId: routine.roomId,
            bookedDate: date,
            startTime: routine.startTime,
            endTime: routine.endTime,
            bookedBy: "system",
          });

          // Book the teacher
          await db.insert(bookedTeachers).values({
            sessionId: newSession.sessionId,
            teacherId: routine.teacherId,
            bookedDate: date,
            startTime: routine.startTime,
            endTime: routine.endTime,
            bookedBy: "system",
          });

          successCount++;
          console.log(`✅ Created session for routine ${routine.routineId} on ${date.toISOString().split('T')[0]}`);
        } catch (error) {
          console.error(`❌ Error creating session for routine ${routine.routineId} on ${date.toISOString().split('T')[0]}:`, error);
          notifications.push(
            `❌ Error creating session for routine ${routine.routineId} on ${date.toISOString().split('T')[0]}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    console.log(`🎉 Session generation completed:`);
    console.log(`   ✅ Successfully created: ${successCount} sessions`);
    console.log(`   ⚠️  Conflicts detected: ${conflictCount}`);
    console.log(`   📧 Notifications: ${notifications.length}`);

    // In a real implementation, you would send these notifications
    // to administrators via email, Slack, etc.
    if (notifications.length > 0) {
      console.log(`📧 Notifications to send:`);
      notifications.forEach(notification => console.log(`   ${notification}`));
    }

    return {
      success: true,
      successCount,
      conflictCount,
      notifications,
    };
  } catch (error) {
    console.error(`❌ Failed to generate class sessions:`, error);
    throw error;
  }
}

// Worker to process session generation jobs
export const sessionGeneratorWorker = new Worker(
  "session-generator",
  async (job) => {
    const { year, month } = job.data;
    console.log(`🔄 Processing session generation job for ${year}-${month}`);
    
    try {
      const result = await generateClassSessions(year, month);
      console.log(`✅ Session generation job completed successfully`);
      return result;
    } catch (error) {
      console.error(`❌ Session generation job failed:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Process one job at a time
  }
);

// Function to schedule monthly session generation
export async function scheduleMonthlySessionGeneration() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  // Schedule for the 1st of next month at 00:00
  await sessionGeneratorQueue.add(
    "generate-monthly-sessions",
    {
      year: nextMonth.getFullYear(),
      month: nextMonth.getMonth() + 1,
    },
    {
      delay: nextMonth.getTime() - now.getTime(),
      repeat: {
        pattern: "0 0 1 * *", // Run on the 1st of every month at midnight
      },
    }
  );

  console.log(`📅 Scheduled monthly session generation for ${nextMonth.toISOString().split('T')[0]}`);
}

// Function to handle mid-month routine changes
export async function handleRoutineChange(routineId: string, changeDate: Date) {
  console.log(`🔄 Handling routine change for routine ${routineId} from ${changeDate.toISOString().split('T')[0]}`);

  try {
    // Get the updated routine with teacher information
    const [routine] = await db
      .select({
        routineId: routines.routineId,
        sectionId: routines.sectionId,
        courseTeacherId: routines.courseTeacherId,
        roomId: routines.roomId,
        dayOfWeek: routines.dayOfWeek,
        startTime: routines.startTime,
        endTime: routines.endTime,
        updatedAt: routines.updatedAt,
        updatedBy: routines.updatedBy,
        teacherId: courseTeacher.teacherId,
        courseCode: courseTeacher.courseCode,
      })
      .from(routines)
      .innerJoin(courseTeacher, eq(routines.courseTeacherId, courseTeacher.courseTeacherId))
      .where(eq(routines.routineId, routineId))
      .limit(1);

    if (!routine) {
      throw new Error(`Routine ${routineId} not found`);
    }

    // Get remaining dates in the current month from the change date
    const year = changeDate.getFullYear();
    const month = changeDate.getMonth() + 1;
    const endOfMonth = new Date(year, month, 0);
    
    const remainingDates = getDatesForDayInMonth(year, month, routine.dayOfWeek)
      .filter(date => date >= changeDate);

    console.log(`📅 Found ${remainingDates.length} remaining dates to update`);

    let updatedCount = 0;
    const notifications: string[] = [];

    for (const date of remainingDates) {
      try {
        // Delete existing session if it exists
        const existingSessions = await db
          .select()
          .from(classSessions)
          .where(
            and(
              eq(classSessions.routineId, routineId),
              eq(classSessions.sessionDate, date)
            )
          );

        if (existingSessions.length > 0) {
          const session = existingSessions[0];
          
          // Remove bookings
          await db
            .delete(bookedRooms)
            .where(
              and(
                eq(bookedRooms.roomId, routine.roomId),
                eq(bookedRooms.bookedDate, date),
                eq(bookedRooms.startTime, routine.startTime),
                eq(bookedRooms.endTime, routine.endTime)
              )
            );

          await db
            .delete(bookedTeachers)
            .where(
              and(
                eq(bookedTeachers.teacherId, routine.teacherId),
                eq(bookedTeachers.bookedDate, date),
                eq(bookedTeachers.startTime, routine.startTime),
                eq(bookedTeachers.endTime, routine.endTime)
              )
            );

          // Delete session
          await db
            .delete(classSessions)
            .where(eq(classSessions.sessionId, session.sessionId));
        }

        // Check availability for new session
        const roomAvailable = await isRoomAvailable(
          routine.roomId,
          date,
          routine.startTime,
          routine.endTime
        );

        const teacherAvailable = await isTeacherAvailable(
          routine.teacherId,
          date,
          routine.startTime,
          routine.endTime
        );

        if (!roomAvailable || !teacherAvailable) {
          const conflictType = !roomAvailable ? "room" : "teacher";
          notifications.push(
            `⚠️  Cannot create updated session for ${date.toISOString().split('T')[0]}: ${conflictType} conflict`
          );
          continue;
        }

        // Create new session with updated routine
        const [updatedSession] = await db.insert(classSessions).values({
          routineId: routine.routineId,
          sessionDate: date,
          originalScheduleAt: new Date(),
          sessionStatus: "scheduled",
          updatedBy: "system",
        }).returning();

        // Create new bookings
        await db.insert(bookedRooms).values({
          sessionId: updatedSession.sessionId,
          roomId: routine.roomId,
          bookedDate: date,
          startTime: routine.startTime,
          endTime: routine.endTime,
          bookedBy: "system",
        });

        await db.insert(bookedTeachers).values({
          sessionId: updatedSession.sessionId,
          teacherId: routine.teacherId,
          bookedDate: date,
          startTime: routine.startTime,
          endTime: routine.endTime,
          bookedBy: "system",
        });

        updatedCount++;
        console.log(`✅ Updated session for ${date.toISOString().split('T')[0]}`);
      } catch (error) {
        console.error(`❌ Error updating session for ${date.toISOString().split('T')[0]}:`, error);
        notifications.push(
          `❌ Error updating session for ${date.toISOString().split('T')[0]}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    console.log(`🎉 Routine change handling completed:`);
    console.log(`   ✅ Successfully updated: ${updatedCount} sessions`);
    console.log(`   📧 Notifications: ${notifications.length}`);

    if (notifications.length > 0) {
      console.log(`📧 Notifications to send:`);
      notifications.forEach(notification => console.log(`   ${notification}`));
    }

    return {
      success: true,
      updatedCount,
      notifications,
    };
  } catch (error) {
    console.error(`❌ Failed to handle routine change:`, error);
    throw error;
  }
}

// Initialize the session generator
export async function initializeSessionGenerator() {
  console.log(`🚀 Initializing session generator...`);
  
  try {
    // Schedule monthly session generation
    await scheduleMonthlySessionGeneration();
    
    console.log(`✅ Session generator initialized successfully`);
  } catch (error) {
    console.error(`❌ Failed to initialize session generator:`, error);
    throw error;
  }
}