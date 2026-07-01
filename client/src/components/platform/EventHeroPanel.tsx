import React from "react";
import { DEFAULT_EVENT_HERO_OVERLAY_CLASSNAME } from "@cut/sport-sdk/ui";
import { useSportUIPlugin } from "../../hooks/useSportUI";

interface EventHeroPanelProps {
  sportId: string;
  imageUrl: string;
  children: React.ReactNode;
  contentClassName?: string;
}

export const EventHeroPanel: React.FC<EventHeroPanelProps> = ({
  sportId,
  imageUrl,
  children,
  contentClassName = "px-4 py-3",
}) => {
  const plugin = useSportUIPlugin(sportId);
  const imageClassName = plugin?.eventHeroImageClassName;
  const overlayClassName =
    plugin?.eventHeroOverlayClassName ?? DEFAULT_EVENT_HERO_OVERLAY_CLASSNAME;

  return (
    <div className="relative overflow-hidden shadow-sm">
      <div
        className={["absolute inset-0 bg-cover bg-center", imageClassName].filter(Boolean).join(" ")}
        style={{ backgroundImage: `url(${imageUrl})` }}
        aria-hidden
      />
      <div className={["absolute inset-0", overlayClassName].join(" ")} aria-hidden />
      <div className={["relative z-10", contentClassName].join(" ")}>{children}</div>
    </div>
  );
};
