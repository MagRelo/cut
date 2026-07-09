import { ChevronRightIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { golfEventStatusFromMetadata } from "@cut/sport-pga-golf";
import type { CompetitionEventShell } from "@cut/sport-sdk/ui";
import { leaderboardLinkState, leaderboardPath } from "../../lib/contestNavigation";
import { formatGolfEventStatus, parseGolfEventMetadata } from "./utils";

interface GolfEventDetailsProps {
  event: CompetitionEventShell;
  className?: string;
  hasSummary?: boolean;
  onOpenSummary?: () => void;
}

export function GolfEventDetails({
  event,
  className = "",
  hasSummary = false,
  onOpenSummary,
}: GolfEventDetailsProps) {
  const meta = parseGolfEventMetadata(event.metadata);
  const name = meta.name ?? event.externalId;
  const locationLine = [meta.city?.trim(), meta.state?.trim()].filter(Boolean).join(", ");
  const periodDisplay = meta.periodDisplay || "R1";
  const periodStatusDisplay = meta.periodStatusDisplay?.trim() || formatGolfEventStatus(meta.status);
  const isSuspended = meta.periodStatusDisplay === "Suspended";
  const isScheduled = golfEventStatusFromMetadata(event.metadata) === "SCHEDULED";
  const showPreview = isScheduled && hasSummary && onOpenSummary;
  const showLeaderboard = !isScheduled;
  const leaderboardTo = leaderboardPath(event.sportId, event.id);
  const leaderboardState = leaderboardLinkState(event);

  const detailSeparator = (
    <span className="text-[9px] leading-none text-white/60" aria-hidden>
      ●
    </span>
  );

  return (
    <div className={["font-display text-sm leading-snug", className].filter(Boolean).join(" ")}>
      <h1 className="font-display text-2xl font-bold leading-snug tracking-tight text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)] sm:text-3xl">
        {showLeaderboard ? (
          <Link
            to={leaderboardTo}
            state={leaderboardState}
            className="rounded-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
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
            <span className="font-medium text-white/95 [text-shadow:_0_1px_1px_rgb(0_0_0_/_35%)]">
              {meta.course}
            </span>
          ) : null}
          {meta.course && locationLine ? detailSeparator : null}
          {locationLine ? (
            <span className="text-white/80 [text-shadow:_0_1px_1px_rgb(0_0_0_/_35%)]">
              {locationLine}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-1 flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 font-medium text-white/95 [text-shadow:_0_1px_1px_rgb(0_0_0_/_35%)]">
        {periodDisplay}
        {detailSeparator}
        <span>
          {isSuspended ? (
            <span className="inline-flex items-center gap-1 text-yellow-300">
              <ExclamationTriangleIcon
                className="h-3.5 w-3.5 shrink-0 text-yellow-300"
                aria-hidden
              />
              <span>{periodStatusDisplay}</span>
            </span>
          ) : (
            <span>{periodStatusDisplay}</span>
          )}
        </span>
        {showLeaderboard ? (
          <>
            {detailSeparator}
            <Link
              to={leaderboardTo}
              state={leaderboardState}
              className="inline-flex items-center gap-0.5 rounded-sm text-white/90 underline-offset-2 hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              View Leaderboard
              <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </Link>
          </>
        ) : showPreview ? (
          <>
            {detailSeparator}
            <button
              type="button"
              onClick={onOpenSummary}
              className="inline-flex items-center gap-0.5 rounded-sm text-white/90 underline-offset-2 hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              Tournament Preview
              <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
