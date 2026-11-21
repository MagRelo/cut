import { parseGolfEventMetadata, PGA_GOLF_SPORT_ID } from "@cut/sport-pga-golf";
import { prisma } from "../lib/prisma.js";
import {
  chooseOddsBoard,
  EventOddsUnavailableError,
  fetchLiveOddsBoard,
  fetchPreTournamentOddsBoard,
  type EventOddsBoard,
  type EventOddsPlayer,
  type EventOddsSource,
} from "./pga-golf/datagolf/eventOdds.js";
import {
  dataGolfTourFromEnv,
  fetchDataGolfFieldUpdates,
  type DataGolfFieldRow,
} from "./pga-golf/datagolf/fieldUpdates.js";
import { eventNamesMatch } from "./pga-golf/datagolf/outrightOdds.js";

export type EventOddsRow = EventOddsPlayer & {
  pgaTourId: string | null;
  eventParticipantId: string | null;
  participantId: string | null;
};

export type EventOdds = {
  source: EventOddsSource;
  eventName: string;
  updatedAt: string;
  deadHeats: boolean;
  players: EventOddsRow[];
};

type FieldPlayer = {
  eventParticipantId: string;
  participantId: string;
  externalId: string | null;
};

export function dgIdToPgaTourId(field: DataGolfFieldRow[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const row of field) {
    if (typeof row.dg_id !== "number" || typeof row.player_num !== "number") continue;
    map.set(row.dg_id, String(row.player_num));
  }
  return map;
}

export function attachPlayerIds(players: EventOddsPlayer[], field: FieldPlayer[], dgToPga: Map<number, string>): EventOddsRow[] {
  const byPga = new Map<string, FieldPlayer>();
  for (const player of field) {
    const id = player.externalId?.trim();
    if (id && !byPga.has(id)) byPga.set(id, player);
  }
  return players.map((player) => {
    const pgaTourId = player.dgId == null ? null : (dgToPga.get(player.dgId) ?? null);
    const match = pgaTourId ? byPga.get(pgaTourId) : undefined;
    return {
      ...player,
      pgaTourId,
      eventParticipantId: match?.eventParticipantId ?? null,
      participantId: match?.participantId ?? null,
    };
  });
}

async function fieldMap(eventName: string): Promise<Map<number, string>> {
  try {
    const field = await fetchDataGolfFieldUpdates(dataGolfTourFromEnv());
    if (!eventNamesMatch(field.event_name, eventName)) return new Map();
    return dgIdToPgaTourId(field.field);
  } catch {
    return new Map();
  }
}

function withIds(board: EventOddsBoard, players: EventOddsRow[]): EventOdds {
  return {
    source: board.source,
    eventName: board.eventName,
    updatedAt: board.updatedAt,
    deadHeats: board.deadHeats,
    players,
  };
}

export async function loadEventOdds(
  eventId: string,
): Promise<{ ok: true; odds: EventOdds } | { ok: false; status: 404 | 503; error: string }> {
  const event = await prisma.competitionEvent.findUnique({
    where: { id: eventId },
    select: {
      sportId: true,
      metadata: true,
      participants: {
        select: {
          id: true,
          participantId: true,
          participant: { select: { externalId: true } },
        },
      },
    },
  });
  if (!event) return { ok: false, status: 404, error: "Event not found" };
  if (event.sportId !== PGA_GOLF_SPORT_ID) {
    return { ok: false, status: 404, error: "Odds are not available for this event" };
  }
  const meta = parseGolfEventMetadata(event.metadata);
  const eventName = meta?.name?.trim() ?? "";
  if (!eventName) return { ok: false, status: 404, error: "Odds are not available for this event" };

  const read = async (load: () => Promise<EventOddsBoard | null>): Promise<EventOddsBoard | null> => {
    try {
      return await load();
    } catch (error) {
      if (error instanceof EventOddsUnavailableError) throw error;
      console.warn("[event-odds]", error instanceof Error ? error.message : error);
      return null;
    }
  };

  let live: EventOddsBoard | null = null;
  let pre: EventOddsBoard | null = null;
  try {
    live = await read(fetchLiveOddsBoard);
    if (!chooseOddsBoard(eventName, live, null)) {
      pre = await read(fetchPreTournamentOddsBoard);
    }
  } catch (error) {
    if (error instanceof EventOddsUnavailableError) {
      return { ok: false, status: 503, error: "Odds are not available" };
    }
    console.error("Error fetching event odds:", error);
    return { ok: false, status: 503, error: "Odds are not available" };
  }

  const board = chooseOddsBoard(eventName, live, pre);
  if (!board) {
    if (!live && !pre) return { ok: false, status: 503, error: "Odds are not available" };
    return { ok: false, status: 404, error: "Odds are not available for this event" };
  }

  const ids = attachPlayerIds(
    board.players,
    event.participants.map((row) => ({
      eventParticipantId: row.id,
      participantId: row.participantId,
      externalId: row.participant.externalId,
    })),
    await fieldMap(eventName),
  );
  return { ok: true, odds: withIds(board, ids) };
}
