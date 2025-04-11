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

        // Assign random colors to teams
        const usedColors = new Set<string>();
        data.teams = data.teams.map((team) => {
          const color = getRandomColor(usedColors);
          usedColors.add(color);
          return { ...team, color };
        });

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
        new Date(dp.timestamp).toLocaleTimeString()
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
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        display: true,
        labels: {
          usePointStyle: true,
          boxWidth: 3,
          padding: 15,
          font: {
            size: 11,
          },
          // @ts-expect-error - Ignoring type errors for now to achieve desired spacing
          generateLabels: function (chart) {
            const datasets = chart.data.datasets;
            // @ts-expect-error - Ignoring type errors for now to achieve desired spacing
            return datasets.map((dataset, i) => ({
              text: '  ' + dataset.label + '  ', // Two spaces before and after
              fillStyle: dataset.backgroundColor,
              strokeStyle: dataset.borderColor,
              lineWidth: 0,
              pointStyle: 'circle',
              hidden: !chart.isDatasetVisible(i),
              index: i,
            }));
          },
        },
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
