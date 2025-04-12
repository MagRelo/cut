import React, { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { api } from '../services/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Define available colors
const TEAM_COLORS = [
  '#0a73eb',
  '#A3A3A3',
  '#FF48BF',
  '#F58300',
  '#00ABB8',
  '#FFD60A',
  '#E00000',
  '#4700E0',
  '#9600CC',
  '#00B86B',
];

// Function to get a random color from the list
const getRandomColor = (usedColors: Set<string>): string => {
  const availableColors = TEAM_COLORS.filter((color) => !usedColors.has(color));
  if (availableColors.length === 0) {
    // If all colors are used, start over
    return TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)];
  }
  return availableColors[Math.floor(Math.random() * availableColors.length)];
};

interface TimelineProps {
  className?: string;
  leagueId: string;
  tournamentId: string;
  tournamentStartDate: string;
}

interface TimelineData {
  teams: {
    id: string;
    name: string;
    color: string;
    dataPoints: {
      timestamp: string;
      score: number;
      roundNumber?: number;
    }[];
  }[];
  tournament: {
    id: string;
    name: string;
    currentRound: number;
    status: string;
    startDate: string;
  };
}

export const Timeline: React.FC<TimelineProps> = ({
  className = '',
  leagueId,
  tournamentId,
  tournamentStartDate,
}) => {
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchTimelineData = async (retryCount = 0) => {
      // Clean up any existing abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        setIsLoading(true);
        setError(null);

        const endTime = new Date();

        // Add timeout to the API call
        const data = (await Promise.race([
          api.getLeagueTimeline(
            leagueId,
            tournamentId,
            tournamentStartDate,
            endTime.toISOString()
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 10000)
          ),
        ])) as TimelineData;

        // Only assign random colors to teams that don't have one
        const usedColors = new Set<string>();
        data.teams = data.teams.map((team) => {
          if (team.color) {
            usedColors.add(team.color);
            return team;
          }
          const color = getRandomColor(usedColors);
          usedColors.add(color);
          return { ...team, color };
        });

        setTimelineData(data);
        setError(null);
      } catch (err: unknown) {
        // Don't set error if request was aborted
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        console.error('Timeline fetch error:', err);
        setError('Failed to load timeline data');

        // Implement retry logic with exponential backoff
        if (retryCount < 3) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          retryTimeoutRef.current = setTimeout(
            () => fetchTimelineData(retryCount + 1),
            retryDelay
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimelineData();

    // Set up refresh interval
    const intervalId = setInterval(() => fetchTimelineData(), 10 * 60 * 1000);

    // Cleanup function
    return () => {
      clearInterval(intervalId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [leagueId, tournamentId, tournamentStartDate]);

  if (isLoading) {
    return (
      <div className={className}>
        <div
          className='bg-white rounded-lg shadow-sm p-4 flex items-center justify-center'
          style={{ height: '200px' }}>
          <div className='text-gray-500'>Loading timeline data...</div>
        </div>
      </div>
    );
  }

  if (error || !timelineData) {
    return (
      <div className={className}>
        <div
          className='bg-white rounded-lg shadow-sm p-4 flex items-center justify-center'
          style={{ height: '200px' }}>
          <div className='text-red-500'>
            {error || 'Failed to load timeline data'}
          </div>
        </div>
      </div>
    );
  }

  // Sort teams by their latest score (last data point) and take top 10
  const topTeams = [...timelineData.teams]
    .sort((a, b) => {
      const aScore = a.dataPoints[a.dataPoints.length - 1]?.score || 0;
      const bScore = b.dataPoints[b.dataPoints.length - 1]?.score || 0;
      return bScore - aScore;
    })
    .slice(0, 10);

  const data = {
    labels:
      timelineData.teams[0]?.dataPoints.map((dp) =>
        new Date(dp.timestamp).toLocaleString('en-US', {
          weekday: 'short',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
        })
      ) || [],
    datasets: topTeams.map((team) => ({
      label: team.name,
      data: team.dataPoints.map((dp) => dp.score),
      borderColor: team.color,
      backgroundColor: team.color,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.4,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    events: [], // This disables all interactions
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
        },
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Score',
        },
        grid: {
          color: '#e5e7eb',
        },
      },
    },
  };

  return (
    <div className={className}>
      <div
        className='bg-white rounded-lg shadow-sm p-4 timeline-chart'
        style={{ height: '250px' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};
