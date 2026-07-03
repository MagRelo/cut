import React from "react";
import { Link } from "react-router-dom";
import { CommodityAvatar } from "../../sports/commodities/CommodityAvatar";
import { CommodityIcon } from "../../sports/commodities/icons";
import { COMMODITY_CATALOG, COMMODITY_SECTORS } from "../../sports/commodities/catalog";
import {
  SECTOR_COLORS,
  SECTOR_ICON_COLOR,
  SECTOR_MUTED_BG,
  SECTOR_TINT_BG,
  sectorColor,
  sectorIconColor,
  sectorLabel,
  sectorMutedBg,
  sectorTintBg,
} from "../../sports/commodities/utils";

type AvatarSize = "sm" | "md" | "lg";

type AvatarVariant =
  | "solid"
  | "soft"
  | "outline"
  | "muted"
  | "neutral-accent"
  | "neutral-ring";

const SIZE = {
  sm: { outer: "h-9 w-9", icon: "h-5 w-5" },
  md: { outer: "h-10 w-10", icon: "h-6 w-6" },
  lg: { outer: "h-14 w-14", icon: "h-8 w-8" },
} as const;

const VARIANT_META: Record<
  AvatarVariant,
  { title: string; description: string }
> = {
  solid: {
    title: "1. Solid (previous)",
    description: "Full sector color fill, white icon. High contrast, dominates stacked lists.",
  },
  soft: {
    title: "2. Soft tint + colored icon",
    description: "Light tint background with sector-colored icon. Recommended for lineup rows.",
  },
  outline: {
    title: "3. Outline ring + neutral fill",
    description: "White fill, 2px sector border, colored icon. Less visual mass than solid.",
  },
  muted: {
    title: "4. Muted solid",
    description: "Desaturated mid-tone fill, white icon. Same shape as current, softer palette.",
  },
  "neutral-accent": {
    title: "5. Neutral + accent dot",
    description: "Slate circle with gray icon; tiny sector dot for category hint.",
  },
  "neutral-ring": {
    title: "6. Tint + colored ring (default)",
    description: "Light sector tint fill, sector-colored ring and icon. Current production styling.",
  },
};

const LINEUP_SAMPLE = [
  { displayName: "Copper", iconKey: "copper", sector: "metals" as const, pctReturn: -0.09, pts: 7 },
  { displayName: "Gold", iconKey: "gold", sector: "precious" as const, pctReturn: -0.04, pts: 4 },
  { displayName: "Brent Crude", iconKey: "brent", sector: "energy" as const, pctReturn: -0.09, pts: 7 },
];

const SECTOR_SAMPLES = [
  { displayName: "Brent Crude", iconKey: "brent", sector: "energy" as const },
  { displayName: "Gold", iconKey: "gold", sector: "precious" as const },
  { displayName: "Copper", iconKey: "copper", sector: "metals" as const },
  { displayName: "Corn", iconKey: "corn", sector: "ag" as const },
  { displayName: "Wheat", iconKey: "wheat", sector: "softs" as const },
];

