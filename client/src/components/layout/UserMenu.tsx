import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ArrowTopRightOnSquareIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { accountMatch } from "../../lib/navRoutes";
import {
  DISCORD_INVITE_URL,
  DISCORD_LABEL,
  DISCORD_TAGLINE,
  STORE_LABEL,
  STORE_TAGLINE,
} from "../../lib/brand";
import { BrandLogo } from "../common/BrandLogo";
import { DiscordIcon } from "../common/DiscordIcon";
import {
  ACCOUNT_SUB_LINKS,
  ADMIN_MENU_LINKS,
  LEAGUES_TAB,
  LEFT_TABS,
  leagueNavItemsFromAuth,
} from "../../lib/navTabs";

const menuItemClass =
  "block w-full px-4 py-2 text-left text-sm font-display text-slate-700 focus:outline-none data-[focus]:bg-slate-50";

const menuItemActiveClass =
  "block w-full px-4 py-2 text-left text-sm font-display font-semibold text-slate-950 focus:outline-none data-[focus]:bg-slate-50";

const menuSubItemClass =
  "block w-full px-4 py-1.5 pl-7 text-left text-sm font-display text-slate-600 focus:outline-none data-[focus]:bg-slate-50";

const menuSubItemActiveClass =
  "block w-full px-4 py-1.5 pl-7 text-left text-sm font-display font-semibold text-slate-950 focus:outline-none data-[focus]:bg-slate-50";

export const UserMenu: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const showAdminNav = isAdmin();
  const location = useLocation();
  const isAccountActive = accountMatch(location.pathname);
  const leagues = leagueNavItemsFromAuth(user?.userGroups);
  const liveContestsTab = LEFT_TABS[0];
  const accountLabel = user?.name?.trim() || "Account";

  return (
    <Menu as="div" className="relative shrink-0">
      <MenuButton
        className={[
          "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 font-display text-sm font-medium transition-colors",
          isAccountActive
            ? "bg-slate-100 font-semibold text-slate-950"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        ].join(" ")}
        aria-label={`${accountLabel} menu`}
      >
        <span className="max-w-[10rem] truncate">{accountLabel}</span>
        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className="z-50 mt-1 min-w-[14rem] rounded-md border border-slate-300 bg-white py-1 shadow-lg focus:outline-none"
      >
        <MenuItem>
          {({ close }) => {
            const active = liveContestsTab.match(location.pathname);
            return (
              <Link
                to={liveContestsTab.to}
                state={liveContestsTab.state}
                className={`${active ? menuItemActiveClass : menuItemClass} inline-flex items-center gap-2`}
                aria-current={active ? "page" : undefined}
                onClick={close}
              >
                {liveContestsTab.liveDot ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden />
                ) : null}
                {liveContestsTab.label}
              </Link>
            );
          }}
        </MenuItem>

        <MenuItem>
          {({ close }) => {
            const active =
              location.pathname === LEAGUES_TAB.to || location.pathname === "/user-groups";
            return (
              <Link
                to={LEAGUES_TAB.to}
                className={active ? menuItemActiveClass : menuItemClass}
                aria-current={active ? "page" : undefined}
                onClick={close}
              >
                {LEAGUES_TAB.label}
              </Link>
            );
          }}
        </MenuItem>

        {leagues.map((league) => {
          const active = league.match(location.pathname);
          return (
            <MenuItem key={league.id}>
              {({ close }) => (
                <Link
                  to={league.to}
                  className={active ? menuSubItemActiveClass : menuSubItemClass}
                  aria-current={active ? "page" : undefined}
                  onClick={close}
                >
                  {league.name}
                </Link>
              )}
            </MenuItem>
          );
        })}

        <div className="my-1 border-t border-slate-300" role="separator" />

        {user?.name ? (
          <p className="truncate px-4 pb-1 pt-1.5 font-display text-sm font-medium uppercase tracking-wider text-slate-600">
            {user.name}
          </p>
        ) : null}

        {ACCOUNT_SUB_LINKS.map((link) => {
          const active = link.match(location.pathname);
          return (
            <MenuItem key={link.to}>
              {({ close }) => (
                <Link
                  to={link.to}
                  className={`${active ? menuItemActiveClass : menuItemClass} inline-flex w-full items-center gap-2`}
                  aria-current={active ? "page" : undefined}
                  onClick={close}
                >
                  <link.Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {link.label}
                </Link>
              )}
            </MenuItem>
          );
        })}

        <div className="my-1 border-t border-slate-300" role="separator" />

        <MenuItem>
          {({ close }) => (
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${menuItemClass} flex flex-col items-start`}
              onClick={close}
            >
              <span className="inline-flex items-center gap-1.5">
                <DiscordIcon className="h-4 w-4 shrink-0" />
                {DISCORD_LABEL}
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </span>
              <span className="mt-0.5 text-xs font-normal text-slate-500">{DISCORD_TAGLINE}</span>
            </a>
          )}
        </MenuItem>

        <MenuItem>
          {({ close }) => (
            <a
              href="https://playthecut.printful.me/?sort=price"
              target="_blank"
              rel="noopener noreferrer"
              className={`${menuItemClass} flex flex-col items-start`}
              onClick={close}
              aria-label="Cut Store"
            >
              <span className="inline-flex items-center gap-1.5">
                <BrandLogo className="h-5 w-auto shrink-0" />
                {STORE_LABEL}
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </span>
              <span className="mt-0.5 text-xs font-normal text-slate-500">{STORE_TAGLINE}</span>
            </a>
          )}
        </MenuItem>

        {showAdminNav ? (
          <>
            <div className="my-1 border-t border-slate-300" role="separator" />
            {ADMIN_MENU_LINKS.map((link) => {
              const active =
                location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);
              return (
                <MenuItem key={link.to}>
                  {({ close }) => (
                    <Link
                      to={link.to}
                      className={active ? menuItemActiveClass : menuItemClass}
                      aria-current={active ? "page" : undefined}
                      onClick={close}
                    >
                      {link.label}
                    </Link>
                  )}
                </MenuItem>
              );
            })}
          </>
        ) : null}
      </MenuItems>
    </Menu>
  );
};
