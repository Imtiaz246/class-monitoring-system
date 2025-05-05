import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

export const loggedIn = createMiddleware(async (ctx, next) => {
  const user = ctx.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  await next();
});
