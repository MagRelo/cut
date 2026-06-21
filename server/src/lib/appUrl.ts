const DEFAULT_APP_URL = "https://playthecut.com";

export function getAppPublicUrl(): string {
  const raw = process.env.APP_PUBLIC_URL?.trim() || process.env.PUBLIC_APP_URL?.trim();
  return (raw || DEFAULT_APP_URL).replace(/\/$/, "");
}

export function buildLeagueInviteUrl(
  inviteCode: string,
  referrerAddress?: string | null,
): string {
  const base = `${getAppPublicUrl()}/leagues/join/${inviteCode}`;
  const ref = referrerAddress?.trim().toLowerCase();
  if (!ref) return base;
  return `${base}?ref=${encodeURIComponent(ref)}`;
}
