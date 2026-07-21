import { prisma } from "../../lib/prisma.js";
import {
  buildDgIdToRankingMap,
  fetchDataGolfRankings,
  type DataGolfRanking,
} from "../../lib/dataGolfRankings.js";
import { getPlayerProfileOverview } from "../../lib/pgaPlayerProfile.js";
import {
  buildPgaTourIdToDgIdMap,
  dataGolfTourFromEnv,
  fetchDataGolfFieldUpdates,
} from "../../services/odds/dataGolfFieldUpdates.js";
import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";

/** Parallel HTTP fetches only; DB writes are sequential to avoid pool/lock pile-ups. */
const PROFILE_FETCH_CHUNK = 4;

function normalizeScandinavianChars(str: string): string {
  return str
    .replace(/å/g, "a")
    .replace(/Å/g, "A")
    .replace(/ø/g, "o")
    .replace(/Ø/g, "O")
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "AE");
}

function normalizePlayerName(name: string | null | undefined): string {
  if (!name) return "";
  return normalizeScandinavianChars(name)
    .toLowerCase()
    .trim()
    .replace(/\s*,\s*(jr\.?|sr\.?|ii|iii|iv|v)$/i, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function createPlayerNameLookup(rankings: DataGolfRanking[]): Map<string, DataGolfRanking> {
  const lookup = new Map<string, DataGolfRanking>();
  for (const ranking of rankings) {
    if (ranking.first && ranking.last) {
      const normalizedName = normalizePlayerName(`${ranking.first} ${ranking.last}`);
      if (normalizedName) lookup.set(normalizedName, ranking);
    } else if (ranking.player) {
      const normalizedName = normalizePlayerName(ranking.player);
      if (normalizedName) lookup.set(normalizedName, ranking);
    }
  }
  return lookup;
}

function findDataGolfRanking(
  meta: {
    pgaTourId?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
  },
  dgLookup: Map<string, DataGolfRanking>,
  dgIdToRanking: Map<number, DataGolfRanking>,
  pgaTourIdToDgId: Map<string, number>,
): DataGolfRanking | null {
  const pgaId = meta.pgaTourId?.trim();
  if (pgaId && pgaTourIdToDgId.size > 0 && dgIdToRanking.size > 0) {
    const dgId = pgaTourIdToDgId.get(pgaId);
    if (dgId != null) {
      const byId = dgIdToRanking.get(dgId);
      if (byId) return byId;
    }
  }

  if (meta.firstName && meta.lastName) {
    const ranking = dgLookup.get(normalizePlayerName(`${meta.firstName} ${meta.lastName}`));
    if (ranking) return ranking;
  }
  if (meta.displayName) {
    const ranking = dgLookup.get(normalizePlayerName(meta.displayName));
    if (ranking) return ranking;
  }
  return null;
}

type ParticipantMeta = Record<string, unknown>;

function resolvePerformanceArray(
  profilePerformance: unknown,
  existing: ParticipantMeta,
): unknown {
  if (Array.isArray(profilePerformance)) {
    return profilePerformance;
  }
  const existingPerf = existing.performance;
  if (Array.isArray(existingPerf)) {
    return existingPerf;
  }
  if (existingPerf && typeof existingPerf === "object" && !Array.isArray(existingPerf)) {
    const nested = (existingPerf as Record<string, unknown>).performance;
    if (Array.isArray(nested)) {
      return nested;
    }
  }
  return profilePerformance ?? [];
}

function resolveStandings(
  fedexStanding: { rank?: string; owgr?: string | null } | undefined,
  existing: ParticipantMeta,
): { rank?: string; owgr?: string | null } | undefined {
  if (fedexStanding) return fedexStanding;
  if (existing.standings && typeof existing.standings === "object") {
    return existing.standings as { rank?: string; owgr?: string | null };
  }
  const existingPerf = existing.performance;
  if (existingPerf && typeof existingPerf === "object" && !Array.isArray(existingPerf)) {
    const nested = (existingPerf as Record<string, unknown>).standings;
    if (nested && typeof nested === "object") {
      return nested as { rank?: string; owgr?: string | null };
    }
  }
  return undefined;
}

function resolveExistingDataGolf(existing: ParticipantMeta): unknown {
  if (existing.dataGolf) return existing.dataGolf;
  const existingPerf = existing.performance;
  if (existingPerf && typeof existingPerf === "object" && !Array.isArray(existingPerf)) {
    return (existingPerf as Record<string, unknown>).dataGolfRanking;
  }
  return undefined;
}

function asMeta(metadata: unknown): ParticipantMeta {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return { ...(metadata as ParticipantMeta) };
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(obj[key])}`)
    .join(",")}}`;
}

function metadataUnchanged(existing: ParticipantMeta, next: ParticipantMeta): boolean {
  return stableSerialize(existing) === stableSerialize(next);
}

async function loadDataGolfLookups(): Promise<{
  dgLookup: Map<string, DataGolfRanking>;
  dgIdToRanking: Map<number, DataGolfRanking>;
  pgaTourIdToDgId: Map<string, number>;
}> {
  let dgLookup = new Map<string, DataGolfRanking>();
  let dgIdToRanking = new Map<number, DataGolfRanking>();
  let pgaTourIdToDgId = new Map<string, number>();

  try {
    const tour = dataGolfTourFromEnv();
    const [dgRankingsData, fieldPayload] = await Promise.all([
      fetchDataGolfRankings(),
      fetchDataGolfFieldUpdates(tour).catch(() => null),
    ]);
    const rankingsArray = Array.isArray(dgRankingsData.data) ? dgRankingsData.data : [];
    if (rankingsArray.length > 0) {
      dgLookup = createPlayerNameLookup(rankingsArray);
      dgIdToRanking = buildDgIdToRankingMap(rankingsArray);
    }
    if (fieldPayload?.field?.length) {
      pgaTourIdToDgId = buildPgaTourIdToDgIdMap(fieldPayload.field);
    }
  } catch (error) {
    console.warn(
      "[enrichParticipantProfiles] Data Golf rankings unavailable:",
      error instanceof Error ? error.message : error,
    );
  }

  return { dgLookup, dgIdToRanking, pgaTourIdToDgId };
}

/**
 * Fetches PGA profile + Data Golf rankings for in-field participants and merges
 * performance / standings into `Participant.metadata` (platform schema).
 */
export async function enrichGolfParticipantProfiles(eventId: string): Promise<number> {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: PGA_GOLF_SPORT_ID },
  });
  if (!event) {
    throw new Error(`Golf event not found: ${eventId}`);
  }

  const rows = await prisma.eventParticipant.findMany({
    where: { eventId },
    include: { participant: true },
  });

  const inField = rows.filter((row) => {
    const meta = asMeta(row.participant.metadata);
    return meta.inField !== false;
  });

  if (inField.length === 0) {
    return 0;
  }

  const { dgLookup, dgIdToRanking, pgaTourIdToDgId } = await loadDataGolfLookups();
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < inField.length; i += PROFILE_FETCH_CHUNK) {
    const chunk = inField.slice(i, i + PROFILE_FETCH_CHUNK);
    const prepared = await Promise.all(
      chunk.map(async (row) => {
        const existing = asMeta(row.participant.metadata);
        const pgaTourId =
          (typeof existing.pgaTourId === "string" ? existing.pgaTourId : null) ??
          row.participant.externalId;
        if (!pgaTourId) return null;

        const profile = await getPlayerProfileOverview(pgaTourId).catch(() => null);
        const fedexStanding = profile?.profileStandings?.find(
          (s) => s.title === "FedExCup Standings",
        );

        const dgRanking = findDataGolfRanking(
          {
            pgaTourId,
            firstName:
              (typeof existing.firstName === "string" ? existing.firstName : null) ??
              profile?.headshot?.firstName ??
              null,
            lastName:
              (typeof existing.lastName === "string" ? existing.lastName : null) ??
              profile?.headshot?.lastName ??
              null,
            displayName:
              row.participant.displayName ??
              (typeof existing.displayName === "string" ? existing.displayName : null),
          },
          dgLookup,
          dgIdToRanking,
          pgaTourIdToDgId,
        );

        const standings = resolveStandings(fedexStanding, existing);
        const performance = resolvePerformanceArray(profile?.performance, existing);

        const nextMeta: ParticipantMeta = {
          ...existing,
          pgaTourId,
          firstName: existing.firstName ?? profile?.headshot?.firstName,
          lastName: existing.lastName ?? profile?.headshot?.lastName,
          displayName:
            row.participant.displayName ??
            existing.displayName ??
            profile?.headshot?.firstName,
          imageUrl: existing.imageUrl ?? profile?.headshot?.image,
          country: existing.country ?? profile?.headshot?.country,
          countryFlag: existing.countryFlag ?? profile?.headshot?.countryFlag,
          owgr: standings?.owgr ?? existing.owgr ?? fedexStanding?.owgr ?? undefined,
          fedex: standings?.rank ?? existing.fedex,
          performance,
          standings,
          dataGolf: dgRanking
            ? {
                dg_rank: dgRanking.dg_rank,
                ...(dgRanking.dg_rank_change !== undefined
                  ? { dg_rank_change: dgRanking.dg_rank_change }
                  : {}),
                ...(dgRanking.dg_skill !== undefined ? { dg_skill: dgRanking.dg_skill } : {}),
              }
            : resolveExistingDataGolf(existing),
        };

        return {
          participantId: row.participantId,
          existing,
          nextMeta,
        };
      }),
    );

    for (const item of prepared) {
      if (!item) continue;
      if (metadataUnchanged(item.existing, item.nextMeta)) {
        skipped++;
        continue;
      }
      await prisma.participant.update({
        where: { id: item.participantId },
        data: { metadata: item.nextMeta as object },
      });
      updated++;
    }
  }

  console.log(
    `[enrichParticipantProfiles] event=${eventId} updated=${updated} skipped=${skipped}`,
  );
  return updated;
}
