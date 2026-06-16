import React from "react";
import { type Contest } from "../../../types/contest";
import { type PrimaryTabMode } from "../../../types/contestLobby";
import { CountdownTimer } from "../../common/CountdownTimer";
import { ContestEntryList } from "../ContestEntryList";
import { ContestTimelinesSection } from "./ContestTimelinesSection";
import { ContestLobbyTabHero } from "./ContestLobbyTabHero";

export interface ContestPrimaryTabProps {
  contest: Contest;
  mode: PrimaryTabMode;
  showCountdown: boolean;
  entryListOpensModal: boolean;
  eventName?: string | null;
  eventStartDate?: string | Date | null;
  currentUserId?: string;
  onEnterContest: () => void;
}

export const ContestPrimaryTab: React.FC<ContestPrimaryTabProps> = ({
  contest,
  mode,
  showCountdown,
  entryListOpensModal,
  eventName,
  eventStartDate,
  currentUserId,
  onEnterContest,
}) => {
  return (
    <div className="space-y-4">
      {mode === "liveTimeline" ? (
        <ContestTimelinesSection timelineData={contest.timeline} currentUserId={currentUserId} />
      ) : (
        <ContestLobbyTabHero showBottomBorder>
          <div className="flex w-full max-w-sm flex-col items-center justify-center gap-4">
            <button
              type="button"
              onClick={onEnterContest}
              className="w-full rounded-lg border border-blue-500 bg-blue-500 px-6 py-3 font-display text-base font-semibold text-white transition-colors hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enter Contest{" — "}
              <span>
                {contest.settings?.primaryDeposit === 0
                  ? "Free"
                  : `$${contest.settings?.primaryDeposit ?? 0}`}
              </span>
            </button>

            {showCountdown && eventStartDate ? (
              <p className="text-center text-xs text-gray-800">
                <span>
                  <strong>{eventName ?? "Event"}</strong> starts in
                </span>
                <br />
                <strong>
                  <span className="inline-block min-w-[120px] whitespace-nowrap pt-1 tabular-nums">
                    <CountdownTimer
                      targetDate={
                        typeof eventStartDate === "string"
                          ? eventStartDate
                          : eventStartDate.toISOString()
                      }
                    />
                  </span>
                </strong>
              </p>
            ) : null}
          </div>
        </ContestLobbyTabHero>
      )}

      <ContestEntryList
        contestLineups={contest.contestLineups}
        contestStatus={contest.status}
        entryListOpensModal={entryListOpensModal}
      />
    </div>
  );
};
