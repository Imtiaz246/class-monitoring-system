import { Hono } from "hono";
import { auth } from "@/lib/auth";

const app = new Hono();

export const authRouter = app.on(["POST", "GET"], "/*", (ctx) => {
  return auth.handler(ctx.req.raw);
});
