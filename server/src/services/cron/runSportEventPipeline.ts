import { golfShouldSyncLiveScores } from "@cut/sport-pga-golf";
import { prisma } from "../../lib/prisma.js";
import { requireSportModule } from "../../sports/registry.js";
import { updateContestLineupsForEvent } from "../updateContestLineups.js";

function shouldSyncLiveScores(sportId: string, metadata: unknown): boolean {
  if (sportId === "pga-golf") {
    return golfShouldSyncLiveScores(metadata);
  }
  return false;
}

export async function runSportEventPipeline(eventId: string, sportId: string): Promise<void> {
  const module = requireSportModule(sportId);

  await module.syncEventMetadata(eventId);
  await module.syncParticipantField(eventId);
  if (module.handleWithdrawals) {
    await module.handleWithdrawals(eventId);
  }

  const event = await prisma.competitionEvent.findUnique({
    where: { id: eventId },
    select: { metadata: true },
  });

  if (event && shouldSyncLiveScores(sportId, event.metadata)) {
    await module.syncLiveScores(eventId);
    await updateContestLineupsForEvent(eventId, sportId);
  }
}
