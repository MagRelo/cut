import type { SportUIPlugin } from "@cut/sport-sdk/ui";
import { f1CandidateSortConfig, f1EventStatusFromMetadata, F1_PERIOD_RULES } from "@cut/sport-f1";
import { trimmedNestedStringField } from "../metadataAccess";
import { F1CandidateRow } from "./CandidateRow";
import { F1CandidateSelectionCard } from "./CandidateSelectionCard";
import { F1EventDetails } from "./EventDetails";
import { F1EventSummary, resolveF1EventHeroImage } from "./EventSummary";
import { F1ParticipantDetail } from "./ParticipantDetail";
import { F1ParticipantRow } from "./ParticipantRow";
import { formatF1EventStatusLabel } from "./utils";

export const f1UIPlugin: SportUIPlugin = {
  CandidateRow: (props) => <F1CandidateRow {...props} />,
  ParticipantRow: (props) => <F1ParticipantRow {...props} />,
  ParticipantDetail: (props) => <F1ParticipantDetail {...props} />,
  EventSummary: F1EventSummary,
  resolveEventHeroImage: resolveF1EventHeroImage,
  candidateSortConfig: f1CandidateSortConfig,
  eventStatus: f1EventStatusFromMetadata,
  formatEventStatus: (status) => formatF1EventStatusLabel(status),
  eventStart: (metadata) => trimmedNestedStringField(metadata, "f1", "raceStart"),
  eventEnd: () => null,
  periodRules: F1_PERIOD_RULES,
};

export {
  F1CandidateRow,
  F1CandidateSelectionCard,
  F1EventDetails,
  F1EventSummary,
  F1ParticipantDetail,
  F1ParticipantRow,
};
