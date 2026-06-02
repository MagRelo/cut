export type PagePanelVariant = "default" | "flush";

export function getPagePanelVariant(pathname: string): PagePanelVariant {
  if (pathname === "/leaderboard") return "flush";
  if (/^\/contest\//.test(pathname)) return "flush";
  return "default";
}
