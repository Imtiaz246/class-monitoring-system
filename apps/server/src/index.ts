import app from "./routes";

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