import React from "react";
import { CommodityIcon } from "./icons";
import { sectorColor } from "./utils";

interface CommodityAvatarProps {
  displayName: string;
  iconKey?: string | null;
  sector?: string | null;
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: { outer: "h-9 w-9", icon: "h-5 w-5" },
  md: { outer: "h-10 w-10", icon: "h-6 w-6" },
  lg: { outer: "h-14 w-14", icon: "h-8 w-8" },
} as const;

export const CommodityAvatar: React.FC<CommodityAvatarProps> = ({
  displayName,
  iconKey,
  sector,
  size = "md",
}) => {
  const dims = SIZE[size];
  const ring = sectorColor(sector);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${dims.outer}`}
      style={{ backgroundColor: ring }}
      title={displayName}
    >
      <CommodityIcon
        iconKey={iconKey}
        sector={sector}
        className={`${dims.icon} text-white drop-shadow`}
      />
    </div>
  );
};
