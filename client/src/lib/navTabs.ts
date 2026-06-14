import type { Location } from "react-router-dom";
import { DEFAULT_SPORT_ID } from "../hooks/useSportData";
import {
  adminMatch,
  contestsMatch,
  leaderboardMatch,
  leaguesMatch,
  lineupsMatch,
  userGroupsMatch,
} from "./navRoutes";

export type NavTab = {
  key: string;
  to: string;
  label: string;
  match: (pathname: string) => boolean;
  state?: Location["state"];
};

export const CONTEST_HISTORY_LINK = {
  to: "/account/history",
  label: "My Contest History",
  match: (pathname: string) => pathname === "/account/history",
} as const;

export const LEFT_TABS: NavTab[] = [
  {
    key: "leaderboard",
    to: "/leaderboard",
    label: "Leaderboard",
    match: leaderboardMatch,
  },
  {
    key: "contests",
    to: `/sports/${DEFAULT_SPORT_ID}`,
    label: "Live Contests",
    match: contestsMatch,
  },
];

export const LINEUPS_TAB: NavTab = {
  key: "lineups",
  to: "/lineups",
  label: "My Lineups",
  match: lineupsMatch,
};

export const LEAGUES_TAB: NavTab = {
  key: "leagues",
  to: "/leagues",
  label: "My Leagues",
  match: (pathname) => leaguesMatch(pathname) || userGroupsMatch(pathname),
};

export const ADMIN_TAB: NavTab = {
  key: "admin",
  to: "/admin",
  label: "Admin",
  match: adminMatch,
};

export const ADMIN_MENU_LINKS = [
  { to: "/admin", label: "Admin Tools" },
  { to: "/admin/users", label: "Manage Users" },
] as const;
