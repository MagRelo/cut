import { UserIcon } from "@heroicons/react/24/outline";
import React from "react";

interface ParticipantAvatarProps {
  imageUrl?: string | null;
  alt: string;
  size?: "sm" | "md";
  className?: string;
}

const sizeClasses = {
  sm: { shell: "h-10 w-10", icon: "h-6 w-6" },
  md: { shell: "h-14 w-14", icon: "h-8 w-8" },
} as const;

export const ParticipantAvatar: React.FC<ParticipantAvatarProps> = ({
  imageUrl,
  alt,
  size = "sm",
  className = "",
}) => {
  const { shell, icon } = sizeClasses[size];

  if (imageUrl) {
    return (
      <div className={`shrink-0 ${className}`}>
        <img
          className={`${shell} rounded-full object-cover ${size === "md" ? "ring-2 ring-white" : ""}`}
          src={imageUrl}
          alt={alt}
        />
      </div>
    );
  }

  return (
    <div className={`shrink-0 ${className}`}>
      <div
        className={`flex ${shell} shrink-0 items-center justify-center rounded-full bg-slate-100`}
      >
        <UserIcon className={`${icon} text-slate-300`} aria-hidden="true" />
      </div>
    </div>
  );
};
