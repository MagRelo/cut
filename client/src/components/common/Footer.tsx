import React from "react";
import { Link, useLocation } from "react-router-dom";

const LEGAL_LINKS = [
  { path: "/terms", label: "Terms" },
  { path: "/privacy", label: "Privacy" },
  { path: "/responsible-gaming", label: "Responsible Play" },
  { path: "/disclosures", label: "Disclosures" },
] as const;

const legalLinkClass = (active: boolean) =>
  [
    "font-display text-xs font-normal tracking-wide transition-colors",
    active ? "text-slate-700" : "text-slate-500 hover:text-slate-700",
  ].join(" ");

export const Footer: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <footer className="w-full shrink-0 border-t border-gray-200 bg-gray-100">
      <div className="mx-auto flex max-w-shell flex-col items-end gap-2 px-4 py-3">
        <Link
          to="/faq"
          className={[
            "font-display text-sm font-normal tracking-wide transition-colors hover:text-blue-700",
            isActive("/faq") ? "text-blue-700" : "text-blue-600",
          ].join(" ")}
        >
          Help
        </Link>
        <nav
          className="flex flex-col items-end gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1"
          aria-label="Legal"
        >
          {LEGAL_LINKS.map(({ path, label }) => (
            <Link key={path} to={path} className={legalLinkClass(isActive(path))}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
};
