import { Modal } from "../../components/common/Modal";
import {
  isQuotesSection,
  parseSummarySections,
  type TournamentSummarySection,
} from "@cut/sport-pga-golf";
import { TournamentQuoteBlocks } from "./TournamentQuoteBlocks";

interface TournamentSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentName: string;
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
  summarySections,
}: TournamentSummaryModalProps) {
  const sections = parseSummarySections(summarySections);
  const bulletSections = sections?.filter((section) => !isQuotesSection(section)) ?? [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tournamentName}
      maxWidth="2xl"
      scrollable
      maxHeight="80vh"
      contentClassName="px-4 py-4"
    >
      {!sections ? (
        <p className="text-sm text-zinc-500">No tournament summary available.</p>
      ) : (
        <div className="space-y-6">
          <TournamentQuoteBlocks sections={sections} />
          {bulletSections.map(renderBulletSection)}
        </div>
      )}
    </Modal>
  );
}
