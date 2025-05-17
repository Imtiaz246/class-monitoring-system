import { loggedIn } from "@/middleware/logged-in";
import type { HonoContext } from "@/utils/types";
import { Hono } from "hono";

const app = new Hono<HonoContext>();

export const userRouter = app
  .get("/info", loggedIn, async (ctx) => {
    const user = ctx.get("user");
    return ctx.json(user);
  })
  .get("/:id", loggedIn, async (ctx) => {
    const id = ctx.req.param("id");
    return ctx.json({
      method: "get",
      id: id,
    });
  })
  .put("/:id", loggedIn, async (ctx) => {
    const id = ctx.req.param("id");
    return ctx.json({
      method: "put",
      id: id,
    });
  });
