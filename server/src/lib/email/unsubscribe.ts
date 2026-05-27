import { createHmac, timingSafeEqual } from "node:crypto";
import { appPath } from "./appUrl.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getUnsubscribeSecret(): string {
  const secret =
    process.env.JWT_SECRET?.trim() ||
    process.env.MAILERSEND_API_KEY?.trim() ||
    "";
  if (!secret) {
    throw new Error("Missing unsubscribe token secret");
  }
  return secret;
}

function digestForEmail(email: string): Buffer {
  return createHmac("sha256", getUnsubscribeSecret()).update(normalizeEmail(email)).digest();
}

export function createUnsubscribeToken(email: string): string {
  return digestForEmail(email).toString("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  try {
    const expected = digestForEmail(email);
    const provided = Buffer.from(token.trim(), "hex");
    if (provided.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

export function normalizeUnsubscribeEmail(email: string): string {
  return normalizeEmail(email);
}

export function buildUnsubscribeHref(email: string): string {
  const token = encodeURIComponent(createUnsubscribeToken(email));
  const normalizedEmail = encodeURIComponent(normalizeEmail(email));
  return appPath(`/api/unsubscribe?email=${normalizedEmail}&token=${token}`);
}

export function appendUnsubscribeFooter(html: string, email: string): string {
  const href = buildUnsubscribeHref(email);
  const footerLine = `You received this email from Play The Cut.`;
  const footerWithLink = `You received this email from Play The Cut. If you no longer wish to receive these emails, please <a href="${href}" style="color:#71717a;">click here to unsubscribe</a>.`;
  if (html.includes(footerLine)) {
    return html.replace(footerLine, footerWithLink);
  }

  const fallback = `<div style="margin-top:18px;color:#a1a1aa;font-size:12px;line-height:1.5;">
  If you no longer want these emails, <a href="${href}" style="color:#71717a;">Unsubscribe</a>.
</div>`;
  return html.includes("</body>") ? html.replace("</body>", `${fallback}</body>`) : `${html}${fallback}`;
}
