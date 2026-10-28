function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function trimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function trimmedStringField(metadata: unknown, key: string): string | null {
  const record = asRecord(metadata);
  if (!record) return null;
  return trimmedString(record[key]);
}

export function trimmedNestedStringField(
  metadata: unknown,
  blockKey: string,
  field: string,
): string | null {
  const record = asRecord(metadata);
  if (!record) return null;
  const block = asRecord(record[blockKey]);
  if (!block) return null;
  return trimmedString(block[field]);
}
