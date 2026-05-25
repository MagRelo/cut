import { escapeHtml } from "../escape.js";
import { FONT_BODY } from "../styles.js";

export function renderLockCountdownBlock(lockLabel: string): string {
  return `<p style="font-family:${FONT_BODY};font-size:14px;font-weight:600;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;margin:0 0 20px;">
  Lineups lock: ${escapeHtml(lockLabel)}
</p>`;
}
