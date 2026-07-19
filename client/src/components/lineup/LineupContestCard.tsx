import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SportParticipantDetailModal } from "../platform/SportParticipantDetailModal";
import { PlusIcon, UserIcon } from "@heroicons/react/24/outline";
import { CandidatePicker } from "../platform/CandidatePicker";
import { SportLineupPickRow } from "../platform/SportLineupPickRow";
import type { Candidate } from "@cut/sport-sdk";
import type { ContestLineup, PickPopularityMap } from "../../types/lineup";
import type { EventStatus } from "../../types/event";
import type { ContestStatus } from "../../types/contest";
import {
  candidatesByEventParticipantIdMap,
  candidatesForLineupPicks,
  contestLineupDisplayName,
  lineupPicksFromContestLineup,
} from "../../lib/candidateUtils";
import { useCandidateSort } from "../../hooks/useCandidateSort";
import {
  lineupDisplayScore,
  lineupPopularityBonus,
  pickPopularityForParticipant,
} from "../../lib/lineupScore";
import {
  candidatesForPlatformLineup,
  platformLineupEventParticipantIds,
  platformLineupPrediction,
} from "../../lib/lineupUtils";
import { lineupsInSameContestScope } from "../../lib/lineupContestScope";
import { useLineupData } from "../../hooks/useLineupData";
import { useEventCandidatesQuery } from "../../hooks/useSportData";
import { useLineupSlotEditor } from "../../hooks/useLineupSlotEditor";
import { SportPredictionField } from "../platform/SportPredictionField";
import {
  defaultPredictionForLineupId,
  defaultPredictionMidpoint,
  predictionNumericValue,
  toLineupPredictionValue,
} from "../../lib/sportPrediction";
import { DUPLICATE_LINEUP_PREDICTION_MESSAGE } from "../../utils/lineupPrediction";
import { useSportRosterRules } from "../../hooks/useSportRosterRules";
import { useSportPredictionRules } from "../../hooks/useSportPredictionRules";

const DEFAULT_USER_COLOR = "#9CA3AF";

const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
};

interface LineupContestCardProps {
  lineup: ContestLineup;
  contestId: string;
  isEditable?: boolean;
  sportId: string;
  eventId: string;
  eventStatus: EventStatus;
  eventMetadata?: unknown;
  isEventEditable: boolean;
  /** Contest pick popularity (post-lock only). */
  pickPopularity?: PickPopularityMap | null;
  contestStatus?: ContestStatus;
}

const PLAYERS_TAB_PANEL_CLASS = "flow-root";

export const LineupContestCard: React.FC<LineupContestCardProps> = ({
  lineup,
  contestId,
  isEditable = false,
  sportId,
  eventId,
  eventStatus,
  eventMetadata,
  isEventEditable,
  pickPopularity = null,
  contestStatus,
}) => {
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
  const rosterRules = useSportRosterRules(sportId);
  const predictionRules = useSportPredictionRules(sportId);
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
        ? predictionNumericValue(platformLineup.prediction)
        : null;
    const value = fromListValue ?? fromLineup;
    if (value != null) return value;
    return lineupId
      ? defaultPredictionForLineupId(lineupId, predictionRules)
      : defaultPredictionMidpoint(predictionRules);
  }, [platformLineup, lineupId, lineups, predictionRules]);

  const [prediction, setPrediction] = useState(serverPrediction);

  useEffect(() => {
    setPrediction(serverPrediction);
    setSliderError(null);
  }, [lineupId, serverPrediction]);

  const slotEditor = useLineupSlotEditor({
    lineupId,
    contestId: platformLineup?.contestId ?? contestId,
    slotCount: rosterRules.slotCount,
    initialCandidates,
    fieldCandidates: candidates,
    lineups,
    predictionValue: prediction,
    updateLineup,
  });

  const savePrediction = useCallback(
    async (nextPrediction: number) => {
      if (!canEditSlots || !lineupId) return;

      const picks = slotEditor.selectedEventParticipantIds;
      const scopedLineups = lineupsInSameContestScope(
        lineups,
        platformLineup?.contestId ?? contestId,
        lineupId,
      );
      const duplicate = scopedLineups.some((entry) => {
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
        await updateLineup(lineupId, picks, { predictionValue: nextPrediction });
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
      contestId,
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

  const totalPoints = lineupDisplayScore(lineup);
  const popularityBonus = lineupPopularityBonus(lineup);
  const showPickPopularity = contestStatus != null && contestStatus !== "OPEN";

  const userSettings = lineup.user?.settings;
  const maybeUserColor =
    typeof userSettings === "object" && userSettings !== null
      ? (userSettings as { color?: unknown }).color
      : undefined;
  const userColorHex = typeof maybeUserColor === "string" ? maybeUserColor : undefined;
  const resolvedBorderColor = isValidHexColor(userColorHex) ? userColorHex : DEFAULT_USER_COLOR;

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
            <div>
              <div className="text-xl font-bold leading-none text-gray-900">{totalPoints}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
                PTS
              </div>
              {popularityBonus > 0 && lineup.baseScore != null ? (
                <div className="mt-1 text-[10px] font-medium tabular-nums text-gray-500">
                  {lineup.baseScore}
                  <span className="text-emerald-700"> +{popularityBonus}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="px-3 pb-3 pt-0">
        <div className={PLAYERS_TAB_PANEL_CLASS}>
          <div className="mb-4 mt-3 space-y-6">
            {canEditSlots
              ? slotEditor.slots.map((candidate, index) => (
                  <div key={`slot-${index}`} className="px-3">
                    {candidate ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <SportLineupPickRow
                            candidate={candidate}
                            status={status}
                            eventMetadata={eventMetadata}
                            onClick={() => openDetailModal(candidate)}
                            popularityBonus={
                              showPickPopularity
                                ? pickPopularityForParticipant(
                                    pickPopularity,
                                    candidate.eventParticipantId,
                                  )?.bonus
                                : null
                            }
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => slotEditor.openSlot(index)}
                          disabled={slotActionsDisabled}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-500 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Edit pick in slot ${index + 1}`}
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
                            No selection
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => slotEditor.openSlot(index)}
                          disabled={slotActionsDisabled}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-500 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Add pick to slot ${index + 1}`}
                        >
                          <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                ))
              : displayCandidates.map((candidate) => (
                  <div key={candidate.participantId} className="px-3">
                    <SportLineupPickRow
                      candidate={candidate}
                      status={status}
                      eventMetadata={eventMetadata}
                      onClick={() => openDetailModal(candidate)}
                      popularityBonus={
                        showPickPopularity
                          ? pickPopularityForParticipant(
                              pickPopularity,
                              candidate.eventParticipantId,
                            )?.bonus
                          : null
                      }
                    />
                  </div>
                ))}
          </div>
          {canEditSlots ? (
            <SportPredictionField
              value={toLineupPredictionValue(prediction)}
              onChange={(value) => {
                const next = predictionNumericValue(value);
                if (next != null) setPrediction(next);
              }}
              disabled={slotActionsDisabled}
              error={sliderError}
            />
          ) : (
            <SportPredictionField value={toLineupPredictionValue(serverPrediction)} readOnly />
          )}
        </div>
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
