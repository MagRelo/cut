function inviteNetworkClause(depth: number): string {
  if (depth <= 1) return "You invited this player";
  return `In your invite network (level ${depth})`;
}

/** Viewer-relative invite-tree copy (league members, account surfaces). */
export function inviteNetworkLabel(depth: number): string {
  return `${inviteNetworkClause(depth)}.`;
}

/** Copy for the contest-lineup referral-stake badge (win, not in-the-money). */
export function referralStakeLabel(depth: number): string {
  return `${inviteNetworkClause(depth)}. If this lineup wins, you earn a referral bonus.`;
}
