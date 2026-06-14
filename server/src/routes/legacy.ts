import { Hono } from "hono";

const legacyRouter = new Hono();

legacyRouter.all("*", (c) => {
  return c.json(
    {
      error: "Endpoint unavailable during platform rewrite",
      message: "Use /api/sports and /api/lineups for the new platform APIs",
    },
    501,
  );
});

export default legacyRouter;
