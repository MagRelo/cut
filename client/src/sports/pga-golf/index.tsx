import type { SportUIPlugin } from "@cut/sport-sdk/ui";
import { golfCandidateSortConfig } from "@cut/sport-pga-golf";
import { GolfCandidateRow } from "./CandidateRow";
import { CandidateSelectionCard } from "./CandidateSelectionCard";
import { GolfEventDetails } from "./EventDetails";
import { GolfEventSummary, resolveGolfEventHeroImage } from "./EventSummary";
import { GolfParticipantDetail } from "./ParticipantDetail";
import { GolfParticipantRow } from "./ParticipantRow";
export const pgaGolfUIPlugin: SportUIPlugin = {
  CandidateRow: (props) => <GolfCandidateRow {...props} />,
  ParticipantRow: (props) => <GolfParticipantRow {...props} />,
  ParticipantDetail: (props) => <GolfParticipantDetail {...props} />,
  EventSummary: GolfEventSummary,
  resolveEventHeroImage: resolveGolfEventHeroImage,
  candidateSortConfig: golfCandidateSortConfig,
};

export {
  GolfCandidateRow,
  GolfParticipantDetail,
  GolfParticipantRow,
  GolfEventSummary,
  GolfEventDetails,
  CandidateSelectionCard,
};
