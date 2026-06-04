import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDownIcon, UserIcon } from "@heroicons/react/24/outline";
import { formatUnits } from "viem";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { accountMatch } from "../../lib/navRoutes";
import { ADMIN_MENU_LINKS, LEAGUES_TAB } from "../../lib/navTabs";

const menuItemClass =
  "block w-full px-4 py-2 text-left text-sm font-display text-slate-700 data-[focus]:bg-slate-50";

export const UserMenu: React.FC = () => {
  const { logout, paymentTokenBalance, balancesUnavailable, isAdmin } = useAuth();
  const showAdminNav = isAdmin();
  const location = useLocation();
  const isAccountActive = accountMatch(location.pathname);

  const totalBalance = balancesUnavailable
    ? null
    : Number(formatUnits(paymentTokenBalance ?? 0n, 6)).toFixed(2);

  return (
    <Menu as="div" className="relative shrink-0">
      <MenuButton
        className={[
          "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium font-display transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40",
          isAccountActive
            ? "bg-slate-100 text-slate-950 font-semibold"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        ].join(" ")}
        aria-label="Account menu"
      >
        <UserIcon className="h-4 w-4 shrink-0" aria-hidden />
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
        className="z-50 mt-1 min-w-[11rem] rounded-md border border-slate-200 bg-white py-1 shadow-lg focus:outline-none"
      >
        <MenuItem>
          <Link
            to={LEAGUES_TAB.to}
            className={menuItemClass}
            aria-current={LEAGUES_TAB.match(location.pathname) ? "page" : undefined}
          >
            {LEAGUES_TAB.label}
          </Link>
        </MenuItem>
        <MenuItem>
          <Link to="/account" className={menuItemClass}>
            Account
          </Link>
        </MenuItem>
        <MenuItem>
          <Link to="/account/funds" className={menuItemClass}>
            Manage Funds
          </Link>
        </MenuItem>
        {showAdminNav
          ? ADMIN_MENU_LINKS.map((link) => (
              <MenuItem key={link.to}>
                <Link to={link.to} className={menuItemClass}>
                  {link.label}
                </Link>
              </MenuItem>
            ))
          : null}
        <MenuItem>
          <button type="button" className={menuItemClass} onClick={() => void logout()}>
            Sign Out
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
};
