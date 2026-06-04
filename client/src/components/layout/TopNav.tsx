import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { signInReturnFrom } from "../../lib/navRoutes";
import { LEFT_TABS, LINEUPS_TAB } from "../../lib/navTabs";
import { MobileNavMenu } from "./MobileNavMenu";
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

function NavTabLink({
  tab,
  pathname,
}: {
  tab: (typeof LEFT_TABS)[number] | typeof LINEUPS_TAB;
  pathname: string;
}) {
  const active = tab.match(pathname);
  return (
    <Link
      to={tab.to}
      state={tab.state}
      aria-current={active ? "page" : undefined}
      className={tabLinkClass(active)}
    >
      {tab.label}
    </Link>
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
          className="flex shrink-0 items-center gap-2 rounded-sm opacity-90 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
        >
          <img src="/logo-transparent.png" alt="" className="h-7 w-auto" />
          <span className="font-display text-lg uppercase tracking-widest text-slate-900">
            PlayTheCut
          </span>
        </Link>

        {/* Desktop: left group + right group */}
        <nav
          aria-label="Main"
          className="hidden min-w-0 flex-1 items-center justify-between md:flex"
        >
          <div className="flex items-center gap-0.5">
            {LEFT_TABS.map((tab) => (
              <NavTabLink key={tab.key} tab={tab} pathname={location.pathname} />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <NavTabLink tab={LINEUPS_TAB} pathname={location.pathname} />
                <UserMenu />
              </>
            ) : (
              <Link
                to="/connect"
                state={{ from: signInReturnFrom }}
                className={tabLinkClass(location.pathname === "/connect")}
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>

        <div className="ml-auto md:hidden">
          <MobileNavMenu />
        </div>
      </div>
    </header>
  );
};
