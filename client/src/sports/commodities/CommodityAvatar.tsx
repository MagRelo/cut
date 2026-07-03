import React from "react";
import { CommodityIcon, commodityAvatarUrl } from "./icons";
import { sectorColor, sectorIconColor, sectorTintBg } from "./utils";

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
  size = "sm",
}) => {
  const dims = SIZE[size];
  const ring = sectorColor(sector);
  const iconAccent = sectorIconColor(sector);
  const tint = sectorTintBg(sector);
  const avatarUrl = commodityAvatarUrl(iconKey);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${avatarUrl ? "" : "border-2"} ${dims.outer}`}
      style={{ backgroundColor: avatarUrl ? undefined : tint, borderColor: avatarUrl ? undefined : ring }}
      title={displayName}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span style={{ color: iconAccent }}>
          <CommodityIcon iconKey={iconKey} className={dims.icon} />
        </span>
      )}
    </div>
  );
};
