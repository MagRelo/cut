import type { Location } from "react-router-dom";

/** After Sign In from the nav, land on contests (not account). */
export const signInReturnFrom: Pick<Location, "pathname" | "search" | "hash"> = {
  pathname: "/contests",
  search: "",
  hash: "",
};

export const contestsMatch = (pathname: string) =>
  pathname === "/contests" ||
  pathname.startsWith("/contests/") ||
  pathname.startsWith("/contest/");

export const lineupsMatch = (pathname: string) => pathname.startsWith("/lineups");

export const leaderboardMatch = (pathname: string) => pathname === "/leaderboard";

export const accountMatch = (pathname: string) =>
  pathname.startsWith("/account") || pathname === "/connect";

export const adminMatch = (pathname: string) => pathname.startsWith("/admin");
