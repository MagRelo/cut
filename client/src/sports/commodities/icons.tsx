import React from "react";
import type { CommoditySector } from "@cut/sport-commodities";

type IconProps = { className?: string };

function DripIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 4.5c1.75 3.25 5.5 7.25 5.5 11.25a5.5 5.5 0 1 1-11 0C6.5 11.75 10.25 7.75 12 4.5z" />
      <path
        d="M12 11.5c1.1 1.75 2.75 3.5 2.75 5.25a2.75 2.75 0 1 1-5.5 0c0-1.75 1.65-3.5 2.75-5.25z"
        fill="white"
        opacity="0.22"
      />
    </svg>
  );
}

function CoinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="5.25" fill="none" stroke="white" strokeWidth="1.1" opacity="0.32" />
    </svg>
  );
}

function BoltIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8z" />
    </svg>
  );
}

function ClubIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      {/* Playing-card club — three lobes + stem */}
      <circle cx="12" cy="7.25" r="3.65" />
      <circle cx="8.35" cy="11.75" r="3.65" />
      <circle cx="15.65" cy="11.75" r="3.65" />
      <rect x="10.6" y="11.5" width="2.8" height="6.5" rx="0.5" />
      <circle cx="12" cy="18.5" r="1.4" />
    </svg>
  );
}

function SoftTriangleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M11.33 6.48Q12 5.25 12.67 6.48L18.33 17.01Q19 18.25 17.6 18.25H6.4Q5 18.25 6.33 17.01L11.33 6.48z" />
      <path
        d="M11.55 9.15Q12 8.55 12.45 9.15L15.85 15.55Q16.2 16.2 15.55 16.2H8.45Q7.8 16.2 8.15 15.55L11.55 9.15z"
        fill="white"
        opacity="0.22"
      />
    </svg>
  );
}

const ICONS: Record<string, React.FC<IconProps>> = {
  "crude-oil": DripIcon,
  brent: DripIcon,
  "natural-gas": DripIcon,
  "heating-oil": DripIcon,
  gasoline: DripIcon,
  gold: CoinIcon,
  silver: CoinIcon,
  copper: BoltIcon,
  platinum: CoinIcon,
  aluminum: BoltIcon,
  nickel: BoltIcon,
  lead: BoltIcon,
  zinc: BoltIcon,
  wheat: ClubIcon,
  corn: ClubIcon,
  soybeans: ClubIcon,
  lumber: ClubIcon,
  "lean-hogs": ClubIcon,
  rice: ClubIcon,
  oats: ClubIcon,
  cotton: SoftTriangleIcon,
  coffee: SoftTriangleIcon,
  sugar: SoftTriangleIcon,
  cocoa: SoftTriangleIcon,
};

function CubeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function CommodityIcon({
  iconKey,
  className = "h-5 w-5",
}: {
  iconKey?: string | null;
  sector?: CommoditySector | string | null;
  className?: string;
}) {
  const Icon = (iconKey && ICONS[iconKey]) || CubeIcon;
  return <Icon className={className} />;
}
