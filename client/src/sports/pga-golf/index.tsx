import type { SportUIPlugin } from "@cut/sport-sdk/ui";
import { GolfCandidateRow } from "./CandidateRow";
import { CandidateSelectionCard } from "./CandidateSelectionCard";
import { GolfEventDetails } from "./EventDetails";
import { GolfEventSummary } from "./EventSummary";
import { GolfPickDetail } from "./PickDetail";
import { GolfPredictionField } from "./PredictionField";

export const pgaGolfUIPlugin: SportUIPlugin = {
  CandidateRow: (props) => <GolfCandidateRow {...props} />,
  PickDetail: ({ pick }) => <GolfPickDetail pick={pick} />,
  PredictionField: GolfPredictionField,
  EventSummary: GolfEventSummary,
};

export {
  GolfCandidateRow,
  GolfPickDetail,
  GolfPredictionField,
  GolfEventSummary,
  GolfEventDetails,
  CandidateSelectionCard,
};