function PreviewAvatar({
  variant,
  displayName,
  iconKey,
  sector,
  size = "md",
}: {
  variant: AvatarVariant;
  displayName: string;
  iconKey: string;
  sector: string;
  size?: AvatarSize;
}) {
  const dims = SIZE[size];
  const accent = sectorColor(sector);
  const iconAccent = sectorIconColor(sector);
  const tint = sectorTintBg(sector);
  const muted = sectorMutedBg(sector);

  if (variant === "solid") {
    return (
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${dims.outer}`}
        style={{ backgroundColor: accent }}
        title={displayName}
      >
        <CommodityIcon iconKey={iconKey} className={`${dims.icon} text-white drop-shadow`} />
      </div>
    );
  }

  if (variant === "soft") {
    return (
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${dims.outer}`}
        style={{ backgroundColor: tint }}
        title={displayName}
      >
        <span style={{ color: iconAccent }}>
          <CommodityIcon iconKey={iconKey} className={dims.icon} />
        </span>
      </div>
    );
  }

  if (variant === "outline") {
    return (
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-white ${dims.outer}`}
        style={{ borderColor: accent }}
        title={displayName}
      >
        <span style={{ color: iconAccent }}>
          <CommodityIcon iconKey={iconKey} className={dims.icon} />
        </span>
      </div>
    );
  }

  if (variant === "muted") {
    return (
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${dims.outer}`}
        style={{ backgroundColor: muted }}
        title={displayName}
      >
        <CommodityIcon iconKey={iconKey} className={`${dims.icon} text-white drop-shadow`} />
      </div>
    );
  }

  if (variant === "neutral-ring") {
    return (
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 ${dims.outer}`}
        style={{ backgroundColor: tint, borderColor: accent }}
        title={displayName}
      >
        <span style={{ color: iconAccent }}>
          <CommodityIcon iconKey={iconKey} className={dims.icon} />
        </span>
      </div>
    );
  }

  if (variant === "neutral-accent") {
    return (
      <div className={`relative shrink-0 ${dims.outer}`} title={displayName}>
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-100">
          <CommodityIcon iconKey={iconKey} className={`${dims.icon} text-slate-500`} />
        </div>
        <span
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white"
          style={{ backgroundColor: accent }}
        />
      </div>
    );
  }

  return null;
}

function LineupRowPreview({
  variant,
  size = "md",
  entry,
}: {
  variant: AvatarVariant;
  size?: AvatarSize;
  entry: (typeof LINEUP_SAMPLE)[number];
}) {
  const pctTone = entry.pctReturn >= 0 ? "text-emerald-600" : "text-red-600";
  const ptsSign = entry.pts >= 0 ? "+" : "";

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 py-2">
      <PreviewAvatar
        variant={variant}
        displayName={entry.displayName}
        iconKey={entry.iconKey}
        sector={entry.sector}
        size={size}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg font-semibold leading-tight text-gray-900">{entry.displayName}</div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>{sectorLabel(entry.sector)}</span>
          <span className="text-gray-400">·</span>
          <span className={pctTone}>
            {entry.pctReturn >= 0 ? "+" : ""}
            {entry.pctReturn.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="shrink-0 text-center">
        <div className="text-xl font-bold leading-none text-gray-900">
          {ptsSign}
          {entry.pts}
        </div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
          PTS
        </div>
      </div>
    </div>
  );
}

function VariantSection({ variant }: { variant: AvatarVariant }) {
  const meta = VARIANT_META[variant];

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-gray-900">{meta.title}</h2>
      <p className="mb-4 max-w-2xl text-sm text-gray-600">{meta.description}</p>

      <div className="mb-4 flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {SECTOR_SAMPLES.map((entry) => (
          <div key={entry.displayName} className="flex flex-col items-center gap-1.5">
            <PreviewAvatar
              variant={variant}
              displayName={entry.displayName}
              iconKey={entry.iconKey}
              sector={entry.sector}
            />
            <span className="text-[10px] text-gray-500">{sectorLabel(entry.sector)}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Lineup row (md)</h3>
          <div className="divide-y divide-gray-100">
            {LINEUP_SAMPLE.map((entry) => (
              <LineupRowPreview key={entry.displayName} variant={variant} entry={entry} />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Lineup row (sm)</h3>
          <div className="divide-y divide-gray-100">
            {LINEUP_SAMPLE.map((entry) => (
              <LineupRowPreview key={`${entry.displayName}-sm`} variant={variant} size="sm" entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export const CommodityAvatarVariantPreviewPage: React.FC = () => {
  const variants = Object.keys(VARIANT_META) as AvatarVariant[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 font-display">
      <div className="mb-8">
        <p className="text-sm text-gray-500">
          <Link to="/debug" className="text-blue-600 hover:underline">
            Debug
          </Link>
          {" · "}
          <Link to="/dev/commodity-icons" className="text-blue-600 hover:underline">
            Icon preview
          </Link>
          {" · "}
          Dev tools
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">Avatar variant comparison</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Historical SVG styling experiments. Production uses photo avatars from{" "}
          <Link to="/dev/commodity-icons" className="text-blue-600 hover:underline">
            the avatar preview page
          </Link>
          .
        </p>
      </div>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Production (photo avatars)</h2>
        <p className="mb-4 text-sm text-gray-600">
          Current <code className="text-xs">CommodityAvatar</code> — photo fill with sector-colored ring.
        </p>
        <div className="mb-4 flex flex-wrap gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          {COMMODITY_CATALOG.map((entry) => (
            <div key={entry.ticker} className="flex flex-col items-center gap-1.5">
              <CommodityAvatar
                displayName={entry.displayName}
                iconKey={entry.iconKey}
                sector={entry.sector}
                size="md"
              />
              <span className="max-w-[4.5rem] truncate text-center text-[10px] text-gray-600">
                {entry.displayName.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Lineup row (md)</h3>
          <div className="divide-y divide-gray-100">
            {LINEUP_SAMPLE.map((entry) => (
              <div key={entry.displayName} className="flex min-w-0 items-center justify-between gap-3 py-2">
                <CommodityAvatar
                  displayName={entry.displayName}
                  iconKey={entry.iconKey}
                  sector={entry.sector}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-semibold leading-tight text-gray-900">
                    {entry.displayName}
                  </div>
                  <div className="text-xs text-gray-600">{sectorLabel(entry.sector)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Legacy SVG variants</h2>
        <p className="mb-4 text-sm text-gray-600">
          Side-by-side options explored before photo avatars shipped.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Color tokens</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Sector</th>
                <th className="px-4 py-3">Solid</th>
                <th className="px-4 py-3">Tint bg</th>
                <th className="px-4 py-3">Icon color</th>
                <th className="px-4 py-3">Muted bg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {COMMODITY_SECTORS.map((sector) => (
                <tr key={sector}>
                  <td className="px-4 py-3 font-medium text-gray-900">{sectorLabel(sector)}</td>
                  <td className="px-4 py-3">
                    <Swatch color={SECTOR_COLORS[sector]} label={SECTOR_COLORS[sector]} />
                  </td>
                  <td className="px-4 py-3">
                    <Swatch color={SECTOR_TINT_BG[sector]} label={SECTOR_TINT_BG[sector]} />
                  </td>
                  <td className="px-4 py-3">
                    <Swatch color={SECTOR_ICON_COLOR[sector]} label={SECTOR_ICON_COLOR[sector]} />
                  </td>
                  <td className="px-4 py-3">
                    <Swatch color={SECTOR_MUTED_BG[sector]} label={SECTOR_MUTED_BG[sector]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {variants.map((variant) => (
        <VariantSection key={variant} variant={variant} />
      ))}

      <section className="mb-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">All variants — lineup stack</h2>
        <p className="mb-4 text-sm text-gray-600">
          Same three commodities (Copper, Gold, Brent) across every option at md size.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {variants.map((variant) => (
            <div key={variant} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">{VARIANT_META[variant].title}</h3>
              <div className="divide-y divide-gray-100">
                {LINEUP_SAMPLE.map((entry) => (
                  <LineupRowPreview key={entry.displayName} variant={variant} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-5 w-5 shrink-0 rounded-full border border-gray-200" style={{ backgroundColor: color }} />
      <span className="font-mono text-xs text-gray-500">{label}</span>
    </div>
  );
}
