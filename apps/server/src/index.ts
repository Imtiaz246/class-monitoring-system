import app from "./routes";

const port = Number(process.env.PORT) || 3001;

console.log(`🚀 Server is running on port ${port}`);
console.log(`📊 Health check: http://localhost:${port}/health`);
console.log(`🔐 Auth endpoints: http://localhost:${port}/api/auth/*`);
console.log(`📡 API endpoints: http://localhost:${port}/api/v1/*`);
console.log(`📚 Complete API Documentation (All Sections): http://localhost:${port}/api/docs/ui`);
console.log(`📋 Documentation Overview: http://localhost:${port}/api/docs-overview/sections`);
console.log(`🔐 Auth Only: http://localhost:${port}/api/docs/auth/ui`);
console.log(`👥 Users Only: http://localhost:${port}/api/docs/users/ui`);

// Use Bun's native server
export default {
  port,
  fetch: app.fetch,
};