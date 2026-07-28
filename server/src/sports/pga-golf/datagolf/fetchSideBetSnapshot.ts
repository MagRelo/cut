import {
  fetchDataGolfFieldUpdates,
  type DataGolfFieldUpdatesPayload,
  type DataGolfTourParam,
} from "../odds/dataGolfFieldUpdates.js";
import {
  fetchDataGolfOutrights,
  type DataGolfOutrightsPayload,
} from "../odds/dataGolfOutrightsClient.js";

/** Shared DataGolf payloads for one refresh pass (one lineup or many). */
export interface SideBetDataGolfSnapshot {
  field: DataGolfFieldUpdatesPayload;
  outrightsTop5: DataGolfOutrightsPayload;
  outrightsTop10: DataGolfOutrightsPayload;
  outrightsTop20: DataGolfOutrightsPayload;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * One field-updates + three outrights calls, spaced slightly to reduce burst rate-limit risk.
 * Use this once per cron batch then pass the snapshot into each `ingestPropBetQuoteForLineup`.
 */
export async function fetchSideBetDataGolfSnapshot(tour: DataGolfTourParam): Promise<SideBetDataGolfSnapshot> {
  const field = await fetchDataGolfFieldUpdates(tour);
  await sleep(120);
  const outrightsTop5 = await fetchDataGolfOutrights(tour, "top_5");
  await sleep(120);
  const outrightsTop10 = await fetchDataGolfOutrights(tour, "top_10");
  await sleep(120);
  const outrightsTop20 = await fetchDataGolfOutrights(tour, "top_20");
  return { field, outrightsTop5, outrightsTop10, outrightsTop20 };
}
