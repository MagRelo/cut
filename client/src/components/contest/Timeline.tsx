import React, { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { TimelineData, TimelineMetric } from "../../types/contest";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
const ROUND_BUTTONS = [1, 2, 3, 4] as const;

interface TimelineProps {
  className?: string;
  timelineData: TimelineData;
  /** Y-axis metric to plot */
  defaultMetric?: TimelineMetric;
  /** If set, defaultMetric must be one of these or it falls back to the first available metric */
  allowedMetrics?: TimelineMetric[];
}

export const Timeline: React.FC<TimelineProps> = ({ className = "", timelineData }) => {
  const [selectedRound, setSelectedRound] = useState(4);

  const topTeams = useMemo(() => {
    if (!timelineData.teams.length) return [];
    return [...timelineData.teams]
      .sort((a, b) => {
        const aScore = a.dataPoints[a.dataPoints.length - 1]?.score || 0;
        const bScore = b.dataPoints[b.dataPoints.length - 1]?.score || 0;
        return bScore - aScore;
      })
      .slice(0, 10);
  }, [timelineData.teams]);

  const availableRounds = useMemo(() => {
    return new Set(
      topTeams.flatMap((team) =>
        team.dataPoints
          .map((dp) => dp.roundNumber)
          .filter(
            (round): round is number => typeof round === "number" && round >= 1 && round <= 4,
          ),
      ),
    );
  }, [topTeams]);

  useEffect(() => {
    if (availableRounds.size > 0 && !availableRounds.has(selectedRound)) {
      const latestAvailableRound = [...ROUND_BUTTONS]
        .reverse()
        .find((round) => availableRounds.has(round));
      if (latestAvailableRound) setSelectedRound(latestAvailableRound);
    }
  }, [availableRounds, selectedRound]);

  const selectedRoundTimestamps = useMemo(() => {
    return [
      ...new Set(
        topTeams.flatMap((team) =>
          team.dataPoints
            .filter((dp) => dp.roundNumber === selectedRound)
            .map((dp) => dp.timestamp),
        ),
      ),
    ].sort();
  }, [topTeams, selectedRound]);

  const labels = useMemo(
    () => selectedRoundTimestamps.map((_timestamp, idx) => `${idx + 1}`),
    [selectedRoundTimestamps],
  );

  const chartData = useMemo(() => {
    return {
      labels,
      datasets: topTeams.map((team) => {
        const scoreMap = new Map(
          team.dataPoints
            .filter((dp) => dp.roundNumber === selectedRound)
            .map((dp) => [dp.timestamp, dp.score]),
        );
        return {
          label: team.name,
          data: selectedRoundTimestamps.map((timestamp) => scoreMap.get(timestamp) ?? null),
          borderColor: team.color,
          backgroundColor: team.color,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          spanGaps: true,
        };
      }),
    };
  }, [labels, topTeams, selectedRoundTimestamps, selectedRound]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      events: [],
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
          type: "category" as const,
          display: true,
          title: {
            display: false,
            text: "Round",
          },
          grid: {
            display: false,
          },
          ticks: {
            display: false,
            font: {
              family: "'Outfit', sans-serif",
              size: 9,
            },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10,
          },
        },
        y: {
          display: true,
          title: {
            display: false,
            text: "Score",
          },
          grid: {
            color: "#e5e7eb",
          },
          ticks: {
            font: {
              family: "'Outfit', sans-serif",
              size: 9,
            },
            callback: (value: string | number) => value,
          },
        },
      },
    }),
    [],
  );

  if (!timelineData.teams.length) {
    return (
      <div className={`font-display ${className}`.trim()}>
        <div
          className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-center"
          style={{ height: "200px" }}
        >
          <div className="text-red-500">No timeline data provided</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`font-display ${className}`.trim()}>
      <div className="bg-white p-2 pb-1 timeline-chart" style={{ height: "250px" }}>
        {selectedRoundTimestamps.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-500 font-display">
            No timeline data available for Round {selectedRound}.
          </div>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
      <div className="bg-white px-4 pb-4 flex gap-2">
        {ROUND_BUTTONS.map((round) => {
          const isActive = selectedRound === round;
          const hasData = availableRounds.has(round);
          return (
            <button
              key={round}
              type="button"
              disabled={!hasData}
              tabIndex={hasData ? undefined : -1}
              aria-hidden={!hasData}
              onClick={() => setSelectedRound(round)}
              className={`flex-1 py-1.5 text-xs border-b ${
                isActive ? "text-blue-700 border-blue-600" : "text-gray-600 border-transparent"
              } ${hasData ? "" : "invisible pointer-events-none"}`}
              aria-pressed={isActive}
            >
              Round {round}
            </button>
          );
        })}
      </div>
    </div>
  );
};
