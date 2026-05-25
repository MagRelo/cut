import { useMemo } from "react";
import { Link } from "react-router-dom";
import { type Contest } from "../../types/contest";
import { useContestPredictionData } from "../../hooks/useContestPredictionData";

const DEFAULT_USER_COLOR = "#9CA3AF"; // Tailwind gray-400 hex
const EMPTY_STATE_PIE_GRADIENT =
  "conic-gradient(from -90deg, transparent 0% 0.4%, rgba(34, 197, 94, 0.55) 0.4% 22.3%, transparent 22.3% 23.1%, rgba(22, 163, 74, 0.55) 23.1% 34.6%, transparent 34.6% 35.4%, rgba(74, 222, 128, 0.55) 35.4% 54.8%, transparent 54.8% 55.6%, rgba(21, 128, 61, 0.55) 55.6% 62.0%, transparent 62.0% 62.8%, rgba(52, 211, 153, 0.55) 62.8% 80.9%, transparent 80.9% 81.7%, rgba(34, 197, 94, 0.55) 81.7% 95.0%, transparent 95.0% 95.8%, rgba(22, 163, 74, 0.55) 95.8% 99.6%, transparent 99.6% 100%)";

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
    const firstRenderedStart =
      firstColoredEnd > firstColoredStart ? firstColoredStart : first.sliceStart;
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

  const showEmptyState = isLoading || !chartData.gradient;

  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex items-center justify-center">
        <div
          className="relative h-40 w-40 rounded-full flex-shrink-0 transition-[background-image] duration-300 ease-out"
          style={{
            backgroundImage: showEmptyState ? EMPTY_STATE_PIE_GRADIENT : chartData.gradient,
          }}
        >
          <div className="absolute inset-[7px] rounded-full flex flex-col items-center justify-center px-2 text-center bg-white">
            <div className="flex h-[90px] w-full flex-col items-center justify-center">
              <div className="relative flex min-h-[52px] w-full items-center justify-center leading-none">
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 ease-out ${
                    showEmptyState ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="text-xs font-semibold text-emerald-700 uppercase font-display tracking-wide leading-tight">
                    Winner Pool
                    <br />
                    is open
                  </div>
                  {/* <div className="mt-1 text-[10px] text-emerald-600 font-display leading-tight">
                    Select a lineup to <br /> place a wager
                  </div> */}
                </div>
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 ease-out ${
                    showEmptyState ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <div className="text-3xl md:text-3xl font-extrabold text-emerald-600 leading-none">
                    {secondaryTotalPotLabel}
                  </div>
                  <div className="pt-1 text-xs font-semibold text-gray-400 uppercase font-display tracking-wide">
                    Winner Pool
                  </div>
                </div>
              </div>

              <div className="flex h-5 items-center justify-center">
                <Link
                  to="/faq#winner-pool"
                  className="font-display text-blue-600 hover:text-blue-700 text-[12px]"
                >
                  What's this?
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
