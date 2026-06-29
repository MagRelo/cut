import React from "react";
import { UserIcon } from "@heroicons/react/24/outline";

interface F1DriverAvatarProps {
  displayName: string;
  headshotUrl?: string | null;
  teamColor?: string | null;
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: {
    outer: "h-9 w-9",
    icon: "h-5 w-5",
  },
  md: {
    outer: "h-10 w-10",
    icon: "h-6 w-6",
  },
  lg: {
    outer: "h-14 w-14",
    icon: "h-8 w-8",
  },
} as const;

const FALLBACK_BG = "#e2e8f0";

export const F1DriverAvatar: React.FC<F1DriverAvatarProps> = ({
  displayName,
  headshotUrl,
  teamColor,
  size = "md",
}) => {
  const dims = SIZE[size];

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full ${dims.outer}`}
      style={{ backgroundColor: teamColor ?? FALLBACK_BG }}
    >
      {headshotUrl ? (
        <img
          className="block h-full w-full object-cover object-top"
          src={headshotUrl}
          alt={displayName}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <UserIcon className={`text-white/80 ${dims.icon}`} aria-hidden />
        </div>
      )}
    </div>
  );
};
