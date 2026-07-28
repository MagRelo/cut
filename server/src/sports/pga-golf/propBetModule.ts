import { createPgaGolfPropBetModule } from "@cut/sport-pga-golf";
import type { PropBetIngestBatchContext } from "@cut/sport-sdk";
import { dataGolfTourFromEnv } from "./datagolf/fieldUpdates.js";
import { fetchSideBetDataGolfSnapshot } from "./datagolf/fetchSideBetSnapshot.js";
import type { SideBetDataGolfSnapshot } from "./datagolf/fetchSideBetSnapshot.js";
import { buildGolfMarketSnapshot } from "./buildGolfMarketSnapshot.js";

export function createServerPgaGolfPropBetModule() {
  const tour = dataGolfTourFromEnv();
  return createPgaGolfPropBetModule({
    async beginIngestBatch(): Promise<PropBetIngestBatchContext | undefined> {
      if (!process.env.DATAGOLF_API_KEY?.trim()) {
        console.warn("[pga-golf propBet] DATAGOLF_API_KEY not set; skipping ingest batch");
        return undefined;
      }
      try {
        return await fetchSideBetDataGolfSnapshot(tour);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[pga-golf propBet] DataGolf snapshot failed:", msg);
        return undefined;
      }
    },

    buildMarketSnapshot(lineupId: string, batchContext?: PropBetIngestBatchContext) {
      const snapshot = batchContext as SideBetDataGolfSnapshot | undefined;
      return buildGolfMarketSnapshot(lineupId, tour, snapshot);
    },
  });
}
