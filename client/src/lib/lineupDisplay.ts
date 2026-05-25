export const DEFAULT_USER_COLOR = "#9CA3AF";

export function isValidHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}

export function getLineupNumberLabel(lineupName?: string): string | null {
  if (!lineupName) return null;
  const match = lineupName.match(/lineup\s*#\s*(\d+)/i);
  return match?.[1] ? `#${match[1]}` : null;
}

export function resolveUserBorderColor(userColor: unknown): string {
  return isValidHexColor(userColor) ? userColor.trim() : DEFAULT_USER_COLOR;
}
