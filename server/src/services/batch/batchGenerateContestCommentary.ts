/**
 * @deprecated Prefer refreshContestOverviews from sports/pga-golf/commentary.
 * Re-exports for transitional imports.
 */
export {
  refreshContestOverviews as batchGenerateContestCommentary,
  CONTEST_COMMENTARY_OVERVIEW_REFRESH_MS as CONTEST_COMMENTARY_REFRESH_MS,
  refreshContestOverviews,
  CONTEST_COMMENTARY_OVERVIEW_REFRESH_MS,
} from "../../sports/pga-golf/commentary/refreshContestOverviews.js";
