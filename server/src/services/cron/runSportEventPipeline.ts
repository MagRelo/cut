import { requireSportModule } from "../../sports/registry.js";
import { updateContestLineupsForEvent } from "../updateContestLineups.js";

export async function runSportEventPipeline(eventId: string, sportId: string): Promise<void> {
  const module = requireSportModule(sportId);

  await module.syncEventMetadata(eventId);
  await module.syncParticipantField(eventId);
  if (module.handleWithdrawals) {
    await module.handleWithdrawals(eventId);
  }

  if (await module.shouldSyncLiveScores(eventId)) {
    await module.syncLiveScores(eventId);
    await updateContestLineupsForEvent(eventId, sportId);
  }
}
