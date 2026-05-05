import React from "react";
import { Link, useLocation } from "react-router-dom";

export const Footer: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <footer className="w-full bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 opacity-85 hover:opacity-100 transition-opacity"
            >
              <img src="/logo-transparent.png" alt="logo" className="h-8" />
              <span className="text-xl font-semibold text-gray-800 font-display">the Cut</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
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
        </div>
      </div>
    </footer>
  );
};
