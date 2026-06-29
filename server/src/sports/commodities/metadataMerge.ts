import type { CommoditiesEventMetadata } from "@cut/sport-commodities";
import { parseCommoditiesEventMetadata } from "@cut/sport-commodities";

export function mergeCommoditiesEventMetadata(
  existing: unknown,
  patch: {
    name?: string;
    beautyImage?: string;
    commodities: Partial<CommoditiesEventMetadata>;
  },
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  const existingCommodities = parseCommoditiesEventMetadata(existing) ?? ({} as Partial<CommoditiesEventMetadata>);

  return {
    ...base,
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
