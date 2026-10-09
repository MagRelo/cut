import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import {
  commoditiesEventStatusFromMetadata,
  parseCommoditiesEventMetadata,
} from "@cut/sport-commodities";
import type { CompetitionEventShell } from "@cut/sport-sdk/ui";
import { leaderboardLinkState, leaderboardPath } from "../../lib/contestNavigation";
import {
  EventCountdownLine,
  shouldShowEventCountdown,
} from "../../components/platform/EventCountdownLine";
import { formatCommoditiesEventStatusLabel, formatCommoditySessionWindow } from "./commodityUtils";
import {
  eventHeaderActionLinkClassName,
  eventHeaderMetaRowClassName,
  eventHeaderPrimaryLineClassName,
  eventHeaderTitleClassName,
  eventHeaderTitleLinkClassName,
  type EventHeaderTone,
} from "../../components/platform/eventHeaderTone";

interface CommodityEventDetailsProps {
  event: CompetitionEventShell;
  className?: string;
  tone?: EventHeaderTone;
}

export function CommodityEventDetails({
  event,
  className = "",
  tone = "hero",
}: CommodityEventDetailsProps) {
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
  const showCountdown = shouldShowEventCountdown(event.metadata);
  const leaderboardTo = leaderboardPath(event.sportId, event.id);
  const leaderboardState = leaderboardLinkState(event);

  return (
    <div className={["font-display text-sm leading-snug", className].filter(Boolean).join(" ")}>
      <h1 className={eventHeaderTitleClassName(tone)}>
        <Link
          to={leaderboardTo}
          state={leaderboardState}
          className={eventHeaderTitleLinkClassName(tone)}
        >
          {name}
        </Link>
      </h1>

      <div className="mt-0.5 flex w-full flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className={eventHeaderPrimaryLineClassName(tone)}>
          {sessionWindow ?? `Session ${sessionDate}`}
        </span>
      </div>

      <div className={eventHeaderMetaRowClassName(tone)}>
        {showCountdown ? (
          <EventCountdownLine metadata={event.metadata} tone={tone} />
        ) : (
          <span>{status}</span>
        )}
      </div>

      <div className={eventHeaderMetaRowClassName(tone)}>
        <Link
          to={leaderboardTo}
          state={leaderboardState}
          className={eventHeaderActionLinkClassName(tone)}
        >
          View Leaderboard
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
