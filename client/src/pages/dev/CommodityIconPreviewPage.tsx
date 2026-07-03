import React from "react";
import { Link } from "react-router-dom";
import { CommodityAvatar } from "../../sports/commodities/CommodityAvatar";
import { CommodityIcon, commodityAvatarUrl } from "../../sports/commodities/icons";
import { COMMODITY_CATALOG, COMMODITY_SECTORS } from "../../sports/commodities/catalog";
import { SECTOR_COLORS, sectorColor, sectorLabel } from "../../sports/commodities/utils";

const UNIQUE_ICON_KEYS = [...new Set(COMMODITY_CATALOG.map((entry) => entry.iconKey))].sort();

const AVATAR_SIZES = ["sm", "md", "lg"] as const;

export const CommodityIconPreviewPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 font-display">
      <div className="mb-8">
        <p className="text-sm text-gray-500">
          <Link to="/debug" className="text-blue-600 hover:underline">
            Debug
          </Link>
          {" · "}
          <Link to="/dev/commodity-avatar-variants" className="text-blue-600 hover:underline">
            Avatar variants (legacy SVG)
          </Link>
          {" · "}
          Dev tools
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">Commodity avatar preview</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Production avatars are 128×128 PNGs sliced from{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">client/public/commodoties_2_trimmed.png</code>{" "}
          (4×2 grid). Mapped by <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">iconKey</code> in{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">client/src/sports/commodities/icons.tsx</code>
          . SVG shapes remain as fallback when no photo exists.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Source sheet</h2>
        <p className="mb-4 text-sm text-gray-600">
          Left-to-right, top-to-bottom: crude oil, brent, natural gas, gold, silver, platinum, palladium, copper.
        </p>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <img
            src="/commodoties_2_trimmed.png"
            alt="Commodity avatar source grid"
            className="mx-auto max-h-48 w-full object-contain"
          />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Photo avatars</h2>
        <p className="mb-4 text-sm text-gray-600">
          All {COMMODITY_CATALOG.length} catalog entries — raw asset at 128px and production{" "}
          <code className="text-xs">CommodityAvatar</code> (no sector ring).
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {COMMODITY_CATALOG.map((entry) => {
            const url = commodityAvatarUrl(entry.iconKey);
            return (
              <div
                key={entry.ticker}
                className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                {url ? (
                  <img
                    src={url}
                    alt=""
                    className="h-32 w-32 rounded-full object-cover ring-2 ring-gray-200"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500">
                    missing
                  </div>
                )}
                <CommodityAvatar
                  displayName={entry.displayName}
                  iconKey={entry.iconKey}
                  sector={entry.sector}
                  size="lg"
                />
                <div className="text-center">
                  <div className="font-medium text-gray-900">{entry.displayName}</div>
                  <div className="font-mono text-xs text-gray-500">{entry.iconKey}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Sector colors</h2>
        <div className="flex flex-wrap gap-3">
          {COMMODITY_SECTORS.map((sector) => (
            <div
              key={sector}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm"
            >
              <span
                className="h-6 w-6 shrink-0 rounded-full"
                style={{ backgroundColor: SECTOR_COLORS[sector] }}
              />
              <span className="font-medium text-gray-900">{sectorLabel(sector)}</span>
              <span className="font-mono text-xs text-gray-500">{SECTOR_COLORS[sector]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">SVG fallback shapes</h2>
        <p className="mb-4 text-sm text-gray-600">
          {UNIQUE_ICON_KEYS.length} distinct icon shapes — used only when no photo is mapped for an{" "}
          <code className="text-xs">iconKey</code>.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {UNIQUE_ICON_KEYS.map((iconKey) => (
            <div
              key={iconKey}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-500"
                title={iconKey}
              >
                <CommodityIcon iconKey={iconKey} className="h-8 w-8 text-white drop-shadow" />
              </div>
              <span className="text-center font-mono text-xs text-gray-600">{iconKey}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Avatar sizes</h2>
        <p className="mb-4 text-sm text-gray-600">sm / md / lg as used in lineup and leaderboard rows.</p>
        <div className="flex flex-wrap items-end gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {AVATAR_SIZES.map((size) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <CommodityAvatar
                displayName="Gold"
                iconKey="gold"
                sector="precious"
                size={size}
              />
              <span className="font-mono text-xs text-gray-500">{size}</span>
            </div>
          ))}
        </div>
      </section>

      {COMMODITY_SECTORS.map((sector) => {
        const entries = COMMODITY_CATALOG.filter((entry) => entry.sector === sector);
        if (entries.length === 0) return null;

        return (
          <section key={sector} className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: sectorColor(sector) }}
              />
              <h2 className="text-lg font-semibold text-gray-900">{sectorLabel(sector)}</h2>
              <span className="text-sm text-gray-500">({entries.length})</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Commodity</th>
                    <th className="px-4 py-3">iconKey</th>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Avatar</th>
                    <th className="px-4 py-3">Row preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((entry) => {
                    const url = commodityAvatarUrl(entry.iconKey);
                    return (
                      <tr key={entry.ticker} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3 font-medium text-gray-900">{entry.displayName}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{entry.iconKey}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {url ? url.replace("/commodities/avatars/", "") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {AVATAR_SIZES.map((size) => (
                              <CommodityAvatar
                                key={size}
                                displayName={entry.displayName}
                                iconKey={entry.iconKey}
                                sector={entry.sector}
                                size={size}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 max-w-xs items-center gap-3">
                            <CommodityAvatar
                              displayName={entry.displayName}
                              iconKey={entry.iconKey}
                              sector={entry.sector}
                            />
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-gray-900">{entry.displayName}</div>
                              <div className="truncate text-xs text-gray-600">{sectorLabel(entry.sector)}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <section className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">On dark background</h2>
        <div className="grid grid-cols-4 gap-3 rounded-xl bg-gray-900 p-6 sm:grid-cols-6 md:grid-cols-8">
          {COMMODITY_CATALOG.map((entry) => (
            <div key={entry.ticker} className="flex flex-col items-center gap-1.5">
              <CommodityAvatar
                displayName={entry.displayName}
                iconKey={entry.iconKey}
                sector={entry.sector}
                size="sm"
              />
              <span className="max-w-full truncate text-center text-[10px] text-gray-400">
                {entry.displayName.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
