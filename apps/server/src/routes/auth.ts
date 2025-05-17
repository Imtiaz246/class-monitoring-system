import { Hono } from "hono";
import { auth } from "@/lib/auth";
import type { HonoContext } from "@/utils/types";

const app = new Hono<HonoContext>();

export const authRouter = app.on(["POST", "GET"], "/*", (ctx) => {
  return auth.handler(ctx.req.raw);
});
