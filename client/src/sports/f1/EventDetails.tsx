import { Link } from "react-router-dom";
import { f1EventStatusFromMetadata } from "@cut/sport-f1";
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
import { formatF1EventStatusLabel, parseF1EventMetadataView } from "./utils";
import {
  eventHeaderMetaRowClassName,
  eventHeaderPrimaryLineClassName,
  eventHeaderSecondaryLineClassName,
  eventHeaderSeparatorClassName,
  eventHeaderTitleClassName,
  eventHeaderTitleLinkClassName,
  type EventHeaderTone,
} from "../../components/platform/eventHeaderTone";

interface F1EventDetailsProps {
  event: CompetitionEventShell;
  className?: string;
  tone?: EventHeaderTone;
}

export function F1EventDetails({ event, className = "", tone = "hero" }: F1EventDetailsProps) {
  const meta = parseF1EventMetadataView(event.metadata);
  const f1 = meta.f1 ?? {};
  const name = meta.name ?? f1.raceName ?? event.externalId;
  const status = formatF1EventStatusLabel(f1EventStatusFromMetadata(event.metadata));
  const seasonRound =
    f1.season != null && f1.round != null ? `${f1.season} · Round ${f1.round}` : null;
  const showCountdown = shouldShowEventCountdown(event.metadata);
  const onLeaderboardPage = useIsOnEventLeaderboard(event);
  const leaderboardTo = leaderboardPath(event.sportId, event.id);
  const leaderboardState = leaderboardLinkState(event);

  const detailSeparator = (
    <span className={eventHeaderSeparatorClassName(tone)} aria-hidden>
      ●
    </span>
  );

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

      {seasonRound || f1.circuitId ? (
        <div className="mt-0.5 flex w-full flex-wrap items-center gap-x-2 gap-y-0.5">
          {seasonRound ? (
            <span className={eventHeaderPrimaryLineClassName(tone)}>{seasonRound}</span>
          ) : null}
          {seasonRound && f1.circuitId ? detailSeparator : null}
          {f1.circuitId ? (
            <span className={`${eventHeaderSecondaryLineClassName(tone)} capitalize`}>
              {f1.circuitId.replace(/_/g, " ")}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={eventHeaderMetaRowClassName(tone)}>
        {showCountdown ? (
          <EventCountdownLine metadata={event.metadata} tone={tone} />
        ) : (
          <span>{status}</span>
        )}
      </div>

      {onLeaderboardPage ? null : (
        <div className={eventHeaderMetaRowClassName(tone)}>
          <EventLeaderboardLink event={event} />
        </div>
      )}
    </div>
  );
}
