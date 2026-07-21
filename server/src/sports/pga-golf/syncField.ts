import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { getActivePlayers } from "../../lib/pgaField.js";
import { fetchPGATourPlayers } from "../../lib/pgaPlayers.js";
import { PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";
import { enrichGolfParticipantProfiles } from "./enrichParticipantProfiles.js";
import { syncGolfTeeTimes } from "./syncTeeTimes.js";

/** Enrich / tee-time hygiene cadence (not needed every 5m live tick). */
const FIELD_HYGIENE_INTERVAL_MS = 30 * 60 * 1000;

type MetaRecord = Record<string, unknown>;

function asMeta(metadata: unknown): MetaRecord {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return { ...(metadata as MetaRecord) };
}

function metaString(meta: MetaRecord, key: string): string | undefined {
  const v = meta[key];
  return typeof v === "string" ? v : v == null ? undefined : String(v);
}

function participantNeedsFieldUpdate(
  existing: {
    displayName: string | null;
    metadata: unknown;
  },
  displayName: string,
  fieldKeys: {
    pgaTourId: string;
    firstName: string | undefined;
    lastName: string | undefined;
    owgr: string | undefined;
  },
): boolean {
  if (existing.displayName !== displayName) return true;
  const meta = asMeta(existing.metadata);
  if (meta.inField !== true) return true;
  if (meta.isActive !== true) return true;
  if (metaString(meta, "pgaTourId") !== fieldKeys.pgaTourId) return true;
  if ((meta.firstName as string | undefined) !== fieldKeys.firstName) return true;
  if ((meta.lastName as string | undefined) !== fieldKeys.lastName) return true;
  if (metaString(meta, "displayName") !== displayName) return true;
  if (metaString(meta, "owgr") !== fieldKeys.owgr) return true;
  return false;
}

function mergeFieldMetadata(
  existing: unknown,
  fieldKeys: {
    pgaTourId: string;
    firstName: string | undefined;
    lastName: string | undefined;
    displayName: string;
    owgr: string | undefined;
  },
): MetaRecord {
  return {
    ...asMeta(existing),
    pgaTourId: fieldKeys.pgaTourId,
    firstName: fieldKeys.firstName,
    lastName: fieldKeys.lastName,
    displayName: fieldKeys.displayName,
    owgr: fieldKeys.owgr,
    inField: true,
    isActive: true,
  };
}

function shouldRunFieldHygiene(
  lastAtIso: unknown,
  force: boolean,
): boolean {
  if (force) return true;
  if (typeof lastAtIso !== "string" || !lastAtIso) return true;
  const last = Date.parse(lastAtIso);
  if (!Number.isFinite(last)) return true;
  return Date.now() - last >= FIELD_HYGIENE_INTERVAL_MS;
}

async function maybeRunFieldHygiene(
  eventId: string,
  eventMetadata: unknown,
  /** Only membership / field-size changes force an immediate enrich+tee pass. */
  membershipChanged: boolean,
): Promise<void> {
  const meta = asMeta(eventMetadata);
  const nowIso = new Date().toISOString();
  const patch: MetaRecord = {};

  if (shouldRunFieldHygiene(meta.lastFieldEnrichAt, membershipChanged)) {
    try {
      await enrichGolfParticipantProfiles(eventId);
      patch.lastFieldEnrichAt = nowIso;
    } catch (error) {
      console.warn(
        "[syncGolfParticipantField] Profile enrichment failed (field sync still succeeded):",
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (shouldRunFieldHygiene(meta.lastTeeTimeSyncAt, membershipChanged)) {
    try {
      await syncGolfTeeTimes(eventId);
      patch.lastTeeTimeSyncAt = nowIso;
    } catch (error) {
      console.warn(
        "[syncGolfParticipantField] Tee time sync failed (field sync still succeeded):",
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (Object.keys(patch).length === 0) {
    return;
  }

  await prisma.competitionEvent.update({
    where: { id: eventId },
    data: {
      metadata: {
        ...meta,
        ...patch,
      } as Prisma.InputJsonValue,
    },
  });
}

export async function syncGolfParticipantField(eventId: string) {
  const event = await prisma.competitionEvent.findFirst({
    where: { id: eventId, sportId: PGA_GOLF_SPORT_ID },
  });

  if (!event) {
    throw new Error(`Golf event not found: ${eventId}`);
  }

  const fieldData = await getActivePlayers(event.externalId);
  const fieldPlayerIds = new Set(fieldData.players.map((player) => player.id));

  const directoryPlayers = await fetchPGATourPlayers();
  const directoryById = new Map(directoryPlayers.map((player) => [player.id, player]));

  const existingParticipants = await prisma.participant.findMany({
    where: {
      sportId: PGA_GOLF_SPORT_ID,
      externalId: { in: [...fieldPlayerIds] },
    },
  });
  const participantByExternalId = new Map(
    existingParticipants
      .filter((p) => p.externalId)
      .map((p) => [p.externalId!, p]),
  );

  const existingEventLinks = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    select: { participantId: true },
  });
  const linkedParticipantIds = new Set(existingEventLinks.map((r) => r.participantId));

  const priorFieldCount =
    typeof asMeta(event.metadata).lastSyncedFieldCount === "number"
      ? (asMeta(event.metadata).lastSyncedFieldCount as number)
      : null;
  /** New/removed players or field-size change — forces enrich/tee; name/owgr tweaks do not. */
  let membershipChanged =
    priorFieldCount == null || priorFieldCount !== fieldData.players.length;

  let participantsUpserted = 0;
  let eventLinksCreated = 0;

  for (const fieldPlayer of fieldData.players) {
    const directory = directoryById.get(fieldPlayer.id);
    const displayName =
      directory?.displayName ??
      `${fieldPlayer.firstName ?? ""} ${fieldPlayer.lastName ?? ""}`.trim();

    const fieldKeys = {
      pgaTourId: fieldPlayer.id,
      firstName: fieldPlayer.firstName ?? directory?.firstName,
      lastName: fieldPlayer.lastName ?? directory?.lastName,
      displayName,
      owgr: fieldPlayer.owgr?.toString(),
    };

    const existing = participantByExternalId.get(fieldPlayer.id);
    let participantId: string;

    if (!existing) {
      const created = await prisma.participant.create({
        data: {
          sportId: PGA_GOLF_SPORT_ID,
          externalId: fieldPlayer.id,
          displayName,
          metadata: {
            pgaTourId: fieldKeys.pgaTourId,
            firstName: fieldKeys.firstName,
            lastName: fieldKeys.lastName,
            displayName,
            owgr: fieldKeys.owgr,
            inField: true,
            isActive: true,
          },
        },
      });
      participantId = created.id;
      participantByExternalId.set(fieldPlayer.id, created);
      participantsUpserted++;
      membershipChanged = true;
    } else if (participantNeedsFieldUpdate(existing, displayName, fieldKeys)) {
      const updated = await prisma.participant.update({
        where: { id: existing.id },
        data: {
          displayName,
          metadata: mergeFieldMetadata(
            existing.metadata,
            fieldKeys,
          ) as Prisma.InputJsonValue,
        },
      });
      participantId = updated.id;
      participantByExternalId.set(fieldPlayer.id, updated);
      participantsUpserted++;
    } else {
      participantId = existing.id;
    }

    if (!linkedParticipantIds.has(participantId)) {
      await prisma.eventParticipant.create({
        data: {
          eventId: event.id,
          participantId,
          scoreData: {},
          total: 0,
        },
      });
      linkedParticipantIds.add(participantId);
      eventLinksCreated++;
      membershipChanged = true;
    }
  }

  const eventParticipants = await prisma.eventParticipant.findMany({
    where: { eventId: event.id },
    include: { participant: true },
  });

  for (const row of eventParticipants) {
    const externalId = row.participant.externalId;
    if (!externalId || !fieldPlayerIds.has(externalId)) {
      const meta = asMeta(row.participant.metadata);
      if (meta.inField === false) continue;
      await prisma.participant.update({
        where: { id: row.participantId },
        data: {
          metadata: {
            ...meta,
            inField: false,
          },
        },
      });
      membershipChanged = true;
    }
  }

  const eventMeta = asMeta(event.metadata);
  if (eventMeta.lastSyncedFieldCount !== fieldData.players.length) {
    await prisma.competitionEvent.update({
      where: { id: event.id },
      data: {
        metadata: {
          ...eventMeta,
          lastSyncedFieldCount: fieldData.players.length,
        } as Prisma.InputJsonValue,
      },
    });
    eventMeta.lastSyncedFieldCount = fieldData.players.length;
  }

  console.log(
    `[syncGolfParticipantField] event=${eventId} field=${fieldData.players.length} ` +
      `participantWrites=${participantsUpserted} newEventLinks=${eventLinksCreated} ` +
      `membershipChanged=${membershipChanged}`,
  );

  await maybeRunFieldHygiene(event.id, eventMeta, membershipChanged);
}
