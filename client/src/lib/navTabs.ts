import type { Location } from "react-router-dom";
import { adminMatch, contestsMatch, leaguesMatch, userGroupsMatch } from "./navRoutes";

export type NavTab = {
  key: string;
  to: string;
  label: string;
  match: (pathname: string) => boolean;
  state?: Location["state"];
  /** Small live indicator dot (e.g. blue circle) before the label. */
  liveDot?: boolean;
};

export const CONTEST_HISTORY_LINK = {
  to: "/account/history",
  label: "Contest History",
  match: (pathname: string) => pathname === "/account/history",
} as const;

export const ACCOUNT_FUNDS_LINK = {
  to: "/account/funds",
  label: "Manage Funds",
  match: (pathname: string) => pathname === "/account/funds",
} as const;

export const ACCOUNT_HOME_LINK = {
  to: "/account",
  label: "Account Settings",
  match: (pathname: string) => pathname === "/account",
} as const;

export const LEAGUES_TAB: NavTab = {
  key: "leagues",
  to: "/leagues",
  label: "My Leagues",
  match: (pathname) => leaguesMatch(pathname) || userGroupsMatch(pathname),
};

/** Account links shown under Account in nav menus. */
export const ACCOUNT_SUB_LINKS = [
  ACCOUNT_HOME_LINK,
  ACCOUNT_FUNDS_LINK,
  CONTEST_HISTORY_LINK,
] as const;

export type LeagueNavItem = {
  id: string;
  name: string;
  to: string;
  match: (pathname: string) => boolean;
};

/** Membership rows from GET /auth/me → links for the Leagues nav submenu. */
export function leagueNavItemsFromAuth(
  userGroups:
    | Array<{ userGroup?: { id?: string; name?: string | null } | null }>
    | null
    | undefined,
): LeagueNavItem[] {
  if (!userGroups?.length) return [];
  const items: LeagueNavItem[] = [];
  for (const membership of userGroups) {
    const id = membership.userGroup?.id;
    const name = membership.userGroup?.name;
    if (!id || !name) continue;
    const to = `/leagues/${id}`;
    items.push({
      id,
      name,
      to,
      match: (pathname) => pathname === to || pathname.startsWith(`${to}/`),
    });
  }
  return items;
}

export const LEFT_TABS: NavTab[] = [
  {
    key: "contests",
    to: "/contests",
    label: "Live Contests",
    match: contestsMatch,
    liveDot: true,
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
] as const;
