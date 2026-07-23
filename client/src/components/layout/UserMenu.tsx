import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ArrowTopRightOnSquareIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { formatUnits } from "viem";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { accountMatch } from "../../lib/navRoutes";
import {
  ACCOUNT_SUB_LINKS,
  ADMIN_MENU_LINKS,
  LEAGUES_TAB,
  LEFT_TABS,
  leagueNavItemsFromAuth,
} from "../../lib/navTabs";

const menuItemClass =
  "block w-full px-4 py-2 text-left text-sm font-display text-slate-700 data-[focus]:bg-slate-50";

const menuItemActiveClass =
  "block w-full px-4 py-2 text-left text-sm font-display font-semibold text-slate-950 data-[focus]:bg-slate-50";

const menuSubItemClass =
  "block w-full px-4 py-1.5 pl-7 text-left text-sm font-display text-slate-600 data-[focus]:bg-slate-50";

const menuSubItemActiveClass =
  "block w-full px-4 py-1.5 pl-7 text-left text-sm font-display font-semibold text-slate-950 data-[focus]:bg-slate-50";

export const UserMenu: React.FC = () => {
  const { user, logout, paymentTokenBalance, balancesUnavailable, isAdmin } = useAuth();
  const showAdminNav = isAdmin();
  const location = useLocation();
  const isAccountActive = accountMatch(location.pathname);
  const leagues = leagueNavItemsFromAuth(user?.userGroups);
  const liveContestsTab = LEFT_TABS[0];

  const totalBalance = balancesUnavailable
    ? null
    : Number(formatUnits(paymentTokenBalance ?? 0n, 6)).toFixed(2);

  return (
    <Menu as="div" className="relative shrink-0">
      <MenuButton
        className={[
          "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 font-display text-sm font-medium transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40",
          isAccountActive
            ? "bg-slate-100 font-semibold text-slate-950"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        ].join(" ")}
        aria-label="My Account menu"
      >
        {totalBalance !== null ? (
          <span className="tabular-nums tracking-normal">${totalBalance}</span>
        ) : (
          <span
            className="tabular-nums tracking-normal text-amber-800"
            title="Could not load balance from the network"
          >
            —
          </span>
        )}
        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className="z-50 mt-1 min-w-[14rem] rounded-md border border-slate-200 bg-white py-1 shadow-lg focus:outline-none"
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

        <div className="my-1 border-t border-slate-100" role="separator" />

        {ACCOUNT_SUB_LINKS.map((link) => {
          const active = link.match(location.pathname);
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

        {showAdminNav ? (
          <>
            <div className="my-1 border-t border-slate-100" role="separator" />
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

        <div className="my-1 border-t border-slate-100" role="separator" />

        <MenuItem>
          {({ close }) => (
            <a
              href="https://playthecut.printful.me/?sort=price"
              target="_blank"
              rel="noopener noreferrer"
              className={`${menuItemClass} inline-flex items-center gap-1.5`}
              onClick={close}
              aria-label="Cut Store"
            >
              <img src="/logo-transparent.png" alt="" className="h-5 w-auto shrink-0" />
              STORE
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </a>
          )}
        </MenuItem>

        <MenuItem>
          <button type="button" className={menuItemClass} onClick={() => void logout()}>
            Sign Out
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
};
