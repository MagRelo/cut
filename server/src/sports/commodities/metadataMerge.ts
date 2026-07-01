import type { CommoditiesEventMetadata } from "@cut/sport-commodities";
import { parseCommoditiesEventMetadata } from "@cut/sport-commodities";
import { mergeEventPeriodFields, type EventPeriodPatch } from "@cut/sport-sdk";

export function mergeCommoditiesEventMetadata(
  existing: unknown,
  patch: {
    name?: string;
    beautyImage?: string;
    commodities: Partial<CommoditiesEventMetadata>;
  } & EventPeriodPatch,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  const existingCommodities = parseCommoditiesEventMetadata(existing) ?? ({} as Partial<CommoditiesEventMetadata>);

  const withPeriods = mergeEventPeriodFields(base, patch);

  return {
    ...withPeriods,
    ...(patch.name ? { name: patch.name } : {}),
    ...(patch.beautyImage ? { beautyImage: patch.beautyImage } : {}),
    commodities: {
      ...existingCommodities,
      ...patch.commodities,
    },
  };
}

export function requireCommoditiesMetadata(metadata: unknown): CommoditiesEventMetadata {
  const commodities = parseCommoditiesEventMetadata(metadata);
  if (!commodities) {
    throw new Error("Event metadata is missing required commodities block");
  }
  return commodities;
}
