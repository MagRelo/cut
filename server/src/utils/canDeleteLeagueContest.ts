/**
 * League admins may remove an OPEN contest when it is free, or paid and still empty.
 * Public contests (no league) are never removable through this path.
 */
export function canDeleteLeagueContest(input: {
  userGroupId?: string | null;
  status?: string | null;
  primaryDeposit: unknown;
  entryCount: number;
}): boolean {
  if (!input.userGroupId) return false;
  if (input.status !== "OPEN") return false;
  if (input.primaryDeposit === 0) return true;
  return (
    typeof input.primaryDeposit === "number" &&
    input.primaryDeposit > 0 &&
    input.entryCount === 0
  );
}

export function primaryDepositFromSettings(settings: unknown): unknown {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return undefined;
  return (settings as { primaryDeposit?: unknown }).primaryDeposit;
}
