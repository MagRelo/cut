import { DocumentTextIcon } from "@heroicons/react/24/outline";
import React from "react";
import type { ParticipantRowProps } from "@cut/sport-sdk/ui";
import type { RoundData, TournamentPlayerData } from "./types";
import {
  formatRoundStrokesVsPar,
  getRoundDataForDisplay,
  getRoundHoleProgress,
  getTeeTimeLabelForRound,
} from "./scorecard/roundUtils";
import { candidateStableford, parseGolfCandidateMetadata, parseGolfEventMetadata } from "./utils";

function isPlaceholderLeaderboardValue(value: string | undefined): boolean {
  return !value || value === "-" || value === "–";
}

function scoreDataAsTournamentData(
  scoreData: ReturnType<typeof parseGolfCandidateMetadata>["scoreData"],
): TournamentPlayerData | undefined {
  if (!scoreData) return undefined;
  return scoreData as TournamentPlayerData;
}

export const GolfParticipantRow: React.FC<ParticipantRowProps> = ({
  candidate,
  status,
  onClick,
  ownershipPercentage,
  eventMetadata,
}) => {
  const golfEventMeta = parseGolfEventMetadata(eventMetadata);
  const scoringPeriod = (golfEventMeta.roundDisplay ?? "r1").toLowerCase();
  const showLiveLayout = status === "LIVE" || status === "COMPLETE";

  const meta = parseGolfCandidateMetadata(candidate);
  const participant = meta.participant ?? {};
  const tournamentData = scoreDataAsTournamentData(meta.scoreData);

  const displayName =
    participant.lastName && participant.firstName
      ? `${participant.lastName}, ${participant.firstName}`
      : candidate.displayName;

  const totalPoints = candidateStableford(candidate);

  const leaderboardTotalRaw = meta.scoreData?.leaderboardTotal?.trim();
  const leaderboardPositionRaw = meta.scoreData?.leaderboardPosition?.trim();
  const leaderboardPositionDisplay = isPlaceholderLeaderboardValue(leaderboardPositionRaw)
    ? "\u00A0"
    : leaderboardPositionRaw;
  const leaderboardTotalDisplay = isPlaceholderLeaderboardValue(leaderboardTotalRaw)
    ? "\u00A0"
    : leaderboardTotalRaw;

  const roundKey = scoringPeriod;
  const roundDataFromKey = tournamentData?.[roundKey as keyof TournamentPlayerData];
  const icon =
    roundDataFromKey && typeof roundDataFromKey === "object" && "icon" in roundDataFromKey
      ? (roundDataFromKey as RoundData).icon || ""
      : "";

  const roundData = getRoundDataForDisplay(tournamentData, scoringPeriod);
  const holeProgress = getRoundHoleProgress(roundData);
  const roundVsPar = formatRoundStrokesVsPar(roundData);
  const scoreThruLabel = (() => {
    const teeLabel = getTeeTimeLabelForRound(tournamentData, scoringPeriod);
    if (holeProgress == null) {
      return teeLabel ?? "";
    }
    if (holeProgress.played === 0) {
      return teeLabel ?? "Not started";
    }
    const roundComplete = holeProgress.remaining === 0 && holeProgress.played > 0;
    if (roundComplete) {
      return roundVsPar != null ? `${roundVsPar}, Round Complete` : "–, Round Complete";
    }
    const thruPart = `thru ${holeProgress.played}`;
    if (roundVsPar == null) return thruPart;
    return `${roundVsPar} ${thruPart}`;
  })();

  const inactiveContent = (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {participant.imageUrl ? (
          <div className="shrink-0">
            <img
              className="h-10 w-10 rounded-full object-cover"
              src={participant.imageUrl}
              alt={displayName}
            />
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="truncate text-md font-semibold leading-tight text-gray-900">
            {displayName}
          </div>
          <div className="truncate text-xs text-gray-600">{participant.country?.trim() || "—"}</div>
        </div>
      </div>
    </div>
  );

  const liveContent = (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="flex w-4 shrink-0 flex-col items-center justify-center gap-1.5 text-center tabular-nums">
        <span className="text-xs font-semibold leading-none text-gray-800">
          {leaderboardPositionDisplay}
        </span>
        <span
          className={`text-xs font-semibold leading-none ${
            leaderboardTotalRaw?.startsWith("-") ? "text-red-600" : "text-gray-900"
          }`}
        >
          {leaderboardTotalDisplay}
        </span>
      </div>

      {participant.imageUrl ? (
        <div className="shrink-0">
          <img
            className="h-10 w-10 rounded-full object-cover"
            src={participant.imageUrl}
            alt={displayName}
          />
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-md font-semibold leading-tight text-gray-900">
            {displayName}
          </div>
          {icon ? (
            <span className="shrink-0 text-base" title="Player status">
              {icon}
            </span>
          ) : null}
        </div>

        <div
          className="flex min-h-5 items-center text-xs tabular-nums text-gray-700"
          title="This round vs par and holes completed"
        >
          {scoreThruLabel ? <span>{scoreThruLabel}</span> : "\u00A0"}
        </div>
      </div>

      {ownershipPercentage !== undefined ? (
        <div className="min-w-[3.25rem] shrink-0 rounded bg-slate-100 px-2 py-1 text-center">
          <div className="text-xs font-semibold leading-none text-slate-700">
            {ownershipPercentage}%
          </div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-slate-500">
            OWN
          </div>
        </div>
      ) : null}

      <div className="flex shrink-0 items-center gap-4">
        <DocumentTextIcon className="h-5 w-5 shrink-0 text-blue-400" aria-hidden />

        <div className="text-center">
          <div className="text-lg font-bold leading-none text-gray-900">{totalPoints}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
            PTS
          </div>
        </div>
      </div>
    </div>
  );

  const content = showLiveLayout ? liveContent : inactiveContent;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group w-full min-w-0 cursor-pointer text-left font-display"
      >
        {content}
      </button>
    );
  }

  return <div className="w-full min-w-0 font-display">{content}</div>;
};
