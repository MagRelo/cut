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

const ICONS: Record<string, React.FC<IconProps>> = {
  "crude-oil": DripIcon,
  brent: DripIcon,
  "natural-gas": DripIcon,
  gold: CoinIcon,
  silver: CoinIcon,
  copper: BoltIcon,
  platinum: CoinIcon,
  palladium: CoinIcon,
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
