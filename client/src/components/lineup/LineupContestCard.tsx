import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { SportParticipantDetailModal } from "../platform/SportParticipantDetailModal";
import { SideBetPanel } from "./sideBet/SideBetPanel";
import { PlusIcon, UserIcon } from "@heroicons/react/24/outline";
import { CandidatePicker } from "../platform/CandidatePicker";
import { SportLineupPickRow } from "../platform/SportLineupPickRow";
import { SportParticipantRow } from "../platform/SportParticipantRow";
import type { Candidate } from "@cut/sport-sdk";
import type { ContestLineup } from "../../types/lineup";
import { tabButtonClassName, tabListClassName } from "../../lib/tabStyles";
import type { EventStatus } from "../../types/event";
import {
  candidatesByEventParticipantIdMap,
  candidatesForLineupPicks,
  contestLineupDisplayName,
  lineupPicksFromContestLineup,
} from "../../lib/candidateUtils";
import { useCandidateSort } from "../../hooks/useCandidateSort";
import { participantLastName } from "../../lib/candidateSorting";
import { lineupDisplayScore } from "../../lib/lineupScore";
import {
  candidatesForPlatformLineup,
  platformLineupEventParticipantIds,
  platformLineupPrediction,
} from "../../lib/lineupUtils";
import { useLineupData } from "../../hooks/useLineupData";
import { useEventCandidatesQuery } from "../../hooks/useSportData";
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

interface LineupContestCardProps {
  lineup: ContestLineup;
  isEditable?: boolean;
  sportId: string;
  eventId: string;
  eventStatus: EventStatus;
  eventMetadata?: unknown;
  isEventEditable: boolean;
}

const PLAYERS_TAB_PANEL_CLASS = "flow-root";
const PARLAYS_TAB_PANEL_CLASS = "min-h-[18.5rem] py-3 flow-root";

export const LineupContestCard: React.FC<LineupContestCardProps> = ({
  lineup,
  isEditable = false,
  sportId,
  eventId,
  eventStatus,
  eventMetadata,
  isEventEditable,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);
  const [sliderError, setSliderError] = useState<string | null>(null);
  const [isSavingPrediction, setIsSavingPrediction] = useState(false);

  const { data: candidates = [] } = useEventCandidatesQuery(sportId, eventId);
  const { sort } = useCandidateSort(sportId);
  const candidatesByEventParticipantId = useMemo(
    () => candidatesByEventParticipantIdMap(candidates),
    [candidates],
  );
  const { updateLineup, lineups } = useLineupData({ eventId });
  const status = eventStatus;

  const platformLineup = lineup.lineup && "picks" in lineup.lineup ? lineup.lineup : null;
  const lineupId = lineup.lineupId ?? platformLineup?.id ?? "";
  const lineupName = contestLineupDisplayName(lineup);
  const initialCandidates = useMemo(() => {
    if (platformLineup) {
      return candidatesForPlatformLineup(platformLineup, candidatesByEventParticipantId);
    }
    return candidatesForLineupPicks(
      lineupPicksFromContestLineup(lineup),
      candidatesByEventParticipantId,
    );
  }, [platformLineup, lineup, candidatesByEventParticipantId]);
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

      const picks = slotEditor.selectedEventParticipantIds;
      const duplicate = lineups.some((entry) => {
        if (entry.id === lineupId) return false;
        const existingIds = platformLineupEventParticipantIds(entry).sort().join(",");
        const nextIds = [...picks].sort().join(",");
        return existingIds === nextIds && platformLineupPrediction(entry) === nextPrediction;
      });

      if (duplicate) {
        setSliderError(DUPLICATE_LINEUP_PREDICTION_MESSAGE);
        return;
      }

      setIsSavingPrediction(true);
      setSliderError(null);
      try {
        await updateLineup(lineupId, picks, { winningScorePrediction: nextPrediction });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save prediction";
        setSliderError(message);
        setPrediction(serverPrediction);
      } finally {
        setIsSavingPrediction(false);
      }
    },
    [
      canEditSlots,
      lineupId,
      lineups,
      serverPrediction,
      slotEditor.selectedEventParticipantIds,
      updateLineup,
    ],
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
    : sort(initialCandidates, "lineupPicks", status);

  const playerCount = canEditSlots ? slotEditor.filledCount : initialCandidates.length;

  const totalPoints = lineupDisplayScore(lineup);

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
        className="px-3 py-4 font-display"
        style={{
          borderLeftColor: resolvedBorderColor,
          borderLeftWidth: "5px",
          borderLeftStyle: "solid",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 text-left font-display">
            <div className="truncate text-xl font-semibold leading-tight text-gray-900">
              {lineup.user?.name || lineup.user?.email || "Unknown User"}
            </div>
            <div className="truncate text-sm leading-tight text-gray-700">
              {lineupName || `Lineup ${lineup.id.slice(-6)}`}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-right">
            <div className="text-xl font-bold leading-none text-gray-900">{totalPoints}</div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
              PTS
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-3 pb-3 pt-0">
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
          </TabList>

          <div>
            {/* PLAYERS TAB */}
            <TabPanel className={PLAYERS_TAB_PANEL_CLASS}>
              <div className="py-3">
                {canEditSlots
                  ? slotEditor.slots.map((candidate, index) => (
                      <div key={`slot-${index}`} className="p-3">
                        {candidate ? (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <SportLineupPickRow
                                candidate={candidate}
                                status={status}
                                eventMetadata={eventMetadata}
                                onClick={() => openDetailModal(candidate)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => slotEditor.openSlot(index)}
                              disabled={slotActionsDisabled}
                              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-500 px-2 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-500 px-2 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                          status={status}
                          eventMetadata={eventMetadata}
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
              ) : (
                <SportPredictionField value={toGolfPrediction(serverPrediction)} readOnly />
              )}
            </TabPanel>

            {/* PARLAYS TAB */}
            <TabPanel className={PARLAYS_TAB_PANEL_CLASS}>
              <SideBetPanel
                borderColor={resolvedBorderColor}
                userLabel={sideBetUserLabel}
                lineupNumberLabel={sideBetLineupNumberLabel}
                playerLastNamesLine={sideBetPlayerLastNames}
                lineupId={lineupId}
              />
            </TabPanel>
          </div>
        </TabGroup>
      </div>

      {canEditSlots && eventId ? (
        <CandidatePicker
          sportId={sportId}
          eventId={eventId}
          isOpen={slotEditor.selectedSlotIndex !== null}
          onClose={slotEditor.closeSlot}
          onSelect={(eventParticipantId) => void slotEditor.handlePlayerSelect(eventParticipantId)}
          onClearSlot={() => void slotEditor.handlePlayerSelect(null)}
          selectedEventParticipantIds={slotEditor.selectedEventParticipantIds}
          isSaving={slotEditor.isSaving}
          saveError={slotEditor.saveError}
        />
      ) : null}

      <SportParticipantDetailModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        candidate={detailCandidate}
        sportId={sportId}
        status={status}
        eventMetadata={eventMetadata}
      />
    </div>
  );
};
