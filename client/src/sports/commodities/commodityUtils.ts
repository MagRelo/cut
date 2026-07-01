import type { Candidate } from "@cut/sport-sdk";
import type { CommodityParticipantMetadata, CommodityScoreData } from "@cut/sport-commodities";

const DEFAULT_SESSION_TZ = "America/New_York";

export type CommodityCandidateMetadata = {
  participant?: CommodityParticipantMetadata;
  total?: number;
  scoreData?: CommodityScoreData;
};

export function priceHistoryCloseValues(history: unknown): number[] {
  if (!Array.isArray(history)) {
    return [];
  }
  if (history.length === 0) {
    return [];
  }
  const first = history[0];
  if (first && typeof first === "object" && "c" in first) {
    return (history as Array<{ c: number }>)
      .map((point) => point.c)
      .filter((value) => typeof value === "number" && Number.isFinite(value));
  }
  return history.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
}

export function parseCommodityCandidateMetadata(candidate: Candidate): CommodityCandidateMetadata {
  if (!candidate.metadata || typeof candidate.metadata !== "object") {
    return {};
  }
  return candidate.metadata as CommodityCandidateMetadata;
}

export function candidateDisplayScore(candidate: Candidate): number {
  const meta = parseCommodityCandidateMetadata(candidate);
  if (typeof meta.total === "number") {
    return meta.total;
  }
  const points = candidate.sortKeys.points;
  if (typeof points === "number") {
    return -points;
  }
  return 0;
}

export function formatPctReturn(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDisplayScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}`;
}

export function formatRoundPoints(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}`;
}

export function formatDailyPctReturn(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatVolume(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function formatCommoditiesEventStatusLabel(status: string | undefined): string {
  if (!status) return "Scheduled";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function formatCommoditySessionWindow(
  sessionOpen: string | undefined,
  sessionClose: string | undefined,
  timezone: string = DEFAULT_SESSION_TZ,
): string | null {
  if (!sessionOpen?.trim() || !sessionClose?.trim()) {
    return null;
  }

  const open = new Date(sessionOpen);
  const close = new Date(sessionClose);
  if (Number.isNaN(open.getTime()) || Number.isNaN(close.getTime())) {
    return null;
  }

  const tzShort =
    timezone === "America/New_York"
      ? "ET"
      : (new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "short" })
          .formatToParts(open)
          .find((part) => part.type === "timeZoneName")?.value ?? timezone);

  const sameDay =
    open.toLocaleDateString("en-US", { timeZone: timezone }) ===
    close.toLocaleDateString("en-US", { timeZone: timezone });

  const dateLabel = open.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  });

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  };

  const openTime = open.toLocaleTimeString("en-US", timeOptions);
  const closeTime = close.toLocaleTimeString("en-US", timeOptions);

  if (sameDay) {
    return `${dateLabel} · ${openTime} – ${closeTime} ${tzShort}`;
  }

  const closeDateLabel = close.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  });

  return `${dateLabel} ${openTime} – ${closeDateLabel} ${closeTime} ${tzShort}`;
}
