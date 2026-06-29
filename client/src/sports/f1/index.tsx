import type { SportUIPlugin } from "@cut/sport-sdk/ui";
import { f1CandidateSortConfig } from "@cut/sport-f1";
import { F1CandidateRow } from "./CandidateRow";
import { F1CandidateSelectionCard } from "./CandidateSelectionCard";
import { F1EventDetails } from "./EventDetails";
import { F1EventSummary, resolveF1EventHeroImage } from "./EventSummary";
import { F1ParticipantDetail } from "./ParticipantDetail";
import { F1ParticipantRow } from "./ParticipantRow";
export const f1UIPlugin: SportUIPlugin = {
  CandidateRow: (props) => <F1CandidateRow {...props} />,
  ParticipantRow: (props) => <F1ParticipantRow {...props} />,
  ParticipantDetail: (props) => <F1ParticipantDetail {...props} />,
  EventSummary: F1EventSummary,
  resolveEventHeroImage: resolveF1EventHeroImage,
  candidateSortConfig: f1CandidateSortConfig,
};

export {
  F1CandidateRow,
  F1CandidateSelectionCard,
  F1EventDetails,
  F1EventSummary,
  F1ParticipantDetail,
  F1ParticipantRow,
};
