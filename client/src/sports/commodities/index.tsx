import type { SportUIPlugin } from "@cut/sport-sdk/ui";
import { commoditiesCandidateSortConfig } from "@cut/sport-commodities";
import { CommodityCandidateRow } from "./CandidateRow";
import { CommodityEventSummary, resolveCommodityEventHeroImage } from "./EventSummary";
import { CommodityParticipantDetail } from "./ParticipantDetail";
import { CommodityParticipantRow } from "./ParticipantRow";
export const commoditiesUIPlugin: SportUIPlugin = {
  CandidateRow: (props) => <CommodityCandidateRow {...props} />,
  ParticipantRow: (props) => <CommodityParticipantRow {...props} />,
  ParticipantDetail: (props) => <CommodityParticipantDetail {...props} />,
  EventSummary: CommodityEventSummary,
  resolveEventHeroImage: resolveCommodityEventHeroImage,
  candidateSortConfig: commoditiesCandidateSortConfig,
};

export {
  CommodityCandidateRow,
  CommodityEventSummary,
  CommodityParticipantDetail,
  CommodityParticipantRow,
};
