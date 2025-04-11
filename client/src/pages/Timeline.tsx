import React, { useEffect, useState } from 'react';
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

interface TimelineProps {
  className?: string;
  leagueId: string;
  tournamentId: string;
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
  };
}

export const Timeline: React.FC<TimelineProps> = ({
  className = '',
  leagueId,
  tournamentId,
}) => {
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Calculate time range (last 24 hours)
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

        const data = (await api.getLeagueTimeline(
          leagueId,
          tournamentId,
          startTime.toISOString(),
          endTime.toISOString()
        )) as TimelineData;

        setTimelineData(data);
      } catch {
        setError('Failed to load timeline data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimelineData();
    // Refresh data every 10 minutes
    const interval = setInterval(fetchTimelineData, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [leagueId, tournamentId]);

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

  const data = {
    labels:
      timelineData.teams[0]?.dataPoints.map((dp) =>
        new Date(dp.timestamp).toLocaleTimeString()
      ) || [],
    datasets: timelineData.teams.map((team) => ({
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
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        display: false, // Hide legend since we show team names in the list below
      },
      title: {
        display: false, // Hide title since we show tournament info above
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
        className='bg-white rounded-lg shadow-sm p-4'
        style={{ height: '200px' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};
