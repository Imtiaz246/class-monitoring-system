import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { authenticateToken } from "../middleware/jwt-auth";
import { authRouter } from "./auth";
import { authRouter as authOpenAPIRouter } from "./auth-openapi";
import { usersRouter } from "./users";
import { roomsRouter } from "./rooms";
import { coursesRouter } from "./courses";
import { sectionsRouter } from "./sections";
import { batchesRouter } from "./batches";
import { studentProfilesRouter } from "./student-profiles";
import { teacherProfilesRouter } from "./teacher-profiles";
import { routinesRouter } from "./routines";
import { classSessionsRouter } from "./class-sessions";
import type { HonoContext } from "../utils/types";

const app = new Hono<HonoContext>();

// CORS middleware
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173"],
    credentials: true,
  })
);

// Health check (public access)
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// OpenAPI Documentation routes (before auth middleware to allow public access)
app.route("/api/docs/auth", authOpenAPIRouter);

// JWT Authentication middleware (exclude docs and health routes)
app.use("/api/*", authenticateToken);

// Auth routes (regular)
app.route("/api/auth", authRouter);

// API routes
app.route("/api/v1/users", usersRouter);

// API routes
app.route("/api/v1/rooms", roomsRouter);
app.route("/api/v1/courses", coursesRouter);
app.route("/api/v1/sections", sectionsRouter);
app.route("/api/v1/batches", batchesRouter);
app.route("/api/v1/student-profiles", studentProfilesRouter);
app.route("/api/v1/teacher-profiles", teacherProfilesRouter);
app.route("/api/v1/routines", routinesRouter);
app.route("/api/v1/sessions", classSessionsRouter);



app.onError(async (err, c) => {
  if (err instanceof HTTPException) {
    // Check if this is a validation error from our custom zValidator
    if (err.cause && typeof err.cause === 'object' && 'code' in err.cause && err.cause.code === 'VALIDATION_ERROR') {
      return c.json(
        {
          error: {
            message: err.message,
            code: err.cause.code,
            details: 'details' in err.cause ? err.cause.details : [],
          },
        },
        err.status
      );
    }
    
    // Handle other HTTPException instances
    try {
      const response = err.getResponse();
      const data = await response.json();
      return c.json(data, err.status);
    } catch (jsonError) {
      // Fallback if JSON parsing fails
      return c.json(
        {
          error: {
            message: err.message,
            code: 'HTTP_EXCEPTION',
          },
        },
        err.status
      );
    }
  }
  
  // Handle other errors
  return c.json(
    {
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: {
        message: "Route not found",
        code: "ROUTE_NOT_FOUND",
      },
    },
    404
  );
});

export default app;