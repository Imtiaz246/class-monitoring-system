import "dotenv/config";
import { Hono } from "hono";
import { auth } from "./lib/auth";
import { cors } from "hono/cors";
import { authRouter } from "./routes/auth";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>({ strict: false });

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

const routes = app.basePath("/api").route("/auth", authRouter);

app.onError((err, ctx) => {
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
