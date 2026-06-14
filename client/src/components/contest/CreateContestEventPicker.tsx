import { useMemo } from "react";
import { useSportsQuery, useActiveEventQuery } from "../../hooks/useSportData";
import { golfEventToTournamentShell } from "../../lib/golfEventAdapter";
import { formatTournamentDateRange } from "../../lib/contestCreation";
import type { EventStatus } from "../../types/event";

export interface SelectedSportEvent {
  sportId: string;
  eventId: string;
  eventName: string;
  startDate: string;
  endDate: string;
  status: EventStatus | null;
  isEditable: boolean;
}

interface CreateContestEventPickerProps {
  sportId: string;
  onSportIdChange: (sportId: string) => void;
  disabled?: boolean;
}

export function useSelectedSportEvent(sportId: string): {
  selection: SelectedSportEvent | null;
  isLoading: boolean;
  sports: { id: string; name: string }[];
} {
  const { data: sports = [], isLoading: sportsLoading } = useSportsQuery();
  const { data: active, isLoading: eventLoading } = useActiveEventQuery(sportId);

  const selection = useMemo((): SelectedSportEvent | null => {
    if (!active?.event) return null;
    const shell = golfEventToTournamentShell(active);
    const isEditable = active.status !== "LIVE" && active.status !== "COMPLETE";
    return {
      sportId,
      eventId: active.event.id,
      eventName: shell.name,
      startDate: shell.startDate,
      endDate: shell.endDate,
      status: active.status,
      isEditable,
    };
  }, [active, sportId]);

  return {
    selection,
    isLoading: sportsLoading || eventLoading,
    sports: sports.map((sport) => ({ id: sport.id, name: sport.name })),
  };
}

export const CreateContestEventPicker = ({
  sportId,
  onSportIdChange,
  disabled = false,
}: CreateContestEventPickerProps) => {
  const { selection, isLoading, sports } = useSelectedSportEvent(sportId);
  const showSportPicker = sports.length > 1;

  return (
    <div className="rounded-sm border border-blue-200 bg-blue-50 px-4 py-3 shadow-inner ring-1 ring-inset ring-blue-100">
      {showSportPicker ? (
        <label className="mb-3 block font-display text-sm">
          <span className="mb-1 block font-medium text-blue-950">Sport</span>
          <select
            value={sportId}
            onChange={(event) => onSportIdChange(event.target.value)}
            disabled={disabled}
            className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
          >
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {isLoading ? (
        <p className="font-display text-sm text-blue-800/80">Loading active event…</p>
      ) : !selection ? (
        <p className="font-display text-sm text-blue-800/80">
          No active event is available for this sport.
        </p>
      ) : (
        <dl className="space-y-1 font-display text-sm">
          <div>
            <dt className="sr-only">Event name</dt>
            <dd className="font-semibold text-blue-950">{selection.eventName}</dd>
          </div>
          <div>
            <dt className="sr-only">Event dates</dt>
            <dd className="text-blue-800/75">
              {formatTournamentDateRange(selection.startDate, selection.endDate)}
            </dd>
          </div>
          {!selection.isEditable ? (
            <div>
              <dd className="text-amber-800/90">
                This event has started or finished — new contests cannot be created.
              </dd>
            </div>
          ) : null}
        </dl>
      )}
    </div>
  );
};
