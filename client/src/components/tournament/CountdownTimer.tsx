import React, { useEffect, useState } from "react";

interface CountdownTimerProps {
  targetDate: string;
}

const calculateTimeLeft = (targetDate: string) => {
  const difference = new Date(targetDate).getTime() - new Date().getTime();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
};

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <>
      {timeLeft.days > 0 && <span className="font-base">{timeLeft.days}d </span>}
      <span className="font-base">{timeLeft.hours}h </span>
      <span className="font-base">{timeLeft.minutes}m </span>
      <span className="font-base">{timeLeft.seconds}s</span>
    </>
  );
};
