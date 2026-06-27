import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment, useEffect, useState } from "react";
import { UserContestsNavList } from "./UserContestsNavList";
import { Link, useLocation } from "react-router-dom";
import { formatUnits } from "viem";
import { useAuth } from "../../contexts/AuthContext";
import { BRAND_WORDMARK } from "../../lib/brand";
import { contestsHubMatch, signInReturnFrom } from "../../lib/navRoutes";
import {
  ACCOUNT_HOME_LINK,
  ACCOUNT_SUB_LINKS,
  ADMIN_MENU_LINKS,
  LEFT_TABS,
} from "../../lib/navTabs";

const mobileNavItemBase =
  "block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium font-display uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40";

const mobileSectionHeaderBase =
  "block w-full rounded-md px-3 pt-2 pb-0.5 text-left text-sm font-medium font-display uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40";

function mobileNavItemClass(active: boolean) {
  return [
    mobileNavItemBase,
    active
      ? "bg-slate-100 text-slate-950 font-semibold"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
  ].join(" ");
}

function mobileSectionHeaderClass(active: boolean) {
  return [
    mobileSectionHeaderBase,
    active
      ? "bg-slate-100 text-slate-950 font-semibold"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
  ].join(" ");
}

function mobileSubItemClass(active: boolean) {
  return [
    "block w-full rounded-md px-3 py-2 text-left text-sm font-display transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40",
    active
      ? "bg-slate-100 font-semibold text-slate-950"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
  ].join(" ");
}

const mobileContestInsetListClass = "ml-2 flex flex-col gap-0.5 border-l border-slate-100 pl-2";

const mobileAccountInsetListClass =
  "ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-slate-100 pl-2";

const mobileAccountHeaderClass = [
  mobileNavItemBase,
  "inline-flex items-center justify-between gap-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900",
].join(" ");

export const MobileNavMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, logout, paymentTokenBalance, balancesUnavailable, isAdmin } = useAuth();
  const showAdminNav = Boolean(user) && isAdmin();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const totalBalance = balancesUnavailable
    ? null
    : Number(formatUnits(paymentTokenBalance ?? 0n, 6)).toFixed(2);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
        aria-label="Open menu"
      >
        <Bars3Icon className="h-6 w-6" aria-hidden />
      </button>

      <Transition appear show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50 md:hidden" onClose={() => setOpen(false)}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="translate-x-3 opacity-0"
                enterTo="translate-x-0 opacity-100"
                leave="ease-in duration-150"
                leaveFrom="translate-x-0 opacity-100"
                leaveTo="translate-x-3 opacity-0"
              >
                <DialogPanel className="w-screen max-w-xs transform bg-white shadow-xl">
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                      <Link
                        to="/"
                        onClick={closeMenu}
                        className="flex items-center gap-2 rounded-sm opacity-90 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
                      >
                        <img src="/logo-transparent.png" alt="" className="h-7 w-auto" />
                        <span className="font-display text-lg uppercase tracking-widest text-slate-900">
                          {BRAND_WORDMARK}
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={closeMenu}
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
                        aria-label="Close menu"
                      >
                        <XMarkIcon className="h-5 w-5" aria-hidden />
                      </button>
                    </div>

                    <nav aria-label="Main" className="flex-1 overflow-y-auto p-3">
                      <div className="flex flex-col gap-3">
                        {LEFT_TABS.map((tab) => (
                          <div key={tab.key} className="flex flex-col">
                            <Link
                              to={tab.to}
                              state={tab.state}
                              onClick={closeMenu}
                              aria-current={
                                user && tab.key === "contests"
                                  ? contestsHubMatch(location.pathname)
                                    ? "page"
                                    : undefined
                                  : tab.match(location.pathname)
                                    ? "page"
                                    : undefined
                              }
                              className={
                                user && tab.key === "contests"
                                  ? mobileSectionHeaderClass(contestsHubMatch(location.pathname))
                                  : mobileNavItemClass(tab.match(location.pathname))
                              }
                            >
                              {tab.label}
                            </Link>
                            {user && tab.key === "contests" ? (
                              <UserContestsNavList
                                variant="mobile"
                                onNavigate={closeMenu}
                                insetListClass={mobileContestInsetListClass}
                              />
                            ) : null}
                          </div>
                        ))}

                        {user ? (
                          <>
                            <div className="flex flex-col">
                              <Link
                                to={ACCOUNT_HOME_LINK.to}
                                onClick={closeMenu}
                                className={mobileAccountHeaderClass}
                              >
                                <span>My Account</span>
                                {totalBalance !== null ? (
                                  <span className="font-semibold tabular-nums normal-case tracking-normal">
                                    ${totalBalance}
                                  </span>
                                ) : (
                                  <span className="tabular-nums normal-case tracking-normal text-amber-800">
                                    —
                                  </span>
                                )}
                              </Link>

                              <div className={mobileAccountInsetListClass}>
                                {ACCOUNT_SUB_LINKS.map((link) => (
                                  <Link
                                    key={link.to}
                                    to={link.to}
                                    onClick={closeMenu}
                                    aria-current={link.match(location.pathname) ? "page" : undefined}
                                    className={mobileSubItemClass(link.match(location.pathname))}
                                  >
                                    {link.label}
                                  </Link>
                                ))}
                              </div>
                            </div>

                            {showAdminNav
                              ? ADMIN_MENU_LINKS.map((link) => (
                                  <Link
                                    key={link.to}
                                    to={link.to}
                                    onClick={closeMenu}
                                    aria-current={
                                      location.pathname === link.to ||
                                      location.pathname.startsWith(`${link.to}/`)
                                        ? "page"
                                        : undefined
                                    }
                                    className={mobileNavItemClass(
                                      location.pathname === link.to ||
                                        location.pathname.startsWith(`${link.to}/`),
                                    )}
                                  >
                                    {link.label}
                                  </Link>
                                ))
                              : null}

                            <button
                              type="button"
                              className={mobileNavItemClass(false)}
                              onClick={() => void logout()}
                            >
                              Sign Out
                            </button>
                          </>
                        ) : (
                          <Link
                            to="/connect"
                            state={{ from: signInReturnFrom }}
                            onClick={closeMenu}
                            aria-current={location.pathname === "/connect" ? "page" : undefined}
                            className={mobileNavItemClass(location.pathname === "/connect")}
                          >
                            Sign In
                          </Link>
                        )}
                      </div>
                    </nav>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};
