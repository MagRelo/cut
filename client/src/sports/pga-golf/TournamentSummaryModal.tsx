import type { Candidate } from "@cut/sport-sdk";
import {
  isEventBlurbSection,
  isQuotesSection,
  parseSummarySections,
  splitPlayerOddsLabel,
  type TournamentSummarySection,
} from "@cut/sport-pga-golf";
import { Modal } from "../../components/common/Modal";
import { useEventCandidatesQuery } from "../../hooks/useSportData";
import { TournamentAnnouncementCard } from "./TournamentAnnouncementCard";
import { TournamentQuoteBlocks } from "./TournamentQuoteBlocks";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { parseGolfCandidateMetadata } from "./utils";

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
  sportId?: string;
  eventId?: string;
}

const BEST_PLAYERS_TITLE = /^best players and odds$/i;

function portraitFor(name: string, candidates: Candidate[]) {
  const needle = name.trim().toLowerCase();
  const match = candidates.find((candidate) => candidate.displayName.trim().toLowerCase() === needle);
  const participant = match ? parseGolfCandidateMetadata(match).participant : undefined;
  return {
    imageUrl: participant?.imageUrl ?? null,
    country: participant?.country?.trim() || "",
  };
}

function BestPlayersList({
  section,
  candidates,
}: {
  section: TournamentSummarySection;
  candidates: Candidate[];
}) {
  return (
    <section>
      <h2 className="mb-6 font-display text-sm font-bold uppercase tracking-wide text-zinc-900">
        Best bets
      </h2>
      <div>
        {section.items.map((item, index) => {
          const { name, odds } = splitPlayerOddsLabel(item.label);
          const displayName = name || "Player";
          const portrait = portraitFor(displayName, candidates);
          return (
            <div
              key={`${displayName}-${item.body.slice(0, 24)}`}
              className={`grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 ${
                index === 0 ? "" : "mt-5 border-t border-zinc-200 pt-5"
              }`}
            >
              <ParticipantAvatar imageUrl={portrait.imageUrl} alt={displayName} />
              <div className="min-w-0">
                <div className="truncate font-display text-[15px] font-semibold leading-tight text-zinc-900">
                  {displayName}
                </div>
                {portrait.country ? (
                  <div className="mt-0.5 truncate text-xs leading-tight text-zinc-500">{portrait.country}</div>
                ) : null}
              </div>
              {odds ? (
                <div className="font-display text-sm font-semibold tabular-nums text-zinc-900">{odds}</div>
              ) : (
                <span />
              )}
              <p className="col-span-3 mt-2 text-sm leading-snug text-zinc-700">{item.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
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
  sportId,
  eventId,
}: TournamentSummaryModalProps) {
  const sections = parseSummarySections(summarySections);
  const contentSections =
    sections?.filter((section) => !isQuotesSection(section) && !isEventBlurbSection(section)) ??
    [];
  const hasPlayers = contentSections.some((section) => BEST_PLAYERS_TITLE.test(section.title));
  const { data: candidates = [] } = useEventCandidatesQuery(sportId, eventId, {
    enabled: isOpen && hasPlayers,
  });

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
          {contentSections.map((section) =>
            BEST_PLAYERS_TITLE.test(section.title) ? (
              <BestPlayersList key={section.title} section={section} candidates={candidates} />
            ) : (
              renderBulletSection(section)
            ),
          )}
        </div>
      )}
    </Modal>
  );
}
