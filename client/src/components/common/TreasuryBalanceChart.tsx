import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TreasuryBalanceChartProps {
  className?: string;
  data?: Array<{
    timestamp: string;
    balance: number;
  }>;
  title?: string;
}

export const TreasuryBalanceChart: React.FC<TreasuryBalanceChartProps> = ({
  className = "",
  data,
  // title = "Treasury Balance",
}) => {
  // Generate dummy data if no data provided
  const chartData = data || generateDummyData();

  const labels = chartData.map((point) => {
    const date = new Date(point.timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  });

  const balanceValues = chartData.map((point) => point.balance);

  const chartConfig = {
    labels,
    datasets: [
      {
        label: "Balance",
        data: balanceValues,
        borderColor: "#10b981", // emerald-500
        backgroundColor: "rgba(16, 185, 129, 0.1)", // light green background
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
        fill: true, // This creates the area under the line
        pointHoverRadius: 4,
        pointHoverBackgroundColor: "#10b981",
        pointHoverBorderColor: "#ffffff",
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#10b981",
        borderWidth: 1,
        callbacks: {
          label: function (context: { parsed: { y: number } }) {
            return `Balance: $${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "category" as const,
        display: true,
        title: {
          display: false,
        },
        grid: {
          display: false,
        },
        ticks: {
          display: true,
          font: {
            family: "Inter, system-ui, -apple-system, sans-serif",
            size: 10,
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
        },
      },
      y: {
        display: true,
        title: {
          display: false,
        },
        grid: {
          color: "#e5e7eb",
        },
        ticks: {
          font: {
            family: "Inter, system-ui, -apple-system, sans-serif",
            size: 10,
          },
          callback: function (tickValue: string | number) {
            const value = typeof tickValue === "number" ? tickValue : parseFloat(tickValue);
            return "$" + value.toLocaleString();
          },
        },
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
  };

  return (
    <div className={className}>
      {/* <div className="mb-2">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      </div> */}
      <div
        className="bg-white border border-gray-100 p-4 pb-3 treasury-chart"
        style={{ height: "200px" }}
      >
        <Line data={chartConfig} options={options} />
      </div>
    </div>
  );
};

// Generate dummy data showing an upward trend
function generateDummyData() {
  const data = [];
  const now = new Date();
  const baseBalance = 1000; // Starting balance
  const growthRate = 0.05; // 5% growth per day

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Create an upward trend with some variation
    const daysAgo = 30 - i;
    const balance = baseBalance * Math.pow(1 + growthRate, daysAgo) + Math.random() * 100 - 50; // Add some random variation

    data.push({
      timestamp: date.toISOString(),
      balance: Math.round(balance),
    });
  }

  return data;
}
