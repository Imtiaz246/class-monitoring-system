import { loggedIn } from "@/middleware/logged-in";
import { Hono } from "hono";

const app = new Hono();

export const userRouter = app
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
