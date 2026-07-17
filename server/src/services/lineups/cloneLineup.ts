import { prisma } from "../../lib/prisma.js";
import { formatLineupResponse, lineupDetailInclude } from "./formatLineup.js";
import { writeLineupPicks } from "./validateLineupPicks.js";
import { markSideBetMarketStaleAfterRosterChange } from "../sideBets/markSideBetMarketStaleAfterRosterChange.js";
import { validateLineupContestScope } from "./validateLineupContestScope.js";
import { getContestEditBlock, lineupEditBlockToHttp } from "../../utils/lineupEditable.js";

export type CloneLineupInput = {
  sourceLineupId: string;
  userId: string;
  targetContestId: string;
  name?: string;
  nameSuffix?: string;
};

export async function cloneLineup(input: CloneLineupInput) {
  const source = await prisma.lineup.findUnique({
    where: { id: input.sourceLineupId },
    include: {
      picks: {
        orderBy: { slotIndex: "asc" },
        select: { eventParticipantId: true },
      },
    },
  });

  if (!source || source.userId !== input.userId) {
    return { error: "not_found" as const };
  }

  // Gate on the *target* contest (OPEN), not whether the source lineup is still editable
  // in an older contest it was entered into.
  const contestBlock = await getContestEditBlock(input.targetContestId);
  if (contestBlock) {
    const http = lineupEditBlockToHttp(contestBlock);
    return {
      error: "not_editable" as const,
      status: http.status,
      body: http.body,
    };
  }

  const scope = await validateLineupContestScope(
    input.userId,
    source.eventId,
    input.targetContestId,
  );
  if (!scope.ok) {
    return { error: scope.error };
  }

  const suffix = input.nameSuffix ?? " (copy)";
  const name =
    input.name ??
    (source.name.endsWith(suffix) ? source.name : `${source.name}${suffix}`);
  const picks = source.picks.map((pick) => pick.eventParticipantId);

  const lineup = await prisma.lineup.create({
    data: {
      userId: source.userId,
      eventId: source.eventId,
      contestId: input.targetContestId,
      name,
      ...(source.prediction != null ? { prediction: source.prediction as object } : {}),
    },
  });

  await writeLineupPicks(lineup.id, picks);
  await markSideBetMarketStaleAfterRosterChange(lineup.id);

  const saved = await prisma.lineup.findUniqueOrThrow({
    where: { id: lineup.id },
    include: lineupDetailInclude,
  });

  return { lineupId: saved.id, lineup: formatLineupResponse(saved) };
}
