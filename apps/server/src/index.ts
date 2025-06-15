import app from "./routes";
import { auth } from "./lib/auth";

// Add auth session middleware to context
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({
    headers: new Headers(c.req.header()),
  });

  if (session) {
    c.set("user", session.user);
    c.set("session", session);
  } else {
    c.set("user", null);
    c.set("session", null);
  }

  await next();
});

const port = Number(process.env.PORT) || 3001;

console.log(`🚀 Server is running on port ${port}`);
console.log(`📊 Health check: http://localhost:${port}/health`);
console.log(`🔐 Auth endpoints: http://localhost:${port}/api/auth/*`);
console.log(`📡 API endpoints: http://localhost:${port}/api/v1/*`);

// Use Bun's native server
export default {
  port,
  fetch: app.fetch,
};