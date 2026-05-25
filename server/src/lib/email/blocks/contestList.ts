import { escapeHtml } from "../escape.js";
import { FONT_BODY, SECTION_TITLE_STYLE, SUMMARY_ITEM_STYLE } from "../styles.js";

export type ContestListItem = {
  name: string;
  buyInLabel?: string;
  groupName?: string;
};

export function renderContestListBlock(
  title: string,
  contests: ContestListItem[],
): string {
  if (contests.length === 0) {
    return `<p style="font-family:${FONT_BODY};font-size:14px;color:#71717a;margin:0 0 16px;">No open contests right now.</p>`;
  }

  const itemsHtml = contests
    .map((c) => {
      const buyIn = c.buyInLabel ? ` — ${escapeHtml(c.buyInLabel)}` : "";
      const group = c.groupName ? ` <span style="color:#71717a;">(${escapeHtml(c.groupName)})</span>` : "";
      return `<p style="${SUMMARY_ITEM_STYLE}">&#8226;&nbsp;<span style="font-weight:600;color:#18181b;">${escapeHtml(c.name)}</span>${buyIn}${group}</p>`;
    })
    .join("");

  return `<div style="margin:0 0 20px;">
<h2 style="${SECTION_TITLE_STYLE}">${escapeHtml(title)}</h2>
${itemsHtml}
</div>`;
}
