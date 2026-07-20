import { Modal } from "../../components/common/Modal";
import {
  isEventBlurbSection,
  isQuotesSection,
  parseSummarySections,
  type TournamentSummarySection,
} from "@cut/sport-pga-golf";
import { TournamentAnnouncementCard } from "./TournamentAnnouncementCard";
import { TournamentQuoteBlocks } from "./TournamentQuoteBlocks";

interface TournamentSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentName: string;
  course?: string | null;
  city?: string | null;
  state?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  summarySections: unknown;
}

function renderBulletSection(section: TournamentSummarySection) {
  return (
    <section key={section.title} className="space-y-2">
      <h2 className="font-display text-sm font-bold uppercase tracking-wide text-zinc-900">
        {section.title}
      </h2>
      <ul className="space-y-2 pl-4 text-sm leading-relaxed text-zinc-700">
        {section.items.map((item) => {
          const label = item.label?.trim();
          return (
            <li key={`${section.title}-${label ?? ""}-${item.body.slice(0, 24)}`} className="list-disc">
              {label ? <span className="font-semibold text-zinc-900">{label} </span> : null}
              {item.body}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TournamentSummaryModal({
  isOpen,
  onClose,
  tournamentName,
  course,
  city,
  state,
  startDate,
  endDate,
  summarySections,
}: TournamentSummaryModalProps) {
  const sections = parseSummarySections(summarySections);
  const bulletSections =
    sections?.filter((section) => !isQuotesSection(section) && !isEventBlurbSection(section)) ??
    [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tournament Preview"
      maxWidth="2xl"
      scrollable
      maxHeight="80vh"
      contentClassName="px-4 py-4"
    >
      {!sections ? (
        <p className="text-sm text-zinc-500">No tournament summary available.</p>
      ) : (
        <div className="space-y-6">
          <TournamentAnnouncementCard
            tournamentName={tournamentName}
            course={course}
            city={city}
            state={state}
            startDate={startDate}
            endDate={endDate}
            summarySections={sections}
          />
          <TournamentQuoteBlocks sections={sections} />
          {bulletSections.map(renderBulletSection)}
        </div>
      )}
    </Modal>
  );
}
