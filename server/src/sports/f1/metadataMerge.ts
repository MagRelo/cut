import type { F1EventMetadata } from "@cut/sport-f1";
import { parseF1EventMetadata } from "@cut/sport-f1";

export function mergeF1EventMetadata(
  existing: unknown,
  patch: {
    name?: string;
    f1: Partial<F1EventMetadata>;
  },
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  const existingF1 = parseF1EventMetadata(existing) ?? ({} as Partial<F1EventMetadata>);

  return {
    ...base,
    ...(patch.name ? { name: patch.name } : {}),
    f1: {
      ...existingF1,
      ...patch.f1,
    },
  };
}

export function requireF1Metadata(metadata: unknown): F1EventMetadata {
  const f1 = parseF1EventMetadata(metadata);
  if (!f1) {
    throw new Error("Event metadata is missing required f1 block");
  }
  return f1;
}
