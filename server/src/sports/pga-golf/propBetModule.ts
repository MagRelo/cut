import { createPgaGolfPropBetModule } from "@cut/sport-pga-golf";
import { dataGolfTourFromEnv } from "../../services/odds/dataGolfFieldUpdates.js";
import { buildGolfMarketSnapshot } from "./buildGolfMarketSnapshot.js";

export function createServerPgaGolfPropBetModule() {
  const tour = dataGolfTourFromEnv();
  return createPgaGolfPropBetModule({
    buildMarketSnapshot(lineupId: string) {
      return buildGolfMarketSnapshot(lineupId, tour);
    },
  });
}
