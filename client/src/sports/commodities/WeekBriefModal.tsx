import { Fragment } from "react";
import { COMMODITY_METADATA_ALLOWLIST } from "@cut/sport-commodities";
import { formatInTimeZone } from "date-fns-tz";
import { Modal } from "../../components/common/Modal";
import { CommodityAvatar } from "./CommodityAvatar";

const ET = "America/New_York";
const EVENT_BLURB_TITLE = "event blurb";
const LAST_WEEK_TITLE = "last week";
const LAST_WEEK_HEADING = "Last week best/worst";
const TOP_STORIES_TITLE = "top stories";
const SIGN_OFF_EMPHASIS = "this week on Planet Earth.";

type BriefItem = {
  label?: string;
  body: string;
};

type BriefSection = {
  title: string;
  items: BriefItem[];
};

interface CommodityWeekBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName: string;
  sessionOpen?: string | null;
  sessionClose?: string | null;
  summarySections: unknown;
}

function parseWeekBrief(raw: unknown): BriefSection[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const sections: BriefSection[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const record = entry as { title?: unknown; items?: unknown };
    if (typeof record.title !== "string" || record.title.trim() === "") return null;
    if (!Array.isArray(record.items) || record.items.length === 0) return null;
    const items: BriefItem[] = [];
    for (const item of record.items) {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as { body?: unknown; label?: unknown };
      if (typeof row.body !== "string" || row.body.trim() === "") return null;
      if (row.label !== undefined && typeof row.label !== "string") return null;
      items.push({
        body: row.body.trim(),
        ...(typeof row.label === "string" && row.label.trim() ? { label: row.label.trim() } : {}),
      });
    }
    sections.push({ title: record.title.trim(), items });
  }
  return sections;
}

function findSection(sections: BriefSection[], title: string): BriefSection | null {
  const key = title.trim().toLowerCase();
  return sections.find((section) => section.title.trim().toLowerCase() === key) ?? null;
}

function formatDateRange(sessionOpen?: string | null, sessionClose?: string | null): string {
  if (!sessionOpen) return "";
  const start = new Date(sessionOpen);
  if (Number.isNaN(start.getTime())) return "";
  if (!sessionClose) return formatInTimeZone(start, ET, "MMM d, yyyy");
  const end = new Date(sessionClose);
  if (Number.isNaN(end.getTime())) return formatInTimeZone(start, ET, "MMM d, yyyy");
  return `${formatInTimeZone(start, ET, "MMM d")}–${formatInTimeZone(end, ET, "MMM d, yyyy")}`;
}

function emphasizeSignOff(text: string) {
  const parts = text.split(SIGN_OFF_EMPHASIS);
  if (parts.length === 1) return text;
  return parts.map((part, index) => (
    <Fragment key={`${index}-${part.slice(0, 12)}`}>
      {part}
      {index < parts.length - 1 ? (
        <strong className="font-bold">{SIGN_OFF_EMPHASIS}</strong>
      ) : null}
    </Fragment>
  ));
}

function EventBlurb({ body }: { body: string }) {
  const paragraphs = body
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <p className="mt-3 font-display text-[15px] font-normal leading-relaxed text-zinc-600">
      {paragraphs.map((part, index) => (
        <Fragment key={part.slice(0, 24)}>
          {index > 0 ? (
            <>
              <br />
              <br />
            </>
          ) : null}
          {emphasizeSignOff(part)}
        </Fragment>
      ))}
    </p>
  );
}

function sectionHeading(title: string) {
  return (
    <h2 className="mb-5 font-display text-sm font-bold uppercase tracking-wide text-zinc-900">{title}</h2>
  );
}

function parseLastWeekStats(body: string): { points: number | null; pct: number | null } {
  const pointsMatch = body.match(/([+-]?\d+(?:\.\d+)?)\s*pts/i);
  const pctMatch = body.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
  const points = pointsMatch ? Number(pointsMatch[1]) : null;
  const pct = pctMatch ? Number(pctMatch[1]) : null;
  return {
    points: points != null && Number.isFinite(points) ? points : null,
    pct: pct != null && Number.isFinite(pct) ? pct : null,
  };
}

function formatLastWeekPoints(value: number | null): string {
  if (value == null) return "—";
  return String(Math.round(value));
}

function formatLastWeekChange(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function LastWeekSection({ section }: { section: BriefSection }) {
  return (
    <section>
      {sectionHeading(LAST_WEEK_HEADING)}
      <div>
        {section.items.map((item, index) => {
          const name = item.label?.trim() || "Contract";
          const stats = parseLastWeekStats(item.body);
          const entry = COMMODITY_METADATA_ALLOWLIST.find(
            (candidate) => candidate.displayName.toLowerCase() === name.toLowerCase(),
          );
          const changeClass =
            stats.pct == null
              ? "text-gray-400"
              : stats.pct >= 0
                ? "text-emerald-600"
                : "text-red-600";
          return (
            <div
              key={`${name}-${item.body.slice(0, 24)}`}
              className={`grid grid-cols-[2.25rem_minmax(0,1fr)_4.5rem_3.25rem] items-center gap-x-3 ${
                index === 0 ? "pb-3" : "border-t border-zinc-200 py-3"
              }`}
            >
              <CommodityAvatar
                displayName={name}
                iconKey={entry?.iconKey}
                sector={entry?.sector}
              />
              <div className="truncate font-display text-lg font-semibold leading-tight text-gray-900">
                {name}
              </div>
              <div className={`text-right text-xs font-medium tabular-nums ${changeClass}`}>
                {formatLastWeekChange(stats.pct)}
              </div>
              <div className="text-center">
                <div className="font-display text-xl font-bold leading-none tabular-nums text-gray-900">
                  {formatLastWeekPoints(stats.points)}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
                  PTS
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TopStoriesSection({ section }: { section: BriefSection }) {
  return (
    <section>
      {sectionHeading(section.title)}
      <div>
        {section.items.map((item, index) => {
          const label = item.label?.trim();
          return (
            <div
              key={`${label ?? ""}-${item.body.slice(0, 24)}`}
              className={index === 0 ? "" : "mt-4 border-t border-zinc-200 pt-4"}
            >
              {label ? (
                <h3 className="font-display text-base font-bold leading-snug text-zinc-900">{label}</h3>
              ) : null}
              <p className={`text-sm leading-relaxed text-zinc-700 ${label ? "mt-1.5" : ""}`}>
                {item.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function CommodityWeekBriefModal({
  isOpen,
  onClose,
  eventName,
  sessionOpen,
  sessionClose,
  summarySections,
}: CommodityWeekBriefModalProps) {
  const sections = parseWeekBrief(summarySections);
  const blurb = sections ? findSection(sections, EVENT_BLURB_TITLE) : null;
  const lastWeek = sections ? findSection(sections, LAST_WEEK_TITLE) : null;
  const topStories = sections ? findSection(sections, TOP_STORIES_TITLE) : null;
  const dateLine = formatDateRange(sessionOpen, sessionClose);
  const blurbBody = blurb?.items.map((item) => item.body).filter(Boolean).join("\n\n") ?? "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tournament Preview"
      hideHeader
      closeButtonClassName="text-blue-500 hover:text-blue-600 focus-visible:ring-blue-400"
      maxWidth="2xl"
      scrollable
      maxHeight="80vh"
      contentClassName="px-6 pb-6 pt-5"
    >
      {!sections ? (
        <p className="pr-8 text-sm text-zinc-500">No tournament summary available.</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="pr-8 font-display text-[22px] font-bold leading-snug tracking-tight text-zinc-900">
              {eventName}
            </h2>
            {dateLine ? (
              <p className="font-display text-[13px] font-semibold leading-snug text-zinc-600">
                {dateLine}
              </p>
            ) : null}
            {blurbBody ? <EventBlurb body={blurbBody} /> : null}
          </section>
          {lastWeek ? <LastWeekSection section={lastWeek} /> : null}
          {topStories ? <TopStoriesSection section={topStories} /> : null}
        </div>
      )}
    </Modal>
  );
}
