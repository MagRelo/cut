import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getStreamApiKey,
  isStreamFeedsEnabled,
  requireStreamFeedsClient,
} from "../services/stream/streamFeedsClient.js";
import { upsertStreamUsers } from "../services/stream/resolveMentionedUsers.js";

const streamRouter = new Hono();

const TOKEN_VALIDITY_SECONDS = 24 * 60 * 60;

streamRouter.get("/token", requireAuth, async (c) => {
  if (!isStreamFeedsEnabled()) {
    return c.json({ error: "Stream Feeds is not enabled" }, 503);
  }

  const apiKey = getStreamApiKey();
  if (!apiKey) {
    return c.json({ error: "Stream API key is not configured" }, 503);
  }

  const { userId } = c.get("user");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  try {
    const client = requireStreamFeedsClient();
    await upsertStreamUsers([{ id: user.id, name: user.name }]);
    const token = client.generateUserToken({
      user_id: user.id,
      validity_in_seconds: TOKEN_VALIDITY_SECONDS,
    });

    return c.json({
      apiKey,
      token,
      userId: user.id,
      expiresInSeconds: TOKEN_VALIDITY_SECONDS,
    });
  } catch (error) {
    console.error("[stream] Failed to issue token:", error);
    return c.json({ error: "Failed to issue Stream token" }, 500);
  }
});

export default streamRouter;
