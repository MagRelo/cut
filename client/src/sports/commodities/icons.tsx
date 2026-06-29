import React from "react";
import type { CommoditySector } from "@cut/sport-commodities";

type IconProps = { className?: string };

function BarrelIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="7" y="4" width="10" height="16" rx="2" />
      <rect x="8" y="7" width="8" height="2" opacity="0.5" />
      <rect x="8" y="11" width="8" height="2" opacity="0.5" />
    </svg>
  );
}

function FlameIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 3c1 3 4 4 4 8a4 4 0 1 1-8 0c0-2 1.5-3.5 2.5-5.5C10.5 6.5 11 5 12 3z" />
    </svg>
  );
}

function IngotIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M4 14 12 8l8 6v4H4v-4z" />
    </svg>
  );
}

function CoinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <text x="12" y="16" textAnchor="middle" fontSize="8" fill="white">
        Ag
      </text>
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

function WheatIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <ellipse cx="9" cy="8" rx="2" ry="4" />
      <ellipse cx="12" cy="7" rx="2" ry="4" />
      <ellipse cx="15" cy="8" rx="2" ry="4" />
      <path d="M12 10v10" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function LeafIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 3C7 3 4 8 4 12c0 5 4 9 8 9 5 0 8-4 8-9 0-4-3-9-8-9zm0 3c2 2 3 5 3 8H9c0-3 1-6 3-8z" />
    </svg>
  );
}

function BeanIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <ellipse cx="10" cy="12" rx="4" ry="6" />
      <ellipse cx="15" cy="12" rx="4" ry="6" opacity="0.8" />
    </svg>
  );
}

function LogIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="5" y="9" width="14" height="6" rx="3" />
      <circle cx="8" cy="12" r="2" fill="white" opacity="0.4" />
    </svg>
  );
}

function HogIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <ellipse cx="12" cy="13" rx="7" ry="5" />
      <circle cx="8" cy="11" r="1" fill="white" />
      <circle cx="16" cy="11" r="1" fill="white" />
      <ellipse cx="12" cy="15" rx="2" ry="1.5" fill="white" opacity="0.5" />
    </svg>
  );
}

function CottonIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <circle cx="9" cy="10" r="3" />
      <circle cx="15" cy="10" r="3" />
      <circle cx="12" cy="14" r="3" />
    </svg>
  );
}

function CupIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M6 8h9v6a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V8zm9 2h3a2 2 0 0 1 0 4h-3" />
      <path d="M8 20h6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CubeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

const ICONS: Record<string, React.FC<IconProps>> = {
  "crude-oil": BarrelIcon,
  brent: BarrelIcon,
  "natural-gas": FlameIcon,
  "heating-oil": FlameIcon,
  gasoline: FlameIcon,
  gold: IngotIcon,
  silver: CoinIcon,
  copper: BoltIcon,
  platinum: IngotIcon,
  aluminum: BoltIcon,
  nickel: BoltIcon,
  lead: BoltIcon,
  zinc: BoltIcon,
  wheat: WheatIcon,
  corn: LeafIcon,
  soybeans: BeanIcon,
  lumber: LogIcon,
  "lean-hogs": HogIcon,
  rice: LeafIcon,
  oats: LeafIcon,
  cotton: CottonIcon,
  coffee: CupIcon,
  sugar: CubeIcon,
  cocoa: CubeIcon,
};

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
