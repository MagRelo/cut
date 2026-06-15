import type { SportUIPlugin } from "@cut/sport-sdk/ui";
import { GolfCandidateRow } from "./CandidateRow";
import { CandidateSelectionCard } from "./CandidateSelectionCard";
import { GolfEventDetails } from "./EventDetails";
import { GolfEventSummary } from "./EventSummary";
import { GolfParticipantDetail } from "./ParticipantDetail";
import { GolfParticipantRow } from "./ParticipantRow";
import { GolfPredictionField } from "./PredictionField";

export const pgaGolfUIPlugin: SportUIPlugin = {
  CandidateRow: (props) => <GolfCandidateRow {...props} />,
  ParticipantRow: (props) => <GolfParticipantRow {...props} />,
  ParticipantDetail: (props) => <GolfParticipantDetail {...props} />,
  PredictionField: GolfPredictionField,
  EventSummary: GolfEventSummary,
};

export {
  GolfCandidateRow,
  GolfParticipantDetail,
  GolfParticipantRow,
  GolfPredictionField,
  GolfEventSummary,
  GolfEventDetails,
  CandidateSelectionCard,
};
