import React from "react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { type ContestStatus } from "../../../types/contest";
import { cn } from "../../../lib/tabStyles";
import { getPeriodRulesForSport } from "../../../lib/periodRules";
import {
  derivePeriodProgress,
  type PeriodProgressChip,
  type PeriodProgressState,
} from "../../../lib/contestPeriodProgress";
import { CountdownTimer } from "../../common/CountdownTimer";

interface ContestStatusBarProps {
  contestStatus: ContestStatus;
  eventName?: string | null;
  eventStartDate?: string | null;
  sportId?: string | null;
  currentPeriod?: number | null;
  periodDisplay?: string | null;
  periodStatusDisplay?: string | null;
}

const STATUS_BAR_BASE_CLASSNAME =
  "border bg-gradient-to-b px-3 py-2 text-center font-display text-xs font-medium text-gray-700";

const SETTLED_SURFACE_CLASSNAME = "border-slate-300 from-slate-100 via-gray-100/90 to-slate-200/50";

function statusBarSurfaceClassName(contestStatus: ContestStatus): string {
  switch (contestStatus) {
    case "OPEN":
    case "ACTIVE":
    case "LOCKED":
    case "SETTLED":
    case "CLOSED":
      return SETTLED_SURFACE_CLASSNAME;
    case "CANCELLED":
      return "border-rose-100 from-rose-50 via-red-50/90 to-rose-100/30";
    default:
      return SETTLED_SURFACE_CLASSNAME;
  }
}

function isBeforeDate(targetDate: string | null | undefined): boolean {
  if (!targetDate) return false;
  const ms = new Date(targetDate).getTime();
  return !Number.isNaN(ms) && ms > Date.now();
}

function PeriodStateIcon({ state }: { state: PeriodProgressState }) {
  switch (state) {
    case "complete":
      return <CheckIcon className="ml-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />;
    case "active":
      return <span className="ml-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-600" aria-hidden />;
    case "upcoming":
      return (
        <span
          className="ml-1.5 box-border h-2 w-2 shrink-0 rounded-full border border-gray-400"
          aria-hidden
        />
      );
  }
}

function PeriodProgressContent({ chips }: { chips: PeriodProgressChip[] }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
      <span
        className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1"
        role="list"
      >
        {chips.map((chip) => (
          <span
            key={chip.label}
            role="listitem"
            className="inline-flex items-center gap-0.5 tabular-nums"
          >
            <span className={chip.state === "active" ? "text-gray-700" : "text-gray-400"}>
              {chip.label}
            </span>
            <PeriodStateIcon state={chip.state} />
          </span>
        ))}
      </span>
    </span>
  );
}

function statusBarContent(
  contestStatus: ContestStatus,
  eventName: string | null | undefined,
  eventStartDate: string | null | undefined,
  isBeforeStart: boolean,
): React.ReactNode {
  switch (contestStatus) {
    case "SETTLED":
    case "CLOSED":
      return (
        <span className="inline-flex items-center justify-center gap-1">
          Complete • Bets Settled
          <CheckIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
        </span>
      );
    case "CANCELLED":
      return "Contest Cancelled";
    case "OPEN":
      if (eventStartDate && isBeforeStart) {
        return (
          <>
            <strong>{eventName ?? "Event"}</strong> begins in{" "}
            <strong className="tabular-nums">
              <CountdownTimer targetDate={eventStartDate} />
            </strong>
          </>
        );
      }
      return "Contest Open - Join Now";
    default:
      return null;
  }
}

export const ContestStatusBar: React.FC<ContestStatusBarProps> = ({
  contestStatus,
  eventName,
  eventStartDate,
  sportId,
  currentPeriod,
  periodDisplay,
  periodStatusDisplay,
}) => {
  const isLiveContest = contestStatus === "ACTIVE" || contestStatus === "LOCKED";
  const periodChips = isLiveContest
    ? derivePeriodProgress(
        getPeriodRulesForSport(sportId ?? undefined),
        currentPeriod,
        periodStatusDisplay,
        periodDisplay,
      )
    : [];

  if (isLiveContest) {
    if (periodChips.length === 0) {
      return <div className="border-t border-slate-200" aria-hidden />;
    }
    return (
      <div className={cn(STATUS_BAR_BASE_CLASSNAME, statusBarSurfaceClassName(contestStatus))}>
        <PeriodProgressContent chips={periodChips} />
      </div>
    );
  }

  const isBeforeStart = isBeforeDate(eventStartDate);
  const content = statusBarContent(contestStatus, eventName, eventStartDate, isBeforeStart);

  if (!content) {
    return null;
  }

  return (
    <div className={cn(STATUS_BAR_BASE_CLASSNAME, statusBarSurfaceClassName(contestStatus))}>
      {content}
    </div>
  );
};
