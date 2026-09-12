import { ClockIcon, Cog6ToothIcon, WalletIcon } from "@heroicons/react/24/outline";
import { TreeIcon } from "../components/common/TreeIcon";
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

export const ACCOUNT_WALLET_LINK = {
  to: "/account/funds",
  label: "Wallet",
  match: (pathname: string) => pathname === "/account/funds",
  Icon: WalletIcon,
} as const;

export const ACCOUNT_SETTINGS_LINK = {
  to: "/account/settings",
  label: "Settings",
  match: (pathname: string) => pathname === "/account/settings",
  Icon: Cog6ToothIcon,
} as const;

export const ACCOUNT_ACTIVITY_LINK = {
  to: "/account/activity",
  label: "Activity",
  match: (pathname: string) =>
    pathname === "/account/activity" || pathname === "/account/history",
  Icon: ClockIcon,
} as const;

export const ACCOUNT_REFERRALS_LINK = {
  to: "/account/referrals",
  label: "Referral Network",
  match: (pathname: string) =>
    pathname === "/account/referrals" || pathname === "/referrals",
  Icon: TreeIcon,
} as const;

export const LEAGUES_TAB: NavTab = {
  key: "leagues",
  to: "/leagues",
  label: "Leagues",
  match: (pathname) => leaguesMatch(pathname) || userGroupsMatch(pathname),
};

/** Account links shown under Account in nav menus. */
export const ACCOUNT_SUB_LINKS = [
  ACCOUNT_WALLET_LINK,
  ACCOUNT_REFERRALS_LINK,
  ACCOUNT_ACTIVITY_LINK,
  ACCOUNT_SETTINGS_LINK,
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
