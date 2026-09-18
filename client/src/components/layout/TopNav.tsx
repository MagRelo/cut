import React from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ArrowTopRightOnSquareIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { signInReturnFrom } from "../../lib/navRoutes";
import {
  BRAND_PROSE,
  BRAND_WORDMARK,
  DISCORD_INVITE_URL,
  DISCORD_LABEL,
  DISCORD_TAGLINE,
  STORE_LABEL,
  STORE_TAGLINE,
} from "../../lib/brand";
import { LEFT_TABS } from "../../lib/navTabs";
import { BrandLogo } from "../common/BrandLogo";
import { DiscordIcon } from "../common/DiscordIcon";
import { MobileNavMenu } from "./MobileNavMenu";
import { StagingBadge } from "./StagingBadge";
import { UserMenu } from "./UserMenu";

const tabLinkBase =
  "shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium font-display uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40";

function tabLinkClass(active: boolean) {
  return [
    tabLinkBase,
    active
      ? "bg-slate-100 text-slate-950 font-semibold"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
  ].join(" ");
}

function NavTabLink({ tab, pathname }: { tab: (typeof LEFT_TABS)[number]; pathname: string }) {
  const active = tab.match(pathname);
  return (
    <Link
      to={tab.to}
      state={tab.state}
      aria-current={active ? "page" : undefined}
      className={`${tabLinkClass(active)} inline-flex items-center gap-1.5`}
    >
      {tab.liveDot ? (
        <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden />
      ) : null}
      {tab.label}
    </Link>
  );
}

const overflowItemClass =
  "block w-full px-4 py-2 text-left text-sm font-display text-slate-700 data-[focus]:bg-slate-50";

function DesktopOverflowMenu() {
  return (
    <Menu as="div" className="relative shrink-0">
      <MenuButton
        className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
        aria-label="More"
      >
        <Bars3Icon className="h-5 w-5" aria-hidden />
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="z-50 mt-1 min-w-[14rem] rounded-md border border-slate-200 bg-white py-1 shadow-lg focus:outline-none"
      >
        <MenuItem>
          {({ close }) => (
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${overflowItemClass} flex flex-col items-start`}
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
              className={`${overflowItemClass} flex flex-col items-start`}
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
      </MenuItems>
    </Menu>
  );
}

export const TopNav: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <div className="flex h-14 min-w-0 items-center gap-3 px-4">
        <Link
          to="/"
          aria-label={BRAND_PROSE}
          className="flex shrink-0 items-center gap-1.5 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
        >
          <BrandLogo className="h-9 w-auto" />
          <span className="mt-1.5 font-display text-lg font-medium uppercase leading-none tracking-[0.06em] text-slate-900">
            {BRAND_WORDMARK}
          </span>
          <StagingBadge />
        </Link>

        <nav
          aria-label="Main"
          className="hidden min-w-0 flex-1 items-center justify-end gap-2 md:flex"
        >
          {LEFT_TABS.map((tab) => (
            <NavTabLink key={tab.key} tab={tab} pathname={location.pathname} />
          ))}

          {user ? (
            <UserMenu />
          ) : (
            <>
              <Link
                to="/connect"
                state={{ from: signInReturnFrom }}
                className={tabLinkClass(location.pathname === "/connect")}
              >
                Sign In
              </Link>
              <DesktopOverflowMenu />
            </>
          )}
        </nav>

        <div className="ml-auto md:hidden">
          <MobileNavMenu />
        </div>
      </div>
    </header>
  );
};
