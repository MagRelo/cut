import React, { type ReactNode } from "react";
import { cn } from "../../../lib/tabStyles";

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
        "flex w-full flex-col items-center justify-center py-4",
        showBottomBorder && "border-b border-gray-200",
        className,
      )}
    >
      {children}
    </div>
  );
};
