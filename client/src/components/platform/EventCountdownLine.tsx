import { CountdownTimer } from "../common/CountdownTimer";
import type { EventStatus } from "../../types/event";
import {
  eventHeaderCountdownClassName,
  type EventHeaderTone,
} from "./eventHeaderTone";

function isBeforeDate(targetDate: string): boolean {
  const ms = new Date(targetDate).getTime();
  return !Number.isNaN(ms) && ms > Date.now();
}

/** True when the event has not started yet and a countdown should replace period/status. */
export function shouldShowEventCountdown(
  startDate: string | null,
  status: EventStatus,
): boolean {
  if (!startDate || !isBeforeDate(startDate)) {
    return false;
  }
  return status !== "LIVE" && status !== "COMPLETE";
}

export function EventCountdownLine({
  startDate,
  status,
  tone = "hero",
}: {
  startDate: string | null;
  status: EventStatus;
  tone?: EventHeaderTone;
}) {
  if (!startDate || !shouldShowEventCountdown(startDate, status)) {
    return null;
  }

  return (
    <span>
      Begins in{" "}
      <strong className={eventHeaderCountdownClassName(tone)}>
        <CountdownTimer targetDate={startDate} />
      </strong>
    </span>
  );
}
