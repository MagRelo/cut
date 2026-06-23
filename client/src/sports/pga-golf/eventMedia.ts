/** Used when `beautyImage` is unset, empty, or null. */
export const DEFAULT_TOURNAMENT_BEAUTY_IMAGE =
  "https://res.cloudinary.com/pgatour-prod/w_854,h_480,c_fill,f_auto,q_auto/pgatour/news/editorial/2023/04/30/quail-hollow-1694-kk.png";

/** Resolves the header/hero image URL; API may omit `beautyImage` or send null. */
export function resolveTournamentBeautyImage(beautyImage: string | null | undefined): string {
  const trimmed = beautyImage?.trim();
  return trimmed || DEFAULT_TOURNAMENT_BEAUTY_IMAGE;
}
