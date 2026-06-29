const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseCommoditiesSessionExternalId(externalId: string): string {
  const trimmed = externalId.trim();
  if (!ISO_DATE_PATTERN.test(trimmed)) {
    throw new Error(
      `Invalid commodities externalId "${externalId}" — expected ISO date YYYY-MM-DD`,
    );
  }

  const parsed = new Date(`${trimmed}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid commodities externalId "${externalId}" — not a valid calendar date`);
  }

  return trimmed;
}
