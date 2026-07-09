import React from "react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { type ContestStatus } from "../../../types/contest";
import { cn } from "../../../lib/tabStyles";
import { CountdownTimer } from "../../common/CountdownTimer";

interface ContestStatusBarProps {
  contestStatus: ContestStatus;
  eventName?: string | null;
  eventStartDate?: string | null;
}

const STATUS_BAR_BASE_CLASSNAME =
  "border bg-gradient-to-b px-3 py-2 text-center font-display text-xs font-medium text-gray-700";

const SETTLED_SURFACE_CLASSNAME =
  "border-slate-300 from-slate-100 via-gray-100/90 to-slate-200/50";

function statusBarSurfaceClassName(contestStatus: ContestStatus): string {
  switch (contestStatus) {
    case "OPEN":
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
}) => {
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
