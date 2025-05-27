import React, { useEffect, useState } from 'react';

interface CountdownTimerProps {
  targetDate: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
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

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <>
      {timeLeft.days > 0 && (
        <span className='font-medium'>{timeLeft.days}d </span>
      )}
      <span className='font-medium'>{timeLeft.hours}h </span>
      <span className='font-medium'>{timeLeft.minutes}m </span>
      <span className='font-medium'>{timeLeft.seconds}s</span>
    </>
  );
};
