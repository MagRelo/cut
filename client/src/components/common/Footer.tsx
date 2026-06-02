import React from "react";
import { Link, useLocation } from "react-router-dom";

export const Footer: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <footer className="w-full shrink-0 border-t border-gray-200 bg-gray-100">
      <div className="mx-auto flex h-12 max-w-shell items-center justify-end gap-4 px-4">
        <Link
          to="/faq"
          className={`text-sm font-medium ${
            isActive("/faq") ? "text-blue-500" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          FAQ
        </Link>
        <Link
          to="/terms"
          className={`text-sm font-medium ${
            isActive("/terms") ? "text-blue-500" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Terms
        </Link>
      </div>
    </footer>
  );
};
