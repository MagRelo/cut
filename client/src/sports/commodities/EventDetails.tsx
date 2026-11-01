import { NewspaperIcon } from "@heroicons/react/24/outline";
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
import {
  EventLeaderboardLink,
  useIsOnEventLeaderboard,
} from "../../components/platform/EventLeaderboardLink";
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
  hasSummary?: boolean;
  onOpenSummary?: () => void;
  tone?: EventHeaderTone;
}

export function CommodityEventDetails({
  event,
  className = "",
  hasSummary = false,
  onOpenSummary,
  tone = "hero",
}: CommodityEventDetailsProps) {
  const meta =
    event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
      ? (event.metadata as Record<string, unknown>)
      : {};
  const commodities = parseCommoditiesEventMetadata(event.metadata);
  const name = typeof meta.name === "string" ? meta.name : event.externalId;
  const statusValue = commoditiesEventStatusFromMetadata(event.metadata);
  const status = formatCommoditiesEventStatusLabel(statusValue);
  const sessionDate = commodities?.sessionDate ?? event.externalId;
  const sessionWindow = formatCommoditySessionWindow(
    commodities?.sessionOpen,
    commodities?.sessionClose,
  );
  const startDate = commodities?.sessionOpen?.trim() || null;
  const showCountdown = shouldShowEventCountdown(startDate, statusValue);
  const isScheduled = statusValue === "SCHEDULED";
  const showPreview = isScheduled && hasSummary && Boolean(onOpenSummary);
  const onLeaderboardPage = useIsOnEventLeaderboard(event);
  const showLeaderboardLink = !showPreview && !onLeaderboardPage;
  const leaderboardTo = leaderboardPath(event.sportId, event.id);
  const leaderboardState = leaderboardLinkState(event);

  return (
    <div className={["font-display text-sm leading-snug", className].filter(Boolean).join(" ")}>
      <h1 className={eventHeaderTitleClassName(tone)}>
        {showPreview ? (
          <span>{name}</span>
        ) : (
          <Link
            to={leaderboardTo}
            state={leaderboardState}
            className={eventHeaderTitleLinkClassName(tone)}
          >
            {name}
          </Link>
        )}
      </h1>

      <div className="mt-0.5 flex w-full flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className={eventHeaderPrimaryLineClassName(tone)}>
          {sessionWindow ?? `Session ${sessionDate}`}
        </span>
      </div>

      <div className={eventHeaderMetaRowClassName(tone)}>
        {showCountdown ? (
          <EventCountdownLine startDate={startDate} status={statusValue} tone={tone} />
        ) : (
          <span>{status}</span>
        )}
      </div>

      {showPreview || showLeaderboardLink ? (
        <div className={eventHeaderMetaRowClassName(tone)}>
          {showPreview ? (
            <button
              type="button"
              onClick={onOpenSummary}
              className={`${eventHeaderActionLinkClassName(tone)} font-medium`}
            >
              <NewspaperIcon className="h-4 w-4 shrink-0" aria-hidden />
              Tournament Preview
            </button>
          ) : (
            <EventLeaderboardLink event={event} />
          )}
        </div>
      ) : null}
    </div>
  );
}
