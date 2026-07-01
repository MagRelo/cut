import { addDays, format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import type { CommoditiesSessionCalendar } from "@cut/sport-commodities";
import {
  parseCommoditiesSessionExternalId,
  resolveWeekAnchorDates,
} from "./externalId.js";

const DEFAULT_TZ = "America/New_York";
const DEFAULT_OPEN = "09:30";
const DEFAULT_CLOSE = "16:30";

const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T/;
const TIME_ONLY_PATTERN = /^\d{1,2}:\d{2}(:\d{2})?$/;
const RELATIVE_OFFSET_PATTERN = /^\+(\d+)(m|h)$/i;

export type SessionBoundsInput = {
  sessionDate: string;
  sessionOpen?: string;
  sessionClose?: string;
};

export type SessionBounds = {
  sessionOpen: string;
  sessionClose: string;
};

export type CommoditiesInitOptions = {
  sessionOpen?: string;
  sessionClose?: string;
};

export type CommoditiesInitCliArgs = {
  sportId: string;
  externalId: string;
  initOptions?: CommoditiesInitOptions;
};

export function getCommoditiesSessionTimezone(): string {
  return process.env.COMMODITIES_SESSION_TZ?.trim() || DEFAULT_TZ;
}

export function getCommoditiesSessionOpenTime(): string {
  return process.env.COMMODITIES_SESSION_OPEN?.trim() || DEFAULT_OPEN;
}

export function getCommoditiesSessionCloseTime(): string {
  return process.env.COMMODITIES_SESSION_CLOSE?.trim() || DEFAULT_CLOSE;
}

export function getCommoditiesSessionCalendar(): CommoditiesSessionCalendar {
  return {
    timezone: getCommoditiesSessionTimezone(),
    openTime: getCommoditiesSessionOpenTime(),
    closeTime: getCommoditiesSessionCloseTime(),
  };
}

function padTimeSegment(value: string): string {
  const parts = value.split(":");
  if (parts.length === 2) {
    const hours = parts[0] ?? "0";
    const minutes = parts[1] ?? "0";
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;
  }
  if (parts.length === 3) {
    const hours = parts[0] ?? "0";
    const minutes = parts[1] ?? "0";
    const seconds = parts[2] ?? "0";
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`;
  }
  throw new Error(`Invalid time "${value}" — expected HH:mm or HH:mm:ss`);
}

/** Parse CLI time: ISO datetime, HH:mm in session TZ, or relative +Nm/+Nh from now. */
export function parseSessionTimeArg(value: string, sessionDate: string, tz: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Session time value cannot be empty");
  }

  const relativeMatch = trimmed.match(RELATIVE_OFFSET_PATTERN);
  if (relativeMatch) {
    const amount = Number.parseInt(relativeMatch[1] ?? "0", 10);
    const unit = (relativeMatch[2] ?? "m").toLowerCase();
    const ms = unit === "h" ? amount * 60 * 60 * 1000 : amount * 60 * 1000;
    return new Date(Date.now() + ms).toISOString();
  }

  if (ISO_DATETIME_PATTERN.test(trimmed) || trimmed.includes("T")) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid session time "${value}" — not a valid ISO datetime`);
    }
    return parsed.toISOString();
  }

  if (TIME_ONLY_PATTERN.test(trimmed)) {
    const normalized = padTimeSegment(trimmed);
    return fromZonedTime(`${sessionDate}T${normalized}`, tz).toISOString();
  }

  throw new Error(
    `Invalid session time "${value}" — expected ISO datetime, HH:mm, or relative +Nm/+Nh`,
  );
}

function validateSessionBounds(sessionOpen: string, sessionClose: string): SessionBounds {
  const open = new Date(sessionOpen);
  const close = new Date(sessionClose);

  if (Number.isNaN(open.getTime()) || Number.isNaN(close.getTime())) {
    throw new Error("Session open/close must be valid ISO timestamps");
  }
  if (close.getTime() <= open.getTime()) {
    throw new Error(
      `Session close (${sessionClose}) must be after session open (${sessionOpen})`,
    );
  }

  return { sessionOpen: open.toISOString(), sessionClose: close.toISOString() };
}

