import React, { type ReactNode } from "react";
import { cn } from "../../../lib/tabStyles";

/** Fixed height for tab hero panels (timeline, CTA, pie chart, connect, etc.). */
export const CONTEST_LOBBY_TAB_HERO_HEIGHT_CLASS = "h-[300px]";

interface ContestLobbyTabHeroProps {
  children: ReactNode;
  className?: string;
  /** Bottom rule between hero and list — only for open pre-round enter CTA. */
  showBottomBorder?: boolean;
}

export const ContestLobbyTabHero: React.FC<ContestLobbyTabHeroProps> = ({
  children,
  className,
  showBottomBorder = false,
}) => {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col",
        showBottomBorder && "border-b border-gray-200",
        CONTEST_LOBBY_TAB_HERO_HEIGHT_CLASS,
        className,
      )}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden">
        {children}
      </div>
    </div>
  );
};
