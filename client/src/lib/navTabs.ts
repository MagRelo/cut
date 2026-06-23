import type { Location } from "react-router-dom";
import {
  adminMatch,
  contestsMatch,
  leaguesMatch,
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

export const ACCOUNT_FUNDS_LINK = {
  to: "/account/funds",
  label: "Manage Funds",
  match: (pathname: string) => pathname === "/account/funds",
} as const;

export const LEAGUES_TAB: NavTab = {
  key: "leagues",
  to: "/leagues",
  label: "My Leagues",
  match: (pathname) => leaguesMatch(pathname) || userGroupsMatch(pathname),
};

/** Indented links nested under Account in user menus. */
export const ACCOUNT_SUB_LINKS = [LEAGUES_TAB, ACCOUNT_FUNDS_LINK, CONTEST_HISTORY_LINK] as const;

export const LEFT_TABS: NavTab[] = [
  {
    key: "contests",
    to: "/contests",
    label: "Live Contests",
    match: contestsMatch,
  },
];

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
