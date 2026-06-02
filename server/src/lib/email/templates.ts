import { escapeHtml } from "./escape.js";
import { FONT_BODY, FONT_DISPLAY, GOOGLE_FONTS_URL } from "./styles.js";

export { escapeHtml };

const PRODUCT_NAME = "Play The Cut";
/** Header wordmark next to logo (one word, uppercase). */
const HEADER_BRAND_WORDMARK = "PLAYTHECUT";
const DEFAULT_APP_URL = "https://playthecut.com";
const LOGO_PATH = "/logo-transparent.png";
/** Compact brand strip (email title lives in body). PNG aspect 678×787. */
const LOGO_HEIGHT = 30;
const LOGO_WIDTH = Math.round((LOGO_HEIGHT * 678) / 787);
const HEADER_BRAND_SIZE_PX = 16;
const HEADER_BRAND_COLOR = "#3f3f46";
/** Wordmark sits lower than logo box center; align text midpoint with golf ball in mark. */
const HEADER_TEXT_OPTICAL_ALIGN_TOP_PX = 10;

function getEmailAssetBaseUrl(): string {
  const raw = process.env.APP_PUBLIC_URL?.trim() || process.env.PUBLIC_APP_URL?.trim();
  return (raw || DEFAULT_APP_URL).replace(/\/$/, "");
}

export function getEmailLogoUrl(): string {
  return `${getEmailAssetBaseUrl()}${LOGO_PATH}`;
}

function emailHeaderHtml(): string {
  const logoUrl = escapeHtml(getEmailLogoUrl());
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="padding-bottom:16px;">
  <tr>
    <td valign="top" style="padding-right:6px;">
      <img
        src="${logoUrl}"
        alt=""
        width="${LOGO_WIDTH}"
        height="${LOGO_HEIGHT}"
        style="display:block;border:0;outline:none;text-decoration:none;height:${LOGO_HEIGHT}px;width:${LOGO_WIDTH}px;max-height:${LOGO_HEIGHT}px;"
      />
    </td>
    <td valign="top" style="padding-top:${HEADER_TEXT_OPTICAL_ALIGN_TOP_PX}px;font-family:${FONT_DISPLAY};color:${HEADER_BRAND_COLOR};font-size:${HEADER_BRAND_SIZE_PX}px;font-weight:600;line-height:${HEADER_BRAND_SIZE_PX}px;letter-spacing:0.2em;text-transform:uppercase;white-space:nowrap;">
      ${escapeHtml(HEADER_BRAND_WORDMARK)}
    </td>
  </tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
  <tr>
    <td style="border-top:1px solid #e4e4e7;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
  </tr>
</table>`;
}

export function wrapEmailHtml(options: { title: string; bodyHtml: string }): string {
  const { title, bodyHtml } = options;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${GOOGLE_FONTS_URL}" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${FONT_BODY};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:32px 28px;">
          <tr>
            <td>${emailHeaderHtml()}</td>
          </tr>
          <tr>
            <td style="font-family:${FONT_BODY};color:#3f3f46;font-size:15px;line-height:1.6;">${bodyHtml}</td>
          </tr>
          <tr>
            <td style="font-family:${FONT_BODY};color:#a1a1aa;font-size:12px;line-height:1.5;padding-top:28px;border-top:1px solid #e4e4e7;margin-top:24px;">
              You received this email from ${escapeHtml(PRODUCT_NAME)}.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Minimal layout test without tournament summary (use buildPreviewEmailHtml for full preview). */
export function buildTestEmailHtml(): string {
  return wrapEmailHtml({
    title: "Test email",
    bodyHtml: `<h1 style="margin:0 0 12px;font-family:${FONT_DISPLAY};font-size:22px;font-weight:700;line-height:1.25;color:#18181b;">Test email</h1>
<p style="margin:0 0 12px;">This is a test message from ${escapeHtml(PRODUCT_NAME)}.</p>
<p style="margin:0;">If you received this, MailerSend is configured correctly.</p>`,
  });
}
