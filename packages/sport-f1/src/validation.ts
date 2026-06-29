import type { RosterRules, ValidationResult } from "@cut/sport-sdk";

export function validateF1Roster(
  picks: string[],
  rules: RosterRules,
  validEventParticipantIds: Set<string>,
): ValidationResult {
  const errors: string[] = [];

  if (picks.length < rules.minPicks) {
    errors.push(`At least ${rules.minPicks} picks are required`);
  }
  if (picks.length > rules.maxPicks) {
    errors.push(`At most ${rules.maxPicks} picks are allowed`);
  }
  if (!rules.allowDuplicates && new Set(picks).size !== picks.length) {
    errors.push("Duplicate picks are not allowed");
  }

  for (const pickId of picks) {
    if (!validEventParticipantIds.has(pickId)) {
      errors.push(`Pick ${pickId} is not in this event`);
    }
  }

  return { valid: errors.length === 0, errors };
}
