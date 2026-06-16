export type PagePanelVariant = "default" | "flush";

export function getPagePanelVariant(pathname: string): PagePanelVariant {
  if (/^\/sports\/[^/]+\/leaderboard$/.test(pathname)) {
    return "flush";
  }
  if (/^\/contest\//.test(pathname)) return "flush";
  return "default";
}
