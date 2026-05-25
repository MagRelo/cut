import { escapeHtml } from "../escape.js";
import { FONT_BODY } from "../styles.js";

export type CtaBlockInput = {
  label: string;
  href: string;
};

export function renderCtaBlock(input: CtaBlockInput): string {
  const href = escapeHtml(input.href);
  const label = escapeHtml(input.label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
  <tr>
    <td>
      <a href="${href}" style="display:inline-block;font-family:${FONT_BODY};font-size:14px;font-weight:600;color:#ffffff;background:#18181b;text-decoration:none;padding:12px 20px;border-radius:6px;">${label}</a>
    </td>
  </tr>
</table>`;
}
