import { formatInTimeZone } from "date-fns-tz";
import {
  formatEventCourseLine,
  getEventBlurb,
  type TournamentSummarySections,
} from "@cut/sport-pga-golf";

const ET = "America/New_York";

export type TournamentAnnouncementCardProps = {
  tournamentName: string;
  course?: string | null;
  city?: string | null;
  state?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  summarySections: TournamentSummarySections | null | undefined;
  className?: string;
};

function formatDateRange(startDate?: string | null, endDate?: string | null): string {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  return `${formatInTimeZone(start, ET, "MMM d")}–${formatInTimeZone(end, ET, "MMM d, yyyy")}`;
}

/**
 * Shared announcement card for the tournament preview modal and (via email HTML) the
 * new-tournament blast — name, course · place, dates, Event Blurb prose.
 */
export function TournamentAnnouncementCard({
  tournamentName,
  course,
  city,
  state,
  startDate,
  endDate,
  summarySections,
  className = "",
}: TournamentAnnouncementCardProps) {
  const courseLine = formatEventCourseLine(course, city, state);
  const dateLine = formatDateRange(startDate, endDate);
  const description = getEventBlurb(summarySections);

  return (
    <section className={className}>
      <div className="rounded-lg border border-slate-300 bg-white px-[18px] py-4">
        <h2 className="font-display text-[22px] font-bold leading-snug tracking-tight text-zinc-900">
          {tournamentName}
        </h2>
        {courseLine ? (
          <p className="mt-0.5 font-display text-[13px] font-semibold leading-snug text-zinc-600">
            {courseLine}
          </p>
        ) : null}
        {dateLine ? (
          <p className="font-display text-[13px] font-semibold leading-snug text-zinc-600">
            {dateLine}
          </p>
        ) : null}
        {description ? (
          <p className="mt-3 font-display text-[13px] font-normal leading-relaxed text-zinc-600">
            {description}
          </p>
        ) : null}
      </div>
    </section>
  );
}
