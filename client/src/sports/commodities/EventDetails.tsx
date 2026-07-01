import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import {
  commoditiesEventStatusFromMetadata,
  parseCommoditiesEventMetadata,
} from "@cut/sport-commodities";
import type { CompetitionEventShell } from "@cut/sport-sdk/ui";
import { formatCommoditiesEventStatusLabel, formatCommoditySessionWindow } from "./commodityUtils";

interface CommodityEventDetailsProps {
  event: CompetitionEventShell;
  className?: string;
}

export function CommodityEventDetails({ event, className = "" }: CommodityEventDetailsProps) {
  const meta =
    event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
      ? (event.metadata as Record<string, unknown>)
      : {};
  const commodities = parseCommoditiesEventMetadata(event.metadata);
  const name = typeof meta.name === "string" ? meta.name : event.externalId;
  const status = formatCommoditiesEventStatusLabel(
    commoditiesEventStatusFromMetadata(event.metadata),
  );
  const sessionDate = commodities?.sessionDate ?? event.externalId;
  const sessionWindow = formatCommoditySessionWindow(
    commodities?.sessionOpen,
    commodities?.sessionClose,
  );

  const detailSeparator = (
    <span className="text-[9px] leading-none text-white/60" aria-hidden>
      ●
    </span>
  );

  return (
    <div className={["font-display text-sm leading-snug", className].filter(Boolean).join(" ")}>
      <h1 className="font-display text-2xl font-bold leading-snug tracking-tight text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)] sm:text-3xl">
        <Link
          to={`/sports/${event.sportId}/leaderboard`}
          className="rounded-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          {name}
        </Link>
      </h1>

      <div className="mt-0.5 flex w-full flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-medium text-white/95 [text-shadow:_0_1px_1px_rgb(0_0_0_/_35%)]">
          {sessionWindow ?? `Session ${sessionDate}`}
        </span>
      </div>

      <div className="mt-1 flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 font-medium text-white/95 [text-shadow:_0_1px_1px_rgb(0_0_0_/_35%)]">
        <span>{status}</span>
        {detailSeparator}
        <Link
          to={`/sports/${event.sportId}/leaderboard`}
          className="inline-flex items-center gap-0.5 rounded-sm text-white/90 underline-offset-2 hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          View Leaderboard
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
