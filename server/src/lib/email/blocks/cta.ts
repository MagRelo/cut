import { escapeHtml } from "../escape.js";
import { FONT_DISPLAY } from "../styles.js";

export type CtaBlockInput = {
  label: string;
  href: string;
};

export type CtaBlockOptions = {
  /** Outer table margin; defaults to standard single-CTA spacing. */
  margin?: string;
};

const DEFAULT_CTA_MARGIN = "24px 0 20px";

export function renderCtaBlock(input: CtaBlockInput, options?: CtaBlockOptions): string {
  const href = escapeHtml(input.href);
  const label = `${escapeHtml(input.label)}&nbsp;&#8599;`;
  const margin = options?.margin ?? DEFAULT_CTA_MARGIN;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:${margin};width:100%;">
  <tr>
    <td align="center">
      <a href="${href}" style="display:inline-block;font-family:${FONT_DISPLAY};font-size:14px;font-weight:600;color:#ffffff;background:#3b82f6;border:1px solid #3b82f6;text-decoration:none;padding:10px 16px;border-radius:8px;box-shadow:0 4px 6px rgba(15,23,42,0.15);line-height:1.2;">${label}</a>
    </td>
  </tr>
</table>`;
}
