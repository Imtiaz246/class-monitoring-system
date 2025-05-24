import "dotenv/config";
import { Hono } from "hono";
import { auth } from "./lib/auth";
import { cors } from "hono/cors";
import { authRouter } from "./routes/auth";
import { userRouter } from "./routes/user";
import { HTTPException } from "hono/http-exception";
import type { HonoContext } from "./utils/types";
// import { routineRouter } from "./routes/routines";
import { batchRouter } from "./routes/batches";
import { sectionRouter } from "./routes/sections";

const app = new Hono<HonoContext>({ strict: false });

app.use("*", cors(), async (ctx, next) => {
  const session = await auth.api.getSession({ headers: ctx.req.raw.headers });
  if (!session || !session.user) {
    ctx.set("user", null);
    ctx.set("session", null);
    return await next();
  }
  ctx.set("user", session.user);
  ctx.set("session", session.session);
  return await next();
});

const routes = app
  .basePath("/api")
  .route("/auth", authRouter)
  .route("/user", userRouter)
  // .route("/routines", routineRouter)
  .route("/batches", batchRouter)
  .route("/sections", sectionRouter);

app.onError((err, ctx) => {
  if (err instanceof HTTPException) {
    return ctx.json(
      {
        message: err.message,
      },
      err.status
    );
  }
  return ctx.json(
    {
      message: "Internal server error",
    },
    500
  );
});

app.notFound((ctx) => {
  return ctx.text("Not found", 404);
});

export default app;
