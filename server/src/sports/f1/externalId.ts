export function parseF1SessionExternalId(externalId: string): number {
  const trimmed = externalId.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(
      `Invalid F1 externalId "${externalId}" — expected OpenF1 Race session_key (positive integer)`,
    );
  }
  const key = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(key) || key <= 0) {
    throw new Error(
      `Invalid F1 externalId "${externalId}" — expected OpenF1 Race session_key (positive integer)`,
    );
  }
  return key;
}
