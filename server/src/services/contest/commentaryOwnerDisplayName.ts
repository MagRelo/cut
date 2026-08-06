/**
 * Lineup number suffix from a lineup name (matches client getLineupNumberLabel).
 * "Lineup #2" → "#2"
 */
export function lineupNumberLabel(lineupName?: string | null): string | null {
  if (!lineupName) return null;
  const match = lineupName.match(/lineup\s*#\s*(\d+)/i);
  return match?.[1] ? `#${match[1]}` : null;
}

/**
 * Contest commentary owner label. When a user has multiple entries, append the
 * lineup number so copy can distinguish them (e.g. "Noodles #2").
 */
export function commentaryOwnerDisplayName(params: {
  userName: string | null | undefined;
  lineupName?: string | null;
  /** How many contest entries this user has in the contest. */
  userEntryCount: number;
}): string {
  const base = params.userName?.trim() || "Unknown";
  if (params.userEntryCount < 2) return base;
  const numberLabel = lineupNumberLabel(params.lineupName);
  return numberLabel ? `${base} ${numberLabel}` : base;
}
