import type { Location } from "react-router-dom";

/** After Sign In from the nav, land on the live contests hub. */
export const signInReturnFrom: Pick<Location, "pathname" | "search" | "hash"> = {
  pathname: "/contests",
  search: "",
  hash: "",
};

export const sportsMatch = (pathname: string) => pathname.startsWith("/sports/");

export const contestsMatch = (pathname: string) =>
  pathname === "/" ||
  pathname === "/contests" ||
  pathname.startsWith("/contests/") ||
  pathname.startsWith("/contest/") ||
  sportsMatch(pathname);

export const lineupsMatch = (pathname: string) => pathname.startsWith("/lineups");

export const leaguesMatch = (pathname: string) => pathname.startsWith("/leagues");

export const userGroupsMatch = (pathname: string) => pathname.startsWith("/user-groups");

export const leaderboardMatch = (pathname: string) =>
  pathname === "/leaderboard" || /^\/sports\/[^/]+\/leaderboard$/.test(pathname);

export const accountMatch = (pathname: string) =>
  pathname.startsWith("/account") || pathname === "/connect";

export const adminMatch = (pathname: string) => pathname.startsWith("/admin");
