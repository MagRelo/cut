import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { Link } from "react-router-dom";
import { SportParticipantDetailModal } from "../platform/SportParticipantDetailModal";
import { ContestCard } from "../contest/ContestCard";
import { SideBetPanel } from "./sideBet/SideBetPanel";
import { PlusIcon, UserIcon } from "@heroicons/react/24/outline";
import { LineupSlotPicker } from "../platform/LineupSlotPicker";
import { SportLineupPickRow } from "../platform/SportLineupPickRow";
import { SportParticipantRow } from "../platform/SportParticipantRow";
import type { Candidate } from "@cut/sport-sdk";
import type { ContestLineup } from "../../types/lineup";
import type { Contest } from "../../types/contest";
import { contestLobbyPath } from "../../utils/contestRoutes";
import { tabButtonClassName, tabListClassName } from "../../lib/tabStyles";
import { useActiveEvent } from "../../hooks/useActiveEvent";
import {
  candidatesByParticipantIdMap,
  candidatesForLineupPicks,
  contestLineupDisplayName,
  lineupPicksFromContestLineup,
} from "../../lib/candidateUtils";
import {
  participantLastName,
  sortCandidatesByLeaderboard,
} from "../../lib/candidateSorting";
import { candidateStableford } from "../../sports/pga-golf/utils";
import {
  candidatesForPlatformLineup,
  platformLineupParticipantIds,
  platformLineupPrediction,
} from "../../lib/lineupUtils";
import { useLineupData } from "../../hooks/useLineupData";
import { useLineupSlotEditor } from "../../hooks/useLineupSlotEditor";
import { SportPredictionField } from "../platform/SportPredictionField";
import { golfPredictionValue, toGolfPrediction } from "../../lib/golfPrediction";
import {
  defaultWinningScorePredictionForLineup,
  DUPLICATE_LINEUP_PREDICTION_MESSAGE,
} from "../../utils/winningScorePrediction";

const DEFAULT_USER_COLOR = "#9CA3AF";

const getLineupNumberLabel = (lineupName?: string) => {
  if (!lineupName) return null;
  const match = lineupName.match(/lineup\s*#\s*(\d+)/i);
  return match?.[1] ? `#${match[1]}` : null;
};

const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
};

interface ContestInfo {
  contest: Contest;
  position: number;
}

interface LineupContestCardProps {
  lineup: ContestLineup;
  contests?: ContestInfo[];
  isEditable?: boolean;
}

const TAB_PANEL_MIN_HEIGHT_CLASS = "min-h-[18.5rem] py-3 flow-root";

/** Matches the “no contests” badge on the Contests tab label. */
const NO_CONTESTS_WARNING_BADGE_CLASS =
  "inline-flex shrink-0 items-center rounded bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700";

