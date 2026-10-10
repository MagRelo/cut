import { ChevronRightIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { golfEventStatusFromMetadata } from "@cut/sport-pga-golf";
import type { CompetitionEventShell } from "@cut/sport-sdk/ui";
import { leaderboardLinkState, leaderboardPath } from "../../lib/contestNavigation";
import {
  EventCountdownLine,
  shouldShowEventCountdown,
} from "../../components/platform/EventCountdownLine";
import { EventLeaderboardLink } from "../../components/platform/EventLeaderboardLink";
import { formatGolfEventStatus, parseGolfEventMetadata } from "./utils";
import {
  eventHeaderActionLinkClassName,
  eventHeaderMetaRowClassName,
  eventHeaderPrimaryLineClassName,
  eventHeaderSecondaryLineClassName,
  eventHeaderSeparatorClassName,
  eventHeaderSuspendedClassName,
  eventHeaderTitleClassName,
  eventHeaderTitleLinkClassName,
  type EventHeaderTone,
} from "../../components/platform/eventHeaderTone";

interface GolfEventDetailsProps {
  event: CompetitionEventShell;
  className?: string;
  hasSummary?: boolean;
  onOpenSummary?: () => void;
  tone?: EventHeaderTone;
}

export function GolfEventDetails({
  event,
  className = "",
  hasSummary = false,
  onOpenSummary,
  tone = "hero",
}: GolfEventDetailsProps) {
  const meta = parseGolfEventMetadata(event.metadata);
  const name = meta.name ?? event.externalId;
  const locationLine = [meta.city?.trim(), meta.state?.trim()].filter(Boolean).join(", ");
  const periodDisplay = meta.periodDisplay || "R1";
  const periodStatusDisplay = meta.periodStatusDisplay?.trim() || formatGolfEventStatus(meta.status);
  const isSuspended = meta.periodStatusDisplay === "Suspended";
  const isScheduled = golfEventStatusFromMetadata(event.metadata) === "SCHEDULED";
  const showCountdown = shouldShowEventCountdown(event.metadata);
  const showPreview = isScheduled && hasSummary && onOpenSummary;
  const showLeaderboard = !isScheduled;
  const leaderboardTo = leaderboardPath(event.sportId, event.id);
  const leaderboardState = leaderboardLinkState(event);

  const detailSeparator = (
    <span className={eventHeaderSeparatorClassName(tone)} aria-hidden>
      ●
    </span>
  );
  const suspendedClassName = eventHeaderSuspendedClassName(tone);

  return (
    <div className={["font-display text-sm leading-snug", className].filter(Boolean).join(" ")}>
      <h1 className={eventHeaderTitleClassName(tone)}>
        {showLeaderboard ? (
          <Link
            to={leaderboardTo}
            state={leaderboardState}
            className={eventHeaderTitleLinkClassName(tone)}
          >
            {name}
          </Link>
        ) : (
          <span>{name}</span>
        )}
      </h1>

      {meta.course || locationLine ? (
        <div className="mt-1 flex w-full flex-wrap items-center gap-x-2 gap-y-0.5">
          {meta.course ? (
            <span className={eventHeaderPrimaryLineClassName(tone)}>{meta.course}</span>
          ) : null}
          {meta.course && locationLine ? detailSeparator : null}
          {locationLine ? (
            <span className={eventHeaderSecondaryLineClassName(tone)}>{locationLine}</span>
          ) : null}
        </div>
      ) : null}

      <div className={eventHeaderMetaRowClassName(tone)}>
        {showCountdown ? (
          <EventCountdownLine metadata={event.metadata} tone={tone} />
        ) : (
          <>
            {periodDisplay}
            {detailSeparator}
            <span>
              {isSuspended ? (
                <span className={`inline-flex items-center gap-1 ${suspendedClassName}`}>
                  <ExclamationTriangleIcon
                    className={`h-3.5 w-3.5 shrink-0 ${suspendedClassName}`}
                    aria-hidden
                  />
                  <span>{periodStatusDisplay}</span>
                </span>
              ) : (
                <span>{periodStatusDisplay}</span>
              )}
            </span>
          </>
        )}
      </div>

      {showPreview || showLeaderboard ? (
        <div className={eventHeaderMetaRowClassName(tone)}>
          {showLeaderboard ? (
            <EventLeaderboardLink event={event} />
          ) : (
            <button
              type="button"
              onClick={onOpenSummary}
              className={eventHeaderActionLinkClassName(tone)}
            >
              Tournament Preview
              <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
