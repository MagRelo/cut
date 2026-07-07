import React, { useEffect, useState } from "react";
import { type ContestStatus } from "../../../types/contest";
import { CountdownTimer } from "../../common/CountdownTimer";

interface ContestBeginCountdownProps {
  contestStatus: ContestStatus;
  eventName?: string | null;
  eventStartDate?: string | null;
}

function useIsBeforeDate(targetDate: string | null): boolean {
  const [isBefore, setIsBefore] = useState(() => {
    if (!targetDate) return false;
    const ms = new Date(targetDate).getTime();
    return !Number.isNaN(ms) && ms > Date.now();
  });

  useEffect(() => {
    if (!targetDate) {
      setIsBefore(false);
      return;
    }

    const check = () => {
      const ms = new Date(targetDate).getTime();
      setIsBefore(!Number.isNaN(ms) && ms > Date.now());
    };

    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return isBefore;
}

export const ContestBeginCountdown: React.FC<ContestBeginCountdownProps> = ({
  contestStatus,
  eventName,
  eventStartDate,
}) => {
  const isBeforeStart = useIsBeforeDate(eventStartDate ?? null);

  if (contestStatus !== "OPEN" || !eventStartDate || !isBeforeStart) {
    return null;
  }

  return (
    <div className="border border-gray-300 bg-slate-100 px-3 py-2 text-center font-display text-xs text-gray-700">
      <strong>{eventName ?? "Event"}</strong> begins in{" "}
      <strong className="tabular-nums">
        <CountdownTimer targetDate={eventStartDate} />
      </strong>
    </div>
  );
};