function resolveExplicitBounds(input: SessionBoundsInput): SessionBounds {
  if (!input.sessionOpen || !input.sessionClose) {
    throw new Error("Both sessionOpen and sessionClose are required for explicit bounds");
  }

  const tz = getCommoditiesSessionTimezone();
  let sessionOpen = parseSessionTimeArg(input.sessionOpen, input.sessionDate, tz);
  let sessionClose = parseSessionTimeArg(input.sessionClose, input.sessionDate, tz);

  const openDate = new Date(sessionOpen);
  let closeDate = new Date(sessionClose);

  const openWasTimeOnly = TIME_ONLY_PATTERN.test(input.sessionOpen.trim());
  const closeWasTimeOnly = TIME_ONLY_PATTERN.test(input.sessionClose.trim());

  if (closeDate.getTime() <= openDate.getTime() && openWasTimeOnly && closeWasTimeOnly) {
    const nextDate = format(addDays(new Date(`${input.sessionDate}T12:00:00Z`), 1), "yyyy-MM-dd");
    sessionClose = parseSessionTimeArg(input.sessionClose, nextDate, tz);
    closeDate = new Date(sessionClose);
  }

  return validateSessionBounds(sessionOpen, sessionClose);
}

/** ISO session bounds for a week externalId (YYYY-Www) or explicit overrides. */
export function resolveWeeklySessionBounds(weekKey: string): SessionBounds {
  const normalized = parseCommoditiesSessionExternalId(weekKey);
  const { monday, friday } = resolveWeekAnchorDates(normalized);
  const tz = getCommoditiesSessionTimezone();
  const openTime = getCommoditiesSessionOpenTime();
  const closeTime = getCommoditiesSessionCloseTime();

  const sessionOpen = fromZonedTime(`${monday}T${padTimeSegment(openTime)}`, tz).toISOString();
  const sessionClose = fromZonedTime(`${friday}T${padTimeSegment(closeTime)}`, tz).toISOString();

  return validateSessionBounds(sessionOpen, sessionClose);
}

export function resolveSessionBounds(input: string | SessionBoundsInput): SessionBounds {
  if (typeof input === "object" && input.sessionOpen && input.sessionClose) {
    return resolveExplicitBounds(input);
  }

  const weekKey = typeof input === "string" ? input : input.sessionDate;
  return resolveWeeklySessionBounds(weekKey);
}

export function resolveSessionBoundsFromInit(
  weekKey: string,
  options?: CommoditiesInitOptions,
): SessionBounds {
  if (options?.sessionOpen || options?.sessionClose) {
    if (!options.sessionOpen || !options.sessionClose) {
      throw new Error("Both --open and --close are required when overriding session bounds");
    }
    const { monday } = resolveWeekAnchorDates(parseCommoditiesSessionExternalId(weekKey));
    return resolveSessionBounds({
      sessionDate: monday,
      sessionOpen: options.sessionOpen,
      sessionClose: options.sessionClose,
    });
  }

  return resolveWeeklySessionBounds(weekKey);
}

function readFlagValue(args: string[], ...flags: string[]): string | undefined {
  for (const flag of flags) {
    const index = args.indexOf(flag);
    if (index >= 0) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${flag}`);
      }
      return value;
    }
    const inline = args.find((arg) => arg.startsWith(`${flag}=`));
    if (inline) {
      return inline.slice(flag.length + 1);
    }
  }
  return undefined;
}

/** Parse service:init-event argv; commodities supports optional session bounds flags. */
export function parseCommoditiesInitCliArgs(argv: string[]): CommoditiesInitCliArgs {
  const args = argv.filter((a) => a !== "--");
  const sportId = args[0];
  const externalId = args[1];

  if (!sportId || !externalId) {
    throw new Error("Usage: pnpm run service:init-event <sportId> <externalId> [--open HH:mm] [--close HH:mm]");
  }

  const sessionOpen = readFlagValue(args, "--open", "--session-open");
  const sessionClose = readFlagValue(args, "--close", "--session-close");

  if (sportId === "commodities") {
    parseCommoditiesSessionExternalId(externalId);
  }

  if (sessionOpen || sessionClose) {
    if (!sessionOpen || !sessionClose) {
      throw new Error("Both --open and --close are required when overriding session bounds");
    }
  }

  if (sessionOpen && sessionClose) {
    return { sportId, externalId, initOptions: { sessionOpen, sessionClose } };
  }

  return { sportId, externalId };
}

export function formatSessionDisplayName(weekKey: string): string {
  const { weekNumber } = resolveWeekAnchorDates(parseCommoditiesSessionExternalId(weekKey));
  return `Commodity Futures – Week ${weekNumber}`;
}

export function formatSessionWindow(
  sessionOpen: string,
  sessionClose: string,
  timezone: string = getCommoditiesSessionTimezone(),
): string {
  const open = new Date(sessionOpen);
  const close = new Date(sessionClose);
  if (Number.isNaN(open.getTime()) || Number.isNaN(close.getTime())) {
    return "";
  }

  const tzShort =
    timezone === "America/New_York"
      ? "ET"
      : new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "short" })
          .formatToParts(open)
          .find((part) => part.type === "timeZoneName")?.value ?? timezone;

  const sameDay = open.toLocaleDateString("en-US", { timeZone: timezone }) ===
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
