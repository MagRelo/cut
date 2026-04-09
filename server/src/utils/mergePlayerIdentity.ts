import type { Prisma } from "@prisma/client";
import type { PlayerProfileData } from "../lib/pgaPlayerProfile.js";
import type { PGAPlayer } from "../schemas/pgaTour.js";

type IdentitySnapshot = {
  pga_displayName?: string | null;
  pga_firstName?: string | null;
  pga_lastName?: string | null;
  pga_shortName?: string | null;
  pga_imageUrl?: string | null;
  pga_country?: string | null;
  pga_countryFlag?: string | null;
};

/**
 * Fills empty Player identity fields from playerProfileOverview.headshot.
 * Always refreshes headshot URL when the API returns one (keeps images current).
 */
export function mergeIdentityFromProfileHeadshot(
  existing: IdentitySnapshot,
  profile: PlayerProfileData,
): Prisma.PlayerUpdateInput {
  const h = profile.headshot;
  const patch: Prisma.PlayerUpdateInput = {};
  if (h?.image) patch.pga_imageUrl = h.image;
  if (!existing.pga_firstName?.trim() && h?.firstName) patch.pga_firstName = h.firstName;
  if (!existing.pga_lastName?.trim() && h?.lastName) patch.pga_lastName = h.lastName;
  if (!existing.pga_displayName?.trim()) {
    const combined = [h?.firstName, h?.lastName].filter(Boolean).join(" ").trim();
    if (combined) patch.pga_displayName = combined;
  }
  if (!existing.pga_country?.trim() && h?.country) patch.pga_country = h.country;
  if (!existing.pga_countryFlag?.trim() && h?.countryFlag) patch.pga_countryFlag = h.countryFlag;
  return patch;
}

/** Fills empty Player identity fields from playerDirectory row. */
export function mergeIdentityFromDirectoryPlayer(
  existing: IdentitySnapshot,
  d: PGAPlayer,
): Prisma.PlayerUpdateInput {
  const patch: Prisma.PlayerUpdateInput = {};
  if (!existing.pga_imageUrl?.trim() && d.headshot) patch.pga_imageUrl = d.headshot;
  if (!existing.pga_firstName?.trim() && d.firstName) patch.pga_firstName = d.firstName;
  if (!existing.pga_lastName?.trim() && d.lastName) patch.pga_lastName = d.lastName;
  if (!existing.pga_shortName?.trim() && d.shortName) patch.pga_shortName = d.shortName;
  if (!existing.pga_displayName?.trim() && d.displayName?.trim()) {
    patch.pga_displayName = d.displayName;
  }
  if (!existing.pga_country?.trim() && d.country) patch.pga_country = d.country;
  if (!existing.pga_countryFlag?.trim() && d.countryFlag) patch.pga_countryFlag = d.countryFlag;
  return patch;
}
