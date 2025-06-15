import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { auth } from "../lib/auth";
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
    origin: ["http://localhost:3000", "http://localhost:5173"], // Add your frontend URLs
    credentials: true,
  })
);

// Auth routes
app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

// API routes
app.route("/api/v1/rooms", roomsRouter);
app.route("/api/v1/courses", coursesRouter);
app.route("/api/v1/sections", sectionsRouter);
app.route("/api/v1/batches", batchesRouter);
app.route("/api/v1/student-profiles", studentProfilesRouter);
app.route("/api/v1/teacher-profiles", teacherProfilesRouter);
app.route("/api/v1/routines", routinesRouter);
app.route("/api/v1/sessions", classSessionsRouter);

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  console.error("Unhandled error:", err);
  return c.json(
    {
      error: {
        message: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
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