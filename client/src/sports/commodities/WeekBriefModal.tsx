import { Fragment } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { Modal } from "../../components/common/Modal";

const ET = "America/New_York";
const EVENT_BLURB_TITLE = "event blurb";
const LAST_WEEK_TITLE = "last week";
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
    <h2 className="font-display text-sm font-bold uppercase tracking-wide text-zinc-900">{title}</h2>
  );
}

function LastWeekSection({ section }: { section: BriefSection }) {
  return (
    <section className="space-y-2">
      {sectionHeading(section.title)}
      <ul className="space-y-2 pl-4 text-sm leading-relaxed text-zinc-700">
        {section.items.map((item) => {
          const label = item.label?.trim();
          return (
            <li key={`${label ?? ""}-${item.body.slice(0, 24)}`} className="list-disc">
              {label ? <span className="font-semibold text-zinc-900">{label} </span> : null}
              {item.body}
            </li>
          );
        })}
      </ul>
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
              className={index === 0 ? "pt-1" : "mt-4 border-t border-zinc-200 pt-4"}
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
