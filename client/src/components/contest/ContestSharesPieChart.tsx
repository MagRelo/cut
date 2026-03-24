import { useMemo } from "react";
import { type Contest } from "../../types/contest";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";

const DEFAULT_USER_COLOR = "#9CA3AF"; // Tailwind gray-400 hex

const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
};

interface ContestSharesPieChartProps {
  contest: Contest;
}

export const ContestSharesPieChart = ({ contest }: ContestSharesPieChartProps) => {
  const entryIds = useMemo(
    () =>
      contest.contestLineups
        ?.map((lineup) => lineup.entryId)
        .filter(
          (entryId): entryId is string => typeof entryId === "string" && entryId.length > 0,
        ) ?? [],
    [contest.contestLineups],
  );

  const { entryData, secondaryTotalFundsFormatted, isLoading } = useContestPredictionData({
    contestAddress: contest.address,
    entryIds,
    enabled: Boolean(contest.address && entryIds.length > 0),
    chainId: contest.chainId,
  });

  const chartData = useMemo(() => {
    const segments = entryData
      .map((entry) => {
        const lineup = contest.contestLineups?.find((l) => l.entryId === entry.entryId);
        const lineupColor = (lineup as { color?: unknown } | undefined)?.color;
        const userSettings = lineup?.user?.settings;
        const userSettingsColor =
          typeof userSettings === "object" && userSettings !== null
            ? (userSettings as { color?: unknown }).color
            : undefined;
        const maybeColor = lineupColor ?? userSettingsColor;
        const color = isValidHexColor(maybeColor) ? maybeColor : DEFAULT_USER_COLOR;

        return {
          entryId: entry.entryId,
          shares: entry.totalSupply,
          color,
          name: lineup?.user?.name || lineup?.user?.email || `Entry #${entry.entryId}`,
        };
      })
      .filter((entry) => entry.shares > 0n);

    const totalShares = segments.reduce((acc, segment) => acc + segment.shares, 0n);

    if (totalShares <= 0n || segments.length === 0) {
      return { gradient: "" };
    }

    let startPercent = 0;
    const chartSegments = segments.map((segment, index) => {
      const isLast = index === segments.length - 1;
      const rawPercent = Number((segment.shares * 10000n) / totalShares) / 100;
      const percent = isLast ? Math.max(0, 100 - startPercent) : rawPercent;
      const endPercent = Math.min(100, startPercent + percent);
      const gradientSlice = `${segment.color} ${startPercent.toFixed(2)}% ${endPercent.toFixed(2)}%`;
      startPercent = endPercent;

      return { gradientSlice };
    });

    return {
      gradient: `conic-gradient(${chartSegments.map((s) => s.gradientSlice).join(", ")})`,
    };
  }, [contest.contestLineups, entryData]);

  const secondaryTotalPotLabel = useMemo(() => {
    const raw = Number.parseFloat(secondaryTotalFundsFormatted || "0");
    if (!Number.isFinite(raw)) return "$0";
    return `$${Math.round(raw).toLocaleString()}`;
  }, [secondaryTotalFundsFormatted]);

  if (isLoading) {
    return (
      <div className="mt-2 mb-3 p-3 border border-gray-200 rounded-sm bg-white">
        <div className="text-xs text-gray-500 font-display">Loading share chart...</div>
      </div>
    );
  }

  if (!chartData.gradient) {
    return (
      <div className="mt-2 mb-3 p-3 border border-gray-200 rounded-sm bg-white">
        <div className="text-xs text-gray-500 font-display">No share ownership data yet</div>
      </div>
    );
  }

  return (
    <div className="mt-2 mb-3 p-3 bg-white">
      <div className="flex justify-center items-center">
        <div
          className="relative h-40 w-40 rounded-full flex-shrink-0"
          style={{
            backgroundImage: chartData.gradient,
          }}
        >
          <div className="absolute inset-[7px] rounded-full bg-white flex flex-col items-center justify-center text-center px-2">
            <div className="text-3xl md:text-3xl font-extrabold text-emerald-600 leading-none">
              {secondaryTotalPotLabel}
            </div>
            <div className="text-xs font-semibold text-gray-400 mb-2 uppercase font-display tracking-wide">
              Winner Pool
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
