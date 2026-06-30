import { ArrowTopRightOnSquareIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import React, { useEffect, useState } from "react";
import type { ParticipantDetailProps } from "@cut/sport-sdk/ui";
import type { RoundData, TournamentPlayerData } from "./types";
import {
  formatRoundStrokesVsPar,
  getRoundDataForDisplay,
  getRoundHoleProgress,
  getTeeTimeLabelForRound,
  isScorecardRoundSelectable,
  resolveTournamentRoundNumber,
  roundHasBeenPlayed,
} from "./scorecard/roundUtils";
import { GolfParticipantScorecard } from "./scorecard/ParticipantScorecard";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { ParticipantStatsPanel } from "./ParticipantStatsPanel";
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

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

const Label: React.FC<LabelProps> = ({ children, className = "" }) => (
  <span
    className={`text-[10px] uppercase text-gray-500 font-semibold font-display tracking-wide leading-none ${className}`}
  >
    {children}
  </span>
);

const STAT_VALUE_CLASS =
  "w-full min-h-[1.5rem] text-center font-display text-lg leading-none tabular-nums";
const STAT_CELL_OUTER =
  "flex h-full min-h-0 w-full min-w-0 flex-col items-stretch px-1 py-1.5";
const STAT_CELL_BUTTON = `${STAT_CELL_OUTER} appearance-none border-0 text-center`;
const STAT_LABEL_STRIP_BASE = "mb-0 w-full pt-0.5 pb-0.5 text-center";

function DetailHeader({
  displayName,
  imageUrl,
  country,
  status,
  tournamentData,
  roundDisplay,
  totalPoints,
  rowTrailing,
  onShare,
}: {
  displayName: string;
  imageUrl?: string | null;
  country?: string | null;
  status: ParticipantDetailProps["status"];
  tournamentData: TournamentPlayerData | undefined;
  roundDisplay: string;
  totalPoints: number;
  rowTrailing: "scorecard" | "share";
  onShare?: () => void;
}) {
  const showLiveLayout = status === "LIVE" || status === "COMPLETE";

  const leaderboardTotalRaw = tournamentData?.leaderboardTotal?.trim();
  const leaderboardPositionRaw = tournamentData?.leaderboardPosition?.trim();
  const leaderboardPositionDisplay = isPlaceholderLeaderboardValue(leaderboardPositionRaw)
    ? "\u00A0"
    : leaderboardPositionRaw;
  const leaderboardTotalDisplay = isPlaceholderLeaderboardValue(leaderboardTotalRaw)
    ? "\u00A0"
    : leaderboardTotalRaw;

  const roundKey = roundDisplay.toLowerCase();
  const roundDataFromKey = tournamentData?.[roundKey as keyof TournamentPlayerData];
  const icon =
    roundDataFromKey && typeof roundDataFromKey === "object" && "icon" in roundDataFromKey
      ? (roundDataFromKey as RoundData).icon || ""
      : "";

  const roundData = getRoundDataForDisplay(tournamentData, roundDisplay);
  const holeProgress = getRoundHoleProgress(roundData);
  const roundVsPar = formatRoundStrokesVsPar(roundData);
  const scoreThruLabel = (() => {
    const teeLabel = getTeeTimeLabelForRound(tournamentData, roundDisplay);
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

  const trailingControl =
    rowTrailing === "share" && onShare ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onShare();
        }}
        className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-800"
        aria-label="Share player leaderboard link"
        title="Share player"
      >
        <ArrowTopRightOnSquareIcon className="h-5 w-5" aria-hidden />
      </button>
    ) : null;

  if (!showLiveLayout) {
    return (
      <div className="flex items-center justify-between gap-3 font-display">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <ParticipantAvatar imageUrl={imageUrl} alt={displayName} />
          <div className="min-w-0">
            <div className="truncate text-md font-semibold leading-tight text-gray-900">
              {displayName}
            </div>
            <div className="truncate text-xs text-gray-600">{country?.trim() || "—"}</div>
          </div>
        </div>
        {trailingControl}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 font-display">
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

      <ParticipantAvatar imageUrl={imageUrl} alt={displayName} />

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

      <div className="flex shrink-0 items-center gap-4">
        {rowTrailing === "share" && onShare ? (
          trailingControl
        ) : (
          <DocumentTextIcon className="h-5 w-5 shrink-0 text-blue-400" aria-hidden />
        )}
        <div className="text-center">
          <div className="text-lg font-bold leading-none text-gray-900">{totalPoints}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
            PTS
          </div>
        </div>
      </div>
    </div>
  );
}

export const GolfParticipantDetail: React.FC<ParticipantDetailProps> = ({
  candidate,
  status,
  rowTrailing = "share",
  onShare,
  eventMetadata,
}) => {
  const golfMeta = parseGolfEventMetadata(eventMetadata);
  const currentRound = resolveTournamentRoundNumber(
    golfMeta.roundDisplay ?? "R1",
    golfMeta.currentRound ?? null,
  );
  const [selectedScorecardRound, setSelectedScorecardRound] = useState(currentRound);

  useEffect(() => {
    setSelectedScorecardRound(currentRound);
  }, [candidate.participantId, currentRound]);

  const meta = parseGolfCandidateMetadata(candidate);
  const participant = meta.participant ?? {};
  const tournamentData = scoreDataAsTournamentData(meta.scoreData);

  const displayName =
    participant.lastName && participant.firstName
      ? `${participant.lastName}, ${participant.firstName}`
      : candidate.displayName;

  const totalPoints = candidateStableford(candidate);
  const showSeasonStats = status === "SCHEDULED";

  return (
    <div className="overflow-hidden border border-gray-300 rounded-sm bg-white">
      <div className="bg-white overflow-hidden">
        <div className="p-3 py-4">
          <DetailHeader
            displayName={displayName}
            imageUrl={participant.imageUrl}
            country={participant.country}
            status={status}
            tournamentData={tournamentData}
            roundDisplay={`r${selectedScorecardRound}`}
            totalPoints={totalPoints}
            rowTrailing={rowTrailing}
            onShare={rowTrailing === "share" ? onShare : undefined}
          />
        </div>

        {showSeasonStats ? (
          <div className="border-t border-gray-200 px-4 py-4">
            <ParticipantStatsPanel candidate={candidate} />
          </div>
        ) : (
          <>
            <div
              className="grid w-full grid-cols-[repeat(4,minmax(0,1fr))_repeat(2,minmax(0,1fr))] items-stretch border-t border-gray-200 divide-x divide-gray-200 bg-white"
              role="presentation"
            >
          {(
            [
              [1, tournamentData?.r1],
              [2, tournamentData?.r2],
              [3, tournamentData?.r3],
              [4, tournamentData?.r4],
            ] as const
          ).map(([roundNum, data]) => {
            const played = roundHasBeenPlayed(data);
            const selectable = isScorecardRoundSelectable(roundNum, data, currentRound);
            const selected = selectedScorecardRound === roundNum;
            const label = `R${roundNum}`;
            const value = played && data?.total !== undefined ? data.total : null;

            const valueClass = !played ? "font-medium text-gray-300" : "font-bold text-gray-900";

            if (!selectable) {
              return (
                <div
                  key={label}
                  className={`${STAT_CELL_OUTER} cursor-default !bg-white text-center`}
                  aria-label={`${label}, no round data`}
                >
                  <div className={STAT_LABEL_STRIP_BASE}>
                    <Label className="block !text-gray-400">{label}</Label>
                  </div>
                  <div className={`${STAT_VALUE_CLASS} ${valueClass}`}>{value ?? ""}</div>
                </div>
              );
            }

            return (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedScorecardRound(roundNum)}
                className={`group ${STAT_CELL_BUTTON} transition-colors focus:outline-none ${
                  selected ? "bg-slate-100" : "bg-white hover:bg-slate-50"
                }`}
              >
                <div className={STAT_LABEL_STRIP_BASE}>
                  <Label
                    className={`block ${selected ? "" : played ? "!text-blue-600" : "!text-gray-500"}`}
                  >
                    {label}
                  </Label>
                </div>
                <div className={`${STAT_VALUE_CLASS} ${valueClass}`}>{value ?? ""}</div>
              </button>
            );
          })}

          <div className={`${STAT_CELL_OUTER} !bg-white text-center`}>
            <div className={STAT_LABEL_STRIP_BASE}>
              <Label className="block !text-gray-400">CUT</Label>
            </div>
            <div
              className={`${STAT_VALUE_CLASS} ${
                tournamentData?.cut && tournamentData.cut > 0
                  ? "font-bold text-green-600"
                  : "font-medium text-gray-300"
              }`}
            >
              {tournamentData?.cut && tournamentData.cut > 0 ? `+${tournamentData.cut}` : ""}
            </div>
          </div>

          <div className={`${STAT_CELL_OUTER} !bg-white text-center`}>
            <div className={STAT_LABEL_STRIP_BASE}>
              <Label className="block !text-gray-400">POS</Label>
            </div>
            <div
              className={`${STAT_VALUE_CLASS} ${
                tournamentData?.bonus && tournamentData.bonus > 0
                  ? "font-bold text-green-600"
                  : "font-medium text-gray-300"
              }`}
            >
              {tournamentData?.bonus && tournamentData.bonus > 0 ? `+${tournamentData.bonus}` : ""}
            </div>
          </div>
            </div>

            <div className="max-h-[min(50vh,22rem)] overflow-y-auto bg-white">
              <GolfParticipantScorecard
                tournamentData={tournamentData}
                selectedRound={selectedScorecardRound}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
