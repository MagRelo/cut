import React, { useMemo } from "react";
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

interface TimelineProps {
  className?: string;
  timelineData: TimelineData;
  /** Y-axis metric to plot */
  defaultMetric?: TimelineMetric;
  /** If set, defaultMetric must be one of these or it falls back to the first available metric */
  allowedMetrics?: TimelineMetric[];
}

function teamHasSharePrice(team: TimelineData["teams"][number]): boolean {
  return team.dataPoints.some((dp) => dp.sharePrice != null && Number.isFinite(dp.sharePrice));
}

export const Timeline: React.FC<TimelineProps> = ({
  className = "",
  timelineData,
  defaultMetric = "score",
  allowedMetrics,
}) => {
  const hasSharePriceData = useMemo(
    () => timelineData.teams.some(teamHasSharePrice),
    [timelineData.teams],
  );

  const selectableMetrics = useMemo((): TimelineMetric[] => {
    const base: TimelineMetric[] = ["score"];
    if (hasSharePriceData) base.push("sharePrice");
    if (!allowedMetrics?.length) return base;
    return base.filter((m) => allowedMetrics.includes(m));
  }, [hasSharePriceData, allowedMetrics]);

  const metric = useMemo((): TimelineMetric => {
    if (allowedMetrics?.length === 1 && allowedMetrics[0]) {
      return allowedMetrics[0];
    }
    if (selectableMetrics.includes(defaultMetric)) return defaultMetric;
    return selectableMetrics[0] ?? "score";
  }, [selectableMetrics, defaultMetric, allowedMetrics]);

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

  const { labels, allTimestampsSorted } = useMemo(() => {
    const seenRounds = new Set<string>();
    const labelList = [
      ...new Set(topTeams.flatMap((team) => team.dataPoints.map((dp) => dp.timestamp))),
    ]
      .sort()
      .map((timestamp) => {
        const dataPoint = topTeams
          .flatMap((team) => team.dataPoints)
          .find((dp) => dp.timestamp === timestamp);
        const roundLabel = dataPoint?.roundNumber ? `Round ${dataPoint.roundNumber}` : "";
        if (roundLabel && !seenRounds.has(roundLabel)) {
          seenRounds.add(roundLabel);
          return roundLabel;
        }
        return "";
      });
    const timestamps = [
      ...new Set(topTeams.flatMap((t) => t.dataPoints.map((dp) => dp.timestamp))),
    ].sort();
    return { labels: labelList, allTimestampsSorted: timestamps };
  }, [topTeams]);

  const chartData = useMemo(() => {
    if (metric === "score") {
      return {
        labels,
        datasets: topTeams.map((team) => {
          const scoreMap = new Map(team.dataPoints.map((dp) => [dp.timestamp, dp.score]));
          return {
            label: team.name,
            data: allTimestampsSorted.map((timestamp) => scoreMap.get(timestamp) ?? null),
            borderColor: team.color,
            backgroundColor: team.color,
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
      datasets: topTeams.map((team) => {
        const priceMap = new Map(
          team.dataPoints.map((dp) => [dp.timestamp, dp.sharePrice ?? null]),
        );
        return {
          label: team.name,
          data: allTimestampsSorted.map((timestamp) => {
            const v = priceMap.get(timestamp);
            return v != null && Number.isFinite(v) ? v : null;
          }),
          borderColor: team.color,
          backgroundColor: team.color,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          spanGaps: true,
        };
      }),
    };
  }, [metric, labels, topTeams, allTimestampsSorted]);

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
            display: true,
            font: {
              family: "'Outfit', sans-serif",
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
            text: metric === "score" ? "Score" : "Share price ($ / $1 winnings)",
          },
          grid: {
            color: "#e5e7eb",
          },
          ticks: {
            font: {
              family: "'Outfit', sans-serif",
              size: 9,
            },
            callback: (value: string | number) =>
              metric === "sharePrice" ? `$${Number(value).toFixed(2)}` : value,
          },
        },
      },
    }),
    [metric],
  );

  const emptySharePrice =
    metric === "sharePrice" &&
    !topTeams.some((team) =>
      team.dataPoints.some((dp) => dp.sharePrice != null && Number.isFinite(dp.sharePrice)),
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
      <div className="bg-white p-4 pb-3 timeline-chart" style={{ height: "250px" }}>
        {emptySharePrice ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-500 font-display">
            No share price history yet. It appears after timeline snapshots include market data.
          </div>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};
