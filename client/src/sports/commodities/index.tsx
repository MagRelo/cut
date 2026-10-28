import type { SportUIPlugin } from "@cut/sport-sdk/ui";
import {
  commoditiesCandidateSortConfig,
  commoditiesEventStatusFromMetadata,
  COMMODITIES_PERIOD_RULES,
} from "@cut/sport-commodities";
import { trimmedNestedStringField } from "../metadataAccess";
import { CommodityCandidateRow } from "./CandidateRow";
import { CommodityEventSummary, resolveCommodityEventHeroImage } from "./EventSummary";
import { CommodityParticipantDetail } from "./ParticipantDetail";
import { CommodityParticipantRow } from "./ParticipantRow";
import { formatCommoditiesEventStatusLabel } from "./commodityUtils";

export const commoditiesUIPlugin: SportUIPlugin = {
  CandidateRow: (props) => <CommodityCandidateRow {...props} />,
  ParticipantRow: (props) => <CommodityParticipantRow {...props} />,
  ParticipantDetail: (props) => <CommodityParticipantDetail {...props} />,
  EventSummary: CommodityEventSummary,
  resolveEventHeroImage: resolveCommodityEventHeroImage,
  candidateSortConfig: commoditiesCandidateSortConfig,
  eventStatus: commoditiesEventStatusFromMetadata,
  formatEventStatus: (status) => formatCommoditiesEventStatusLabel(status),
  eventStart: (metadata) => trimmedNestedStringField(metadata, "commodities", "sessionOpen"),
  eventEnd: (metadata) => trimmedNestedStringField(metadata, "commodities", "sessionClose"),
  periodRules: COMMODITIES_PERIOD_RULES,
};

export {
  CommodityCandidateRow,
  CommodityEventSummary,
  CommodityParticipantDetail,
  CommodityParticipantRow,
};
