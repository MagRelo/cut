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
import { subHours, format } from 'date-fns';

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

// Generate sample data for the last 4 hours with 10-minute intervals
const generateTimePoints = () => {
  const points = [];
  for (let i = 24; i >= 0; i--) {
    points.push(format(subHours(new Date(), i), 'R1'));
  }
  return points;
};

// Sample data for each team
const generateTeamData = (baseValue: number, volatility: number) => {
  return Array.from({ length: 25 }, (_, i) => {
    const progress = i / 24; // Progress through the timeline
    const randomFactor = (Math.random() - 0.5) * volatility;
    return baseValue * (1 + progress) + randomFactor;
  });
};

const teams = [
  { name: 'BONEHAMMERS', color: '#3b82f6', baseValue: 14, volatility: 5 },
  { name: 'DOOGDIGGLER', color: '#22c55e', baseValue: 2, volatility: 3 },
  { name: 'MYERS', color: '#ef4444', baseValue: 9, volatility: 4 },
  { name: 'NEELY', color: '#ec4899', baseValue: 17, volatility: 6 },
  { name: 'NOODLES', color: '#94a3b8', baseValue: 0, volatility: 2 },
  { name: 'ORANGE SNAKES', color: '#f97316', baseValue: 0, volatility: 2 },
  { name: 'BUMBLE BEE', color: '#eab308', baseValue: 13, volatility: 4 },
  { name: 'DUCK HOOKERS', color: '#06b6d4', baseValue: 0, volatility: 2 },
  { name: 'BIRDS OF PREY', color: '#8b5cf6', baseValue: 5, volatility: 3 },
  { name: 'JIMMY', color: '#6366f1', baseValue: -5, volatility: 4 },
];

export const Timeline: React.FC = () => {
  const timeLabels = generateTimePoints();

  const data = {
    labels: timeLabels,
    datasets: teams.map((team) => ({
      label: team.name,
      data: generateTeamData(team.baseValue, team.volatility),
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
      },
      title: {
        display: true,
        text: 'Team Scores',
        color: '#6b7280',
        font: {
          size: 16,
          weight: 500,
        },
        padding: {
          bottom: 30,
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Round',
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
    <div className='py-6'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-blue-900'>
          Texas Children's Houston Open
        </h1>
        <div className='text-gray-600'>Memorial Park Golf Course</div>
        <div className='text-sm text-gray-500'>R1 - In Progress</div>
      </div>

      <div
        className='bg-white rounded-lg shadow-sm p-4'
        style={{ height: '600px' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};
