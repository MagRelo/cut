type MetadataRecord = Record<string, unknown>;

function asMetadataRecord(metadata: unknown): MetadataRecord | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as MetadataRecord;
}

function readStringField(record: MetadataRecord, primary: string, legacy: string): string | null {
  const primaryValue = record[primary];
  if (typeof primaryValue === "string" && primaryValue.trim()) {
    return primaryValue.trim();
  }
  const legacyValue = record[legacy];
  if (typeof legacyValue === "string" && legacyValue.trim()) {
    return legacyValue.trim();
  }
  return null;
}

function readNumberField(record: MetadataRecord, primary: string, legacy: string): number | null {
  const primaryValue = record[primary];
  if (typeof primaryValue === "number" && Number.isFinite(primaryValue)) {
    return Math.round(primaryValue);
  }
  const legacyValue = record[legacy];
  if (typeof legacyValue === "number" && Number.isFinite(legacyValue)) {
    return Math.round(legacyValue);
  }
  return null;
}

/** Active scoring period (1-indexed) on event or participant score metadata. */
export function readCurrentPeriod(metadata: unknown): number | null {
  const record = asMetadataRecord(metadata);
  if (!record) return null;
  return readNumberField(record, "currentPeriod", "currentRound");
}

/** Short label for the active period (e.g. `R2`, `D3`). */
export function readPeriodDisplay(metadata: unknown): string | null {
  const record = asMetadataRecord(metadata);
  if (!record) return null;
  return readStringField(record, "periodDisplay", "roundDisplay");
}

/** Human-readable active period status. */
export function readPeriodStatusDisplay(metadata: unknown): string | null {
  const record = asMetadataRecord(metadata);
  if (!record) return null;
  return readStringField(record, "periodStatusDisplay", "roundStatusDisplay");
}

export type EventPeriodPatch = {
  currentPeriod?: number | null;
  periodDisplay?: string | null;
  periodStatusDisplay?: string | null;
};

const LEGACY_PERIOD_KEYS = ["currentRound", "roundDisplay", "roundStatusDisplay"] as const;

/** Merge period fields onto metadata and drop legacy round* keys. */
export function mergeEventPeriodFields(
  metadata: unknown,
  patch: EventPeriodPatch,
): MetadataRecord {
  const base = asMetadataRecord(metadata) ?? {};
  const next: MetadataRecord = { ...base };

  for (const legacyKey of LEGACY_PERIOD_KEYS) {
    delete next[legacyKey];
  }

  if (patch.currentPeriod != null) {
    next.currentPeriod = patch.currentPeriod;
  }
  if (patch.periodDisplay != null && patch.periodDisplay.trim()) {
    next.periodDisplay = patch.periodDisplay.trim();
  }
  if (patch.periodStatusDisplay != null && patch.periodStatusDisplay.trim()) {
    next.periodStatusDisplay = patch.periodStatusDisplay.trim();
  }

  return next;
}

/** Drop legacy round* period keys from stored metadata. */
export function stripLegacyPeriodFields(metadata: unknown): MetadataRecord {
  const base = asMetadataRecord(metadata) ?? {};
  const next: MetadataRecord = { ...base };
  for (const legacyKey of LEGACY_PERIOD_KEYS) {
    delete next[legacyKey];
  }
  return next;
}

/** Rename `currentRound` → `currentPeriod` on participant score JSON. */
export function mergeScoreDataPeriodFields(
  scoreData: unknown,
  patch: { currentPeriod?: number | null },
): MetadataRecord {
  const base = asMetadataRecord(scoreData) ?? {};
  const next: MetadataRecord = { ...base };
  delete next.currentRound;

  if (patch.currentPeriod != null) {
    next.currentPeriod = patch.currentPeriod;
  }

  return next;
}

export function readScoreDataCurrentPeriod(scoreData: unknown): number | null {
  return readCurrentPeriod(scoreData);
}
