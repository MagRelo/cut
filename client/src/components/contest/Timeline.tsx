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

const MUTED_LINE_COLOR = "rgba(209, 213, 219, 0.35)";

type RoundOrFinal = (typeof ROUND_BUTTONS)[number] | "final";

function forwardFilledScores(
  sortedTimestamps: string[],
  points: Array<{ timestamp: string; roundNumber?: number; score: number }>,
): (number | null)[] {
  const sorted = [...points].sort(
    (a, b) =>
      a.timestamp.localeCompare(b.timestamp) || (a.roundNumber ?? 0) - (b.roundNumber ?? 0),
  );
  let idx = 0;
  let last: number | null = null;
  return sortedTimestamps.map((t) => {
    while (idx < sorted.length && sorted[idx].timestamp <= t) {
      last = sorted[idx].score;
      idx++;
    }
    return last;
  });
}

interface TimelineProps {
  className?: string;
  timelineData: TimelineData;
  defaultMetric?: TimelineMetric;
  allowedMetrics?: TimelineMetric[];
}

export const Timeline: React.FC<TimelineProps> = ({ className = "", timelineData }) => {
  const contestFinished = timelineData.contestFinished === true;

  const [selectedRound, setSelectedRound] = useState<RoundOrFinal>(() =>
    contestFinished ? "final" : 4,
  );

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
    if (selectedRound === "final") return;
    if (availableRounds.size > 0 && !availableRounds.has(selectedRound)) {
      const latestAvailableRound = [...ROUND_BUTTONS]
        .reverse()
        .find((round) => availableRounds.has(round));
      if (latestAvailableRound) setSelectedRound(latestAvailableRound);
    }
  }, [availableRounds, selectedRound]);

  const finalHasData = useMemo(
    () =>
      topTeams.some((team) =>
        team.dataPoints.some(
          (dp) => typeof dp.roundNumber === "number" && dp.roundNumber >= 1 && dp.roundNumber <= 4,
        ),
      ),
    [topTeams],
  );

  const selectedRoundTimestamps = useMemo(() => {
    if (selectedRound === "final") {
      const ts = new Set<string>();
      for (const team of topTeams) {
        for (const dp of team.dataPoints) {
          const r = dp.roundNumber;
          if (typeof r === "number" && r >= 1 && r <= 4) ts.add(dp.timestamp);
        }
      }
      return [...ts].sort((a, b) => a.localeCompare(b));
    }
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

  const highlightPayoutWinners = useMemo(
    () => topTeams.some((t) => t.isPrimaryPayoutWinner === true),
    [topTeams],
  );

  const teamsForChart = useMemo(() => {
    if (selectedRound !== "final" || !highlightPayoutWinners) return topTeams;
    return [...topTeams].sort((a, b) => {
      const aw = a.isPrimaryPayoutWinner === true ? 1 : 0;
      const bw = b.isPrimaryPayoutWinner === true ? 1 : 0;
      return aw - bw;
    });
  }, [topTeams, selectedRound, highlightPayoutWinners]);

  const labels = useMemo(
    () => selectedRoundTimestamps.map((_timestamp, idx) => `${idx + 1}`),
    [selectedRoundTimestamps],
  );

  const chartData = useMemo(() => {
    const dimNonWinners =
      selectedRound === "final" && highlightPayoutWinners;

    if (selectedRound === "final") {
      return {
        labels,
        datasets: teamsForChart.map((team) => {
          const roundPoints = team.dataPoints.filter(
            (dp) =>
              typeof dp.roundNumber === "number" && dp.roundNumber >= 1 && dp.roundNumber <= 4,
          );
          const isWinner = team.isPrimaryPayoutWinner === true;
          const lineColor = dimNonWinners && !isWinner ? MUTED_LINE_COLOR : team.color;
          return {
            label: team.name,
            data: forwardFilledScores(selectedRoundTimestamps, roundPoints),
            borderColor: lineColor,
            backgroundColor: lineColor,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            spanGaps: true,
          };
        }),
      };
    }

    return {
      labels,
      datasets: teamsForChart.map((team) => {
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
  }, [
    labels,
    teamsForChart,
    selectedRoundTimestamps,
    selectedRound,
    highlightPayoutWinners,
  ]);

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
            {selectedRound === "final"
              ? "No timeline data available for the full tournament."
              : `No timeline data available for Round ${selectedRound}.`}
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
        {contestFinished ? (
          <button
            type="button"
            disabled={!finalHasData}
            tabIndex={finalHasData ? undefined : -1}
            aria-hidden={!finalHasData}
            onClick={() => setSelectedRound("final")}
            className={`flex-1 py-1.5 text-xs border-b ${
              selectedRound === "final"
                ? "text-blue-700 border-blue-600"
                : "text-gray-600 border-transparent"
            } ${finalHasData ? "" : "invisible pointer-events-none"}`}
            aria-pressed={selectedRound === "final"}
          >
            Final
          </button>
        ) : null}
      </div>
    </div>
  );
};
