import React from 'react';
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
import type { TimelineData } from '../services/leagueApi';

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
  timelineData: TimelineData;
}

export const Timeline: React.FC<TimelineProps> = ({
  className = '',
  timelineData,
}) => {
  if (!timelineData) {
    return (
      <div className={className}>
        <div
          className='bg-white rounded-lg shadow-sm p-4 flex items-center justify-center'
          style={{ height: '200px' }}>
          <div className='text-red-500'>No timeline data provided</div>
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

  // Generate labels: only the first occurrence of each round gets a label
  const seenRounds = new Set<string>();
  const labels = [
    ...new Set(
      topTeams.flatMap((team) => team.dataPoints.map((dp) => dp.timestamp))
    ),
  ]
    .sort()
    .map((timestamp) => {
      const dataPoint = topTeams
        .flatMap((team) => team.dataPoints)
        .find((dp) => dp.timestamp === timestamp);
      const roundLabel = dataPoint?.roundNumber
        ? `Round ${dataPoint.roundNumber}`
        : '';
      if (roundLabel && !seenRounds.has(roundLabel)) {
        seenRounds.add(roundLabel);
        return roundLabel;
      }
      return '';
    });

  const data = {
    labels,
    datasets: topTeams.map((team) => {
      // Create a map of timestamps to scores for this team
      const scoreMap = new Map(
        team.dataPoints.map((dp) => [dp.timestamp, dp.score])
      );

      // Get all unique timestamps
      const allTimestamps = [
        ...new Set(
          topTeams.flatMap((t) => t.dataPoints.map((dp) => dp.timestamp))
        ),
      ].sort();

      return {
        label: team.name,
        data: allTimestamps.map((timestamp) => scoreMap.get(timestamp) || null),
        borderColor: team.color,
        backgroundColor: team.color,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
        spanGaps: true, // This will connect lines across null values
      };
    }),
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
        type: 'category' as const,
        display: true,
        title: {
          display: false,
          text: 'Round',
        },
        grid: {
          display: false,
        },
        ticks: {
          display: true,
          font: {
            family: 'Inter, system-ui, -apple-system, sans-serif',
            size: 9,
          },
          maxRotation: 0,
          autoSkip: false,
          maxTicksLimit: 10,
        },
      },
      y: {
        display: true,
        title: {
          display: false,
          text: 'Score',
        },
        grid: {
          color: '#e5e7eb',
        },
        ticks: {
          font: {
            family: 'Inter, system-ui, -apple-system, sans-serif',
            size: 9,
          },
        },
      },
    },
  };

  return (
    <div className={className}>
      <div
        className='bg-white border border-gray-100 p-4 pb-3 timeline-chart'
        style={{ height: '250px' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};
