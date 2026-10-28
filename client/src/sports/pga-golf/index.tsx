import type { SportUIPlugin } from "@cut/sport-sdk/ui";
import { golfCandidateSortConfig, golfEventStatusFromMetadata, PGA_GOLF_PERIOD_RULES } from "@cut/sport-pga-golf";
import { trimmedStringField } from "../metadataAccess";
import { GolfCandidateRow } from "./CandidateRow";
import { CandidateSelectionCard } from "./CandidateSelectionCard";
import { GolfEventDetails } from "./EventDetails";
import { GolfEventSummary, resolveGolfEventHeroImage } from "./EventSummary";
import { GolfParticipantDetail } from "./ParticipantDetail";
import { GolfParticipantRow } from "./ParticipantRow";
import { formatGolfEventStatus } from "./utils";

export const pgaGolfUIPlugin: SportUIPlugin = {
  CandidateRow: (props) => <GolfCandidateRow {...props} />,
  ParticipantRow: (props) => <GolfParticipantRow {...props} />,
  ParticipantDetail: (props) => <GolfParticipantDetail {...props} />,
  EventSummary: GolfEventSummary,
  resolveEventHeroImage: resolveGolfEventHeroImage,
  candidateSortConfig: golfCandidateSortConfig,
  eventStatus: golfEventStatusFromMetadata,
  formatEventStatus: (_status, metadata) => formatGolfEventStatus(trimmedStringField(metadata, "status") ?? undefined),
  eventStart: (metadata) => trimmedStringField(metadata, "startDate"),
  eventEnd: () => null,
  periodRules: PGA_GOLF_PERIOD_RULES,
};

export {
  GolfCandidateRow,
  GolfParticipantDetail,
  GolfParticipantRow,
  GolfEventSummary,
  GolfEventDetails,
  CandidateSelectionCard,
};
