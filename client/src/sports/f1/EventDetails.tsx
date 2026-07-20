import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { f1EventStatusFromMetadata } from "@cut/sport-f1";
import type { CompetitionEventShell } from "@cut/sport-sdk/ui";
import { leaderboardLinkState, leaderboardPath } from "../../lib/contestNavigation";
import {
  EventCountdownLine,
  shouldShowEventCountdown,
} from "../../components/platform/EventCountdownLine";
import { formatF1EventStatusLabel, parseF1EventMetadataView } from "./utils";

interface F1EventDetailsProps {
  event: CompetitionEventShell;
  className?: string;
}

const metaRowClassName =
  "mt-1 flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 font-medium text-white/95 [text-shadow:_0_1px_1px_rgb(0_0_0_/_35%)]";

const actionLinkClassName =
  "inline-flex items-center gap-0.5 rounded-sm text-white/90 underline-offset-2 hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

export function F1EventDetails({ event, className = "" }: F1EventDetailsProps) {
  const meta = parseF1EventMetadataView(event.metadata);
  const f1 = meta.f1 ?? {};
  const name = meta.name ?? f1.raceName ?? event.externalId;
  const status = formatF1EventStatusLabel(f1EventStatusFromMetadata(event.metadata));
  const seasonRound =
    f1.season != null && f1.round != null ? `${f1.season} · Round ${f1.round}` : null;
  const showCountdown = shouldShowEventCountdown(event.metadata);
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
        <Link
          to={leaderboardTo}
          state={leaderboardState}
          className="rounded-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          {name}
        </Link>
      </h1>

      {seasonRound || f1.circuitId ? (
        <div className="mt-0.5 flex w-full flex-wrap items-center gap-x-2 gap-y-0.5">
          {seasonRound ? (
            <span className="font-medium text-white/95 [text-shadow:_0_1px_1px_rgb(0_0_0_/_35%)]">
              {seasonRound}
            </span>
          ) : null}
          {seasonRound && f1.circuitId ? detailSeparator : null}
          {f1.circuitId ? (
            <span className="text-white/80 capitalize [text-shadow:_0_1px_1px_rgb(0_0_0_/_35%)]">
              {f1.circuitId.replace(/_/g, " ")}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={metaRowClassName}>
        {showCountdown ? <EventCountdownLine metadata={event.metadata} /> : <span>{status}</span>}
      </div>

      <div className={metaRowClassName}>
        <Link to={leaderboardTo} state={leaderboardState} className={actionLinkClassName}>
          View Leaderboard
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
