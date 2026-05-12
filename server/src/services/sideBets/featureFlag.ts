/** Accepts true / True / TRUE / 1 / yes (trimmed). Dotenv and shells vary. */
export function sideBetsEnabled(): boolean {
  const raw = process.env.SIDE_BETS_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}
