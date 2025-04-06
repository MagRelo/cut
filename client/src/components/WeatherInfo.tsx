import React from 'react';

interface WeatherInfoProps {
  temperature: string;
  conditions: string;
  windSpeed: string;
  location: string;
  timestamp: string;
}

export const WeatherInfo: React.FC<WeatherInfoProps> = ({
  temperature,
  conditions,
  windSpeed,
  location,
  timestamp,
}) => {
  return (
    <div className='text-center text-gray-600 mt-6 pb-4'>
      <div className='flex items-center justify-center gap-2 mb-1'>
        <span>{temperature}</span>
        <span>•</span>
        <span>{conditions}</span>
        <span>•</span>
        <span>{windSpeed}</span>
      </div>
      <div>{location}</div>
      <div className='text-sm text-gray-500'>{timestamp}</div>
    </div>
  );
};
