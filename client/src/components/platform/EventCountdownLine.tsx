import { CountdownTimer } from "../common/CountdownTimer";
import { eventStartDateFromMetadata, eventStatusFromMetadata } from "../../lib/eventMetadata";

function isBeforeDate(targetDate: string): boolean {
  const ms = new Date(targetDate).getTime();
  return !Number.isNaN(ms) && ms > Date.now();
}

/** True when the event has not started yet and a countdown should replace period/status. */
export function shouldShowEventCountdown(metadata: unknown): boolean {
  const startDate = eventStartDateFromMetadata(metadata);
  if (!startDate || !isBeforeDate(startDate)) {
    return false;
  }
  const status = eventStatusFromMetadata(metadata);
  return status !== "LIVE" && status !== "COMPLETE";
}

export function EventCountdownLine({ metadata }: { metadata: unknown }) {
  const startDate = eventStartDateFromMetadata(metadata);
  if (!startDate || !shouldShowEventCountdown(metadata)) {
    return null;
  }

  return (
    <span>
      Begins in{" "}
      <strong className="ml-1 tabular-nums text-sky-200">
        <CountdownTimer targetDate={startDate} />
      </strong>
    </span>
  );
}