export const LineupContestCard: React.FC<LineupContestCardProps> = ({
  lineup,
  contests = [],
  isEditable = false,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);
  const [sliderError, setSliderError] = useState<string | null>(null);
  const [isSavingPrediction, setIsSavingPrediction] = useState(false);

  const { candidates, isEventEditable, eventId, status } = useActiveEvent();
  const candidatesByParticipantId = useMemo(
    () => candidatesByParticipantIdMap(candidates),
    [candidates],
  );
  const { updateLineup, lineups } = useLineupData({ eventId });

  const platformLineup =
    lineup.lineup && "picks" in lineup.lineup ? lineup.lineup : null;
  const lineupId = lineup.lineupId ?? platformLineup?.id ?? "";
  const lineupName = contestLineupDisplayName(lineup);
  const initialCandidates = useMemo(() => {
    if (platformLineup) {
      return candidatesForPlatformLineup(platformLineup, candidatesByParticipantId);
    }
    return candidatesForLineupPicks(
      lineupPicksFromContestLineup(lineup),
      candidatesByParticipantId,
    );
  }, [platformLineup, lineup, candidatesByParticipantId]);
  const canEditSlots = Boolean(isEditable && isEventEditable && lineupId);

  const serverPrediction = useMemo(() => {
    const fromList = lineups.find((entry) => entry.id === lineupId);
    const fromListValue = fromList ? platformLineupPrediction(fromList) : null;
    const fromLineup =
      platformLineup && "prediction" in platformLineup
        ? golfPredictionValue(platformLineup.prediction)
        : null;
    const value = fromListValue ?? fromLineup;
    if (value != null) return value;
    return lineupId ? defaultWinningScorePredictionForLineup(lineupId) : 120;
  }, [platformLineup, lineupId, lineups]);

  const [prediction, setPrediction] = useState(serverPrediction);

  useEffect(() => {
    setPrediction(serverPrediction);
    setSliderError(null);
  }, [lineupId, serverPrediction]);

  const slotEditor = useLineupSlotEditor({
    lineupId,
    initialCandidates,
    fieldCandidates: candidates,
    lineups,
    winningScorePrediction: prediction,
    updateLineup,
  });

  const savePrediction = useCallback(
    async (nextPrediction: number) => {
      if (!canEditSlots || !lineupId) return;

      const playerIds = slotEditor.selectedParticipantIds;
      const duplicate = lineups.some((entry) => {
        if (entry.id === lineupId) return false;
        const existingIds = platformLineupParticipantIds(entry).sort().join(",");
        const nextIds = [...playerIds].sort().join(",");
        return existingIds === nextIds && platformLineupPrediction(entry) === nextPrediction;
      });

      if (duplicate) {
        setSliderError(DUPLICATE_LINEUP_PREDICTION_MESSAGE);
        return;
      }

      setIsSavingPrediction(true);
      setSliderError(null);
      try {
        await updateLineup(lineupId, playerIds, { winningScorePrediction: nextPrediction });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save prediction";
        setSliderError(message);
        setPrediction(serverPrediction);
      } finally {
        setIsSavingPrediction(false);
      }
    },
    [canEditSlots, lineupId, lineups, serverPrediction, slotEditor.selectedParticipantIds, updateLineup],
  );

  useEffect(() => {
    if (!canEditSlots || prediction === serverPrediction) return;

    const timer = window.setTimeout(() => {
      void savePrediction(prediction);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [canEditSlots, prediction, savePrediction, serverPrediction]);

  const slotActionsDisabled = !canEditSlots || slotEditor.isSaving || isSavingPrediction;

  const openDetailModal = (candidate: Candidate) => {
    setDetailCandidate(candidate);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setDetailCandidate(null);
  };

  const displayCandidates = canEditSlots
    ? slotEditor.slots.filter((candidate): candidate is Candidate => candidate !== null)
    : sortCandidatesByLeaderboard(initialCandidates);

  const playerCount = canEditSlots ? slotEditor.filledCount : initialCandidates.length;

  const totalPoints = displayCandidates.reduce(
    (sum, candidate) => sum + candidateStableford(candidate),
    0,
  );

  const userSettings = lineup.user?.settings;
  const maybeUserColor =
    typeof userSettings === "object" && userSettings !== null
      ? (userSettings as { color?: unknown }).color
      : undefined;
  const userColorHex = typeof maybeUserColor === "string" ? maybeUserColor : undefined;
  const resolvedBorderColor = isValidHexColor(userColorHex) ? userColorHex : DEFAULT_USER_COLOR;
  const sideBetLineupNumberLabel = getLineupNumberLabel(lineupName);
  const sideBetPlayerLastNames = displayCandidates
    .map((candidate) => participantLastName(candidate))
    .join(", ");
  const sideBetUserLabel = lineup.user?.name || lineup.user?.email || "Unknown User";

  return (
    <div className="bg-white">
      {/* Header */}
      <div
        className="p-3 py-5 font-display"
        style={{
          borderLeftColor: resolvedBorderColor,
          borderLeftWidth: "5px",
          borderLeftStyle: "solid",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 pl-1 text-left font-display">
            <div className="truncate text-xl font-semibold leading-tight text-gray-900">
              {lineup.user?.name || lineup.user?.email || "Unknown User"}
            </div>
            <div className="truncate text-sm leading-tight text-gray-700">
              {lineupName || `Lineup ${lineup.id.slice(-6)}`}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 pr-5 text-right">
            <div className="text-xl font-bold leading-none text-gray-900">{totalPoints}</div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
              PTS
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="p-4 pt-0">
        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <TabList className={tabListClassName("space-x-1")}>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                tabButtonClassName(selected, { compact: true })
              }
            >
              Players ({playerCount})
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                tabButtonClassName(selected, { compact: true })
              }
            >
              Parlays
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                tabButtonClassName(selected, { compact: true })
              }
            >
              <span className="inline-flex items-center gap-1">
                <span>Contests ({contests.length})</span>
                {contests.length === 0 ? (
                  <span
                    className={NO_CONTESTS_WARNING_BADGE_CLASS}
                    title="No contests for this lineup"
                    aria-label="Warning: lineup has no contests"
                  >
                    !
                  </span>
                ) : null}
              </span>
            </Tab>
          </TabList>

          <div className="">
            {/* PLAYERS TAB */}
            <TabPanel className={TAB_PANEL_MIN_HEIGHT_CLASS}>
              <div className="space-y-1">
                {canEditSlots
                  ? slotEditor.slots.map((candidate, index) => (
                      <div key={`slot-${index}`} className="p-3">
                        {candidate ? (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <SportLineupPickRow
                                candidate={candidate}
                                onClick={() => openDetailModal(candidate)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => slotEditor.openSlot(index)}
                              disabled={slotActionsDisabled}
                              className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-blue-500 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Edit player in slot ${index + 1}`}
                            >
                              <svg
                                className="h-4 w-4 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                              Edit
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => slotEditor.openSlot(index)}
                              disabled={slotActionsDisabled}
                              className="flex min-w-0 flex-1 items-center gap-3 text-left font-display disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                <UserIcon className="h-6 w-6 text-slate-300" aria-hidden />
                              </div>
                              <span className="truncate text-md font-semibold leading-tight text-slate-400">
                                No player selected
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => slotEditor.openSlot(index)}
                              disabled={slotActionsDisabled}
                              className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-blue-500 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Add player to slot ${index + 1}`}
                            >
                              <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
                              Add
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  : displayCandidates.map((candidate) => (
                      <div key={candidate.participantId} className="p-3">
                        <SportParticipantRow
                          candidate={candidate}
                          status={status ?? "SCHEDULED"}
                          onClick={() => openDetailModal(candidate)}
                        />
                      </div>
                    ))}
              </div>
              {canEditSlots ? (
                <SportPredictionField
                  value={toGolfPrediction(prediction)}
                  onChange={(value) => {
                    const next = golfPredictionValue(value);
                    if (next != null) setPrediction(next);
                  }}
                  disabled={slotActionsDisabled}
                  error={sliderError}
                />
              ) : null}
            </TabPanel>

            {/* PARLAYS TAB */}
            <TabPanel className={TAB_PANEL_MIN_HEIGHT_CLASS}>
              <SideBetPanel
                borderColor={resolvedBorderColor}
                userLabel={sideBetUserLabel}
                lineupNumberLabel={sideBetLineupNumberLabel}
                playerLastNamesLine={sideBetPlayerLastNames}
                tournamentLineupId={lineupId}
              />
            </TabPanel>

            {/* CONTESTS TAB */}
            <TabPanel className={TAB_PANEL_MIN_HEIGHT_CLASS}>
              <div className="space-y-3 pt-1">
                {contests.length > 0 ? (
                  contests.map((contestInfo) => {
                    return (
                      <div key={contestInfo.contest.id} className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 rounded-sm border border-gray-200 bg-white p-3 py-4 shadow-sm">
                          <Link
                            to={contestLobbyPath(contestInfo.contest.address)}
                            className="block"
                          >
                            <ContestCard contest={contestInfo.contest} />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-sm border border-gray-200 bg-white p-4 shadow">
                    <p className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-gray-900">
                      <span className={NO_CONTESTS_WARNING_BADGE_CLASS} aria-hidden>
                        !
                      </span>
                      <span>This lineup is not entered in any contests.</span>
                    </p>
                    <p className="font-display text-sm leading-relaxed text-gray-600">
                      Browse available contests and enter your lineup.
                    </p>
                    <Link
                      to="/contests"
                      className="mt-3 inline-block rounded border border-blue-500 bg-blue-500 px-3 py-1 font-display text-sm text-white transition-colors hover:bg-blue-600"
                    >
                      Browse Contests
                    </Link>
                  </div>
                )}
              </div>
            </TabPanel>
          </div>
        </TabGroup>
      </div>

      {canEditSlots && eventId ? (
        <LineupSlotPicker
          eventId={eventId}
          isOpen={slotEditor.selectedSlotIndex !== null}
          onClose={slotEditor.closeSlot}
          onSelectParticipant={slotEditor.handlePlayerSelect}
          selectedParticipantIds={slotEditor.selectedParticipantIds}
          isSaving={slotEditor.isSaving}
          saveError={slotEditor.saveError}
        />
      ) : null}

      <SportParticipantDetailModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        candidate={detailCandidate}
      />
    </div>
  );
};
