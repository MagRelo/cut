/** Copy for the contest-lineup referral-stake badge (win, not in-the-money). */
export function referralStakeLabel(depth: number): string {
  if (depth <= 1) {
    return "You invited this player. If this lineup wins, you earn a referral bonus.";
  }
  return `In your invite network (level ${depth}). If this lineup wins, you earn a referral bonus.`;
}
