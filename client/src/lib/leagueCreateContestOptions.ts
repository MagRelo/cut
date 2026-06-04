/** Entry fee options (human token units) for league admin quick-create. */
export const LEAGUE_ENTRY_FEE_OPTIONS = [0, 10, 20, 50, 100, 500, 1000] as const;

export type LeagueEntryFee = (typeof LEAGUE_ENTRY_FEE_OPTIONS)[number];

/** Invite reward % for `_referralNetworkBps` (7%–20% in 0.5% steps). */
export const LEAGUE_INVITE_REWARD_PERCENTS = Array.from(
  { length: (20 - 7) / 0.5 + 1 },
  (_, index) => 7 + index * 0.5,
) as readonly number[];

export function inviteRewardPercentToBps(percent: number): number {
  return Math.round(percent * 100);
}

export function formatInviteRewardPercent(percent: number): string {
  return Number.isInteger(percent) ? `${percent}%` : `${percent}%`;
}

export function formatLeagueEntryFee(fee: LeagueEntryFee, tokenSymbol: string): string {
  if (fee === 0) return "Free";
  return `${fee} ${tokenSymbol}`;
}
