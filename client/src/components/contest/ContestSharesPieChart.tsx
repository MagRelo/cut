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

    // Percentage points gap between slices.
    // Smaller values = tighter separators.
    const GAP_PERCENT = 0.7;
    const halfGap = GAP_PERCENT / 2;

    let startPercent = 0;
    const boundaries = segments.map((segment, index) => {
      const isLast = index === segments.length - 1;
      const rawPercent = Number((segment.shares * 10000n) / totalShares) / 100;
      const percent = isLast ? Math.max(0, 100 - startPercent) : rawPercent;
      const endPercent = Math.min(100, startPercent + percent);

      const sliceStart = startPercent;
      const sliceEnd = endPercent;
      startPercent = endPercent;

      return { color: segment.color, sliceStart, sliceEnd };
    });

    const gradientStops: string[] = [];

    const first = boundaries[0];
    const firstColoredStart = first.sliceStart + halfGap;
    const firstColoredEnd = first.sliceEnd - halfGap;
    const firstRenderedStart = firstColoredEnd > firstColoredStart ? firstColoredStart : first.sliceStart;
    if (firstRenderedStart > 0) {
      gradientStops.push(`transparent 0.00% ${firstRenderedStart.toFixed(2)}%`);
    }

    for (let i = 0; i < boundaries.length; i++) {
      const current = boundaries[i];
      const next = boundaries[i + 1];

      // Shrink colored arc to leave a separator gap.
      const currentColoredStart = current.sliceStart + halfGap;
      const currentColoredEnd = current.sliceEnd - halfGap;
      const currentFits = currentColoredEnd > currentColoredStart;
      const currentRenderedStart = currentFits ? currentColoredStart : current.sliceStart;
      const currentRenderedEnd = currentFits ? currentColoredEnd : current.sliceEnd;

      gradientStops.push(
        `${current.color} ${currentRenderedStart.toFixed(2)}% ${currentRenderedEnd.toFixed(2)}%`,
      );

      // Explicitly insert transparent separator between slices.
      if (next) {
        const nextColoredStart = next.sliceStart + halfGap;
        const nextColoredEnd = next.sliceEnd - halfGap;
        const nextFits = nextColoredEnd > nextColoredStart;
        const nextRenderedStart = nextFits ? nextColoredStart : next.sliceStart;

        if (nextRenderedStart > currentRenderedEnd) {
          gradientStops.push(
            `transparent ${currentRenderedEnd.toFixed(2)}% ${nextRenderedStart.toFixed(2)}%`,
          );
        }
      }
    }

    // Add the wrap-around transparent separator (last slice -> first slice).
    const last = boundaries[boundaries.length - 1];
    const lastColoredStart = last.sliceStart + halfGap;
    const lastColoredEnd = last.sliceEnd - halfGap;
    const lastFits = lastColoredEnd > lastColoredStart;
    const lastRenderedEnd = lastFits ? lastColoredEnd : last.sliceEnd;
    if (lastRenderedEnd < 100) {
      gradientStops.push(`transparent ${lastRenderedEnd.toFixed(2)}% 100.00%`);
    }

    return {
      gradient: `conic-gradient(${gradientStops.join(", ")})`,
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
