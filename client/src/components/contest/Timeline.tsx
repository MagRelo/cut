import React, { useCallback, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type Plugin,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  formatPeriodLabel,
  isTimelinePeriod,
  periodRulesHasDividers,
  type PeriodRules,
} from "@cut/sport-sdk";
import type { TimelineData, TimelineMetric } from "../../types/contest";
import { cn } from "../../lib/tabStyles";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const OTHER_TEAM_LINE_OPACITY = 0.6;
/** Shared color for y-axis ticks and period divider labels. */
const TIMELINE_AXIS_LABEL_COLOR = "#4B5563";
/** Lower `order` draws on top in Chart.js (see mixed chart drawing-order docs). */
const USER_LINE_ORDER = 0;
const PAYOUT_WINNER_LINE_ORDER = 5;
const OTHER_LINE_ORDER = 10;

type TimelineTeam = TimelineData["teams"][number];

function isCurrentUserTeam(team: TimelineTeam, currentUserId: string | undefined): boolean {
  return Boolean(currentUserId && team.userId && team.userId === currentUserId);
}

function colorWithOpacity(color: string, opacity: number): string {
  const c = color.trim();
  const shortMatch = c.match(/^#([0-9a-fA-F]{3})$/);
  if (shortMatch) {
    const [r, g, b] = shortMatch[1].split("").map((ch) => parseInt(ch + ch, 16));
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  const longMatch = c.match(/^#([0-9a-fA-F]{6})$/);
  if (longMatch) {
    const hex = longMatch[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  const rgbMatch = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(c);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
  }
  return c;
}

function sortWinnersLast(teams: TimelineTeam[]): TimelineTeam[] {
  return [...teams].sort((a, b) => {
    const aw = a.isPrimaryPayoutWinner === true ? 1 : 0;
    const bw = b.isPrimaryPayoutWinner === true ? 1 : 0;
    return aw - bw;
  });
}

function chartOrderForTeam(
  team: TimelineTeam,
  currentUserId: string | undefined,
  highlightPayoutWinners: boolean,
): number {
  if (isCurrentUserTeam(team, currentUserId)) return USER_LINE_ORDER;
  if (highlightPayoutWinners && team.isPrimaryPayoutWinner === true) {
    return PAYOUT_WINNER_LINE_ORDER;
  }
  return OTHER_LINE_ORDER;
}

function orderTeamsForChart(
  teams: TimelineTeam[],
  currentUserId: string | undefined,
  highlightPayoutWinners: boolean,
): TimelineTeam[] {
  const others = teams.filter((team) => !isCurrentUserTeam(team, currentUserId));
  const mine = teams.filter((team) => isCurrentUserTeam(team, currentUserId));
  if (!highlightPayoutWinners) {
    return [...mine, ...others];
  }
  return [...sortWinnersLast(mine), ...sortWinnersLast(others)];
}

interface PeriodSegment {
  periodNumber: number;
  startIndex: number;
  count: number;
}

interface PeriodDividerLabel {
  index: number;
  text: string;
}

function dataPointPeriod(dataPoint: { periodNumber?: number }): number | undefined {
  return dataPoint.periodNumber;
}

function buildPeriodByTimestamp(
  topTeams: TimelineTeam[],
  periodRules: PeriodRules | null | undefined,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const team of topTeams) {
    for (const dp of team.dataPoints) {
      const periodNumber = dataPointPeriod(dp);
      if (isTimelinePeriod(periodRules, periodNumber)) {
        map.set(dp.timestamp, periodNumber);
      }
    }
  }
  return map;
}

function buildPeriodSegments(
  chartTimestamps: string[],
  periodByTimestamp: Map<string, number>,
): PeriodSegment[] {
  const segments: PeriodSegment[] = [];
  for (let i = 0; i < chartTimestamps.length; i++) {
    const periodNumber = periodByTimestamp.get(chartTimestamps[i]);
    if (periodNumber === undefined) continue;
    const last = segments[segments.length - 1];
    if (last?.periodNumber === periodNumber) {
      last.count += 1;
    } else {
      segments.push({ periodNumber, startIndex: i, count: 1 });
    }
  }
  return segments;
}

const TIMELINE_CHART_PLUGIN_ID = "timelineChartDecorations";

const timelineChartPlugin: Plugin<"line"> = {
  id: TIMELINE_CHART_PLUGIN_ID,
  afterDraw(chart) {
    const plugins = chart.options.plugins as
      | Record<string, { labels?: PeriodDividerLabel[] }>
      | undefined;
    const labels = plugins?.[TIMELINE_CHART_PLUGIN_ID]?.labels ?? [];
    if (!labels.length) return;

    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x;
    if (!chartArea || !xScale) return;

    ctx.save();
    for (const { index, text } of labels) {
      const x = xScale.getPixelForValue(index);
      if (index > 0) {
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.strokeStyle = "rgba(107, 114, 128, 0.35)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = TIMELINE_AXIS_LABEL_COLOR;
      ctx.font = "9px 'Outfit', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(text, x + 6, chartArea.bottom - 4);
    }
    ctx.restore();
  },
};

function forwardFilledScores(
  sortedTimestamps: string[],
  points: Array<{ timestamp: string; periodNumber?: number; score: number }>,
): (number | null)[] {
  const sorted = [...points].sort(
    (a, b) =>
      a.timestamp.localeCompare(b.timestamp) ||
      (dataPointPeriod(a) ?? 0) - (dataPointPeriod(b) ?? 0),
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
  currentUserId?: string;
  defaultMetric?: TimelineMetric;
  allowedMetrics?: TimelineMetric[];
  /** Fill parent height (e.g. inside {@link ContestLobbyTabHero}). */
  fitContainer?: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({
  className = "",
  timelineData,
  currentUserId,
  fitContainer = false,
}) => {
  const periodRules = timelineData.periods ?? null;
  const showPeriodDividers = periodRulesHasDividers(periodRules);
  const timelineTitle = periodRules?.timelineTitle ?? "Event Timeline";

  const topTeams = useMemo(() => {
    if (!timelineData.teams.length) return [];
    return [...timelineData.teams].sort((a, b) => {
      const aScore = a.dataPoints[a.dataPoints.length - 1]?.score || 0;
      const bScore = b.dataPoints[b.dataPoints.length - 1]?.score || 0;
      return bScore - aScore;
    });
  }, [timelineData.teams]);

  const chartTimestamps = useMemo(() => {
    const ts = new Set<string>();
    for (const team of topTeams) {
      for (const dp of team.dataPoints) {
        const periodNumber = dataPointPeriod(dp);
        if (isTimelinePeriod(periodRules, periodNumber)) {
          ts.add(dp.timestamp);
        }
      }
    }
    return [...ts].sort((a, b) => a.localeCompare(b));
  }, [topTeams, periodRules]);

  const periodByTimestamp = useMemo(
    () => buildPeriodByTimestamp(topTeams, periodRules),
    [topTeams, periodRules],
  );

  const periodDividerLabels = useMemo(() => {
    if (!showPeriodDividers) return [];
    return buildPeriodSegments(chartTimestamps, periodByTimestamp).map((segment) => ({
      index: segment.startIndex,
      text: formatPeriodLabel(periodRules, segment.periodNumber),
    }));
  }, [chartTimestamps, periodByTimestamp, periodRules, showPeriodDividers]);

  const highlightPayoutWinners = useMemo(
    () => topTeams.some((t) => t.isPrimaryPayoutWinner === true),
    [topTeams],
  );

  const teamsForChart = useMemo(
    () => orderTeamsForChart(topTeams, currentUserId, highlightPayoutWinners),
    [topTeams, highlightPayoutWinners, currentUserId],
  );

  const lineColorForTeam = useCallback(
    (team: TimelineTeam) => {
      if (!currentUserId) return team.color;
      if (isCurrentUserTeam(team, currentUserId)) return team.color;
      if (highlightPayoutWinners && team.isPrimaryPayoutWinner === true) return team.color;
      return colorWithOpacity(team.color, OTHER_TEAM_LINE_OPACITY);
    },
    [currentUserId, highlightPayoutWinners],
  );

  const lineStyleForTeam = useCallback(
    (team: TimelineTeam) => {
      const isUser = isCurrentUserTeam(team, currentUserId);
      return {
        borderColor: lineColorForTeam(team),
        borderWidth: !currentUserId ? 2 : isUser ? 3 : 1,
        order: chartOrderForTeam(team, currentUserId, highlightPayoutWinners),
      };
    },
    [currentUserId, highlightPayoutWinners, lineColorForTeam],
  );

  const labels = useMemo(
    () => chartTimestamps.map((_timestamp, idx) => `${idx + 1}`),
    [chartTimestamps],
  );

  const chartData = useMemo(
    () => ({
      labels,
      datasets: teamsForChart.map((team) => {
        const periodPoints = team.dataPoints.filter((dp) =>
          isTimelinePeriod(periodRules, dataPointPeriod(dp)),
        );
        const { borderColor, borderWidth, order } = lineStyleForTeam(team);
        return {
          label: team.name,
          data: forwardFilledScores(chartTimestamps, periodPoints),
          borderColor,
          backgroundColor: borderColor,
          borderWidth,
          order,
          pointRadius: 0,
          tension: 0.4,
          spanGaps: true,
        };
      }),
    }),
    [labels, teamsForChart, chartTimestamps, lineStyleForTeam, periodRules],
  );

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
        [TIMELINE_CHART_PLUGIN_ID]: {
          labels: periodDividerLabels,
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
          },
          grid: {
            display: false,
          },
          ticks: {
            color: TIMELINE_AXIS_LABEL_COLOR,
            font: {
              family: "'Outfit', sans-serif",
              size: 9,
            },
            callback: (value: string | number) => value,
          },
        },
      },
    }),
    [periodDividerLabels],
  );

  if (!timelineData.teams.length) {
    return (
      <div
        className={cn(
          "flex items-center justify-center font-display",
          fitContainer && "h-full min-h-0 w-full",
          className,
        )}
      >
        <div className="font-display text-red-500">No timeline data provided</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-sm border border-gray-300 bg-white font-display",
        fitContainer && "h-full min-h-0",
        className,
      )}
    >
      <div className="shrink-0 px-3 pb-2 pt-2.5">
        <h3 className="text-sm font-semibold leading-tight text-gray-900">{timelineTitle}</h3>
        <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
          Each line tracks a lineup&apos;s total points.
        </p>
      </div>

      <div
        className={cn("timeline-chart min-h-0 px-2 pb-3 pt-1", fitContainer ? "flex-1" : "")}
        style={fitContainer ? undefined : { height: "220px" }}
      >
        {chartTimestamps.length === 0 ? (
          <div className="flex h-full items-center justify-center font-display text-sm text-gray-500">
            No timeline data available.
          </div>
        ) : (
          <Line data={chartData} options={options} plugins={[timelineChartPlugin]} />
        )}
      </div>
    </div>
  );
};
