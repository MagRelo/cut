import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import {
  normalizeUnsubscribeEmail,
  verifyUnsubscribeToken,
} from "../lib/email/unsubscribe.js";

const unsubscribeRouter = new Hono();

function confirmationHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Email preferences updated</title>
</head>
<body style="font-family:Arial,sans-serif;background:#fafafa;color:#27272a;padding:40px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:8px;padding:24px;">
    <h1 style="margin:0 0 12px;font-size:22px;">You are unsubscribed</h1>
    <p style="margin:0 0 8px;line-height:1.5;">
      Your email preferences have been updated.
    </p>
    <p style="margin:0;line-height:1.5;color:#52525b;">
      You will no longer receive Play The Cut marketing emails.
    </p>
  </div>
</body>
</html>`;
}

unsubscribeRouter.get("/", async (c) => {
  const emailRaw = c.req.query("email")?.trim() || "";
  const token = c.req.query("token")?.trim() || "";

  if (!emailRaw || !token) {
    return c.html(confirmationHtml());
  }

  const email = normalizeUnsubscribeEmail(emailRaw);
  if (!verifyUnsubscribeToken(email, token)) {
    return c.html(confirmationHtml());
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, settings: true },
  });

  if (!user) {
    return c.html(confirmationHtml());
  }

  const existingSettings =
    user.settings && typeof user.settings === "object" && !Array.isArray(user.settings)
      ? user.settings
      : {};

  await prisma.user.update({
    where: { id: user.id },
    data: {
      settings: {
        ...(existingSettings as Record<string, unknown>),
        marketingUnsubscribed: true,
      },
    },
  });

  return c.html(confirmationHtml());
});

export default unsubscribeRouter;
