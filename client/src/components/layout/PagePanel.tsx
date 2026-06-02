import React from "react";
import { useLocation } from "react-router-dom";
import { getPagePanelVariant, type PagePanelVariant } from "../../lib/pagePanelRoutes";

interface PagePanelProps {
  children: React.ReactNode;
  variant?: PagePanelVariant;
  className?: string;
}

export const PagePanel: React.FC<PagePanelProps> = ({ children, variant = "default", className = "" }) => {
  return (
    <div
      className={[
        "bg-white border-x border-b border-gray-200 shadow-sm rounded-b-lg min-h-[4rem]",
        variant === "default" ? "p-4" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
};

/** Route-aware panel wrapper for the app shell. */
export const PageContentPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const variant = getPagePanelVariant(location.pathname);

  return <PagePanel variant={variant}>{children}</PagePanel>;
};
