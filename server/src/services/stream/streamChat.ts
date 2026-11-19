import { StreamClient } from "@stream-io/node-sdk";
import { prisma } from "../../lib/prisma.js";

const CHANNEL_TYPE = "messaging";
const MESSAGE_LIMIT = 50;

export type RoomAudience = "humans" | "bots";

export type RoomMessage = {
  id: string;
  text: string;
  userId: string;
  audience: RoomAudience;
  kind: string | null;
  createdAt: string;
};

export class StreamDisabledError extends Error {
  readonly code = "stream_disabled" as const;
  constructor() {
    super("Stream chat is not configured");
    this.name = "StreamDisabledError";
  }
}

export class StreamLeagueMissingError extends Error {
  readonly code = "league_not_found" as const;
  constructor() {
    super("League not found");
    this.name = "StreamLeagueMissingError";
  }
}

export class StreamUserMissingError extends Error {
  readonly code = "user_not_found" as const;
  constructor() {
    super("User not found");
    this.name = "StreamUserMissingError";
  }
}

export class StreamPeerUnavailableError extends Error {
  readonly code = "delegate_required" as const;
  constructor() {
    super("That account has no active delegate");
    this.name = "StreamPeerUnavailableError";
  }
}

export function isStreamChatEnabled(): boolean {
  return Boolean(process.env.STREAM_API_KEY?.trim() && process.env.STREAM_API_SECRET?.trim());
}

export function leagueChannelId(userGroupId: string): string {
  return `league-${userGroupId}`;
}

let cached: StreamClient | null = null;

function streamClient(): StreamClient {
  if (!isStreamChatEnabled()) throw new StreamDisabledError();
  if (!cached) {
    cached = new StreamClient(process.env.STREAM_API_KEY!.trim(), process.env.STREAM_API_SECRET!.trim(), {
      timeout: 10_000,
    });
  }
  return cached;
}

function isMissingChannel(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? error.code : undefined;
  const status =
    "metadata" in error && error.metadata && typeof error.metadata === "object"
      ? (error.metadata as { responseCode?: number }).responseCode
      : undefined;
  return status === 404 || code === 16;
}

async function quietly(label: string, fn: () => Promise<void>): Promise<void> {
  if (!isStreamChatEnabled()) return;
  try {
    await fn();
  } catch (error) {
    console.error(`[stream-chat] ${label}:`, error);
  }
}

async function namedUsers(ids: string[]): Promise<{ id: string; name?: string }[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const rows = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });
  const byId = new Map(rows.map((row) => [row.id, row.name]));
  return unique.map((id) => {
    const name = byId.get(id);
    return name ? { id, name } : { id };
  });
}

function customOf(input: { audience: RoomAudience; kind?: string }): Record<string, string> {
  return input.kind ? { audience: input.audience, kind: input.kind } : { audience: input.audience };
}

function roomMessage(message: {
  id?: string;
  text?: string;
  created_at?: Date | string;
  custom?: Record<string, unknown>;
  user?: { id?: string };
}): RoomMessage | null {
  if (!message.id || typeof message.text !== "string" || !message.created_at) return null;
  const audience = message.custom?.audience === "bots" ? "bots" : "humans";
  const kind = typeof message.custom?.kind === "string" ? message.custom.kind : null;
  const createdAt =
    message.created_at instanceof Date
      ? message.created_at.toISOString()
      : new Date(message.created_at).toISOString();
  return {
    id: message.id,
    text: message.text,
    userId: message.user?.id ?? "",
    audience,
    kind,
    createdAt,
  };
}

function recent(
  messages: Parameters<typeof roomMessage>[0][] | undefined,
  audience: RoomAudience | undefined,
  limit: number,
): RoomMessage[] {
  const rows: RoomMessage[] = [];
  for (const message of messages ?? []) {
    const row = roomMessage(message);
    if (!row) continue;
    if (audience && row.audience !== audience) continue;
    rows.push(row);
  }
  return rows.slice(-limit).reverse();
}

export async function syncLeagueCreated(input: {
  userGroupId: string;
  userId: string;
  name: string;
}): Promise<void> {
  await quietly("create league channel", async () => {
    const client = streamClient();
    await client.upsertUsers(await namedUsers([input.userId]));
    await client.chat.channel(CHANNEL_TYPE, leagueChannelId(input.userGroupId)).getOrCreate({
      data: {
        created_by_id: input.userId,
        members: [{ user_id: input.userId }],
        custom: { room: "league", userGroupId: input.userGroupId, name: input.name },
      },
    });
  });
}

export async function syncLeagueMemberAdded(userGroupId: string, userId: string): Promise<void> {
  await quietly("add league member", async () => {
    const client = streamClient();
    await client.upsertUsers(await namedUsers([userId]));
    const channel = client.chat.channel(CHANNEL_TYPE, leagueChannelId(userGroupId));
    try {
      await channel.update({ add_members: [{ user_id: userId }] });
    } catch (error) {
      if (!isMissingChannel(error)) throw error;
      await channel.getOrCreate({
        data: {
          created_by_id: userId,
          members: [{ user_id: userId }],
          custom: { room: "league", userGroupId },
        },
      });
    }
  });
}

export async function syncLeagueMemberRemoved(userGroupId: string, userId: string): Promise<void> {
  await quietly("remove league member", async () => {
    const channel = streamClient().chat.channel(CHANNEL_TYPE, leagueChannelId(userGroupId));
    try {
      await channel.update({ remove_members: [userId] });
    } catch (error) {
      if (!isMissingChannel(error)) throw error;
    }
  });
}

export async function syncLeagueDeleted(userGroupId: string): Promise<void> {
  await quietly("delete league channel", async () => {
    const channel = streamClient().chat.channel(CHANNEL_TYPE, leagueChannelId(userGroupId));
    try {
      await channel.delete({ hard_delete: true });
    } catch (error) {
      if (!isMissingChannel(error)) throw error;
    }
  });
}

async function openLeagueChannel(userGroupId: string, userId: string) {
  const client = streamClient();
  await client.upsertUsers(await namedUsers([userId]));
  const channel = client.chat.channel(CHANNEL_TYPE, leagueChannelId(userGroupId));
  await channel.getOrCreate({
    data: {
      created_by_id: userId,
      members: [{ user_id: userId }],
      custom: { room: "league", userGroupId },
    },
  });
  await channel.update({ add_members: [{ user_id: userId }] });
  return channel;
}

export async function postLeagueMessage(input: {
  userGroupId: string;
  userId: string;
  text: string;
  audience: RoomAudience;
  kind?: string;
}): Promise<RoomMessage> {
  if (!isStreamChatEnabled()) throw new StreamDisabledError();
  const member = await prisma.userGroupMember.findUnique({
    where: { userId_userGroupId: { userId: input.userId, userGroupId: input.userGroupId } },
    select: { userId: true },
  });
  if (!member) throw new StreamLeagueMissingError();
  const channel = await openLeagueChannel(input.userGroupId, input.userId);
  const sent = await channel.sendMessage({
    skip_push: input.audience === "bots",
    message: {
      text: input.text,
      user_id: input.userId,
      custom: customOf(input),
    },
  });
  const row = roomMessage(sent.message);
  if (!row) throw new Error("Stream chat returned an unreadable message");
  return row;
}

export async function listLeagueMessages(input: {
  userGroupId: string;
  userId: string;
  limit: number;
  audience?: RoomAudience;
}): Promise<RoomMessage[]> {
  if (!isStreamChatEnabled()) throw new StreamDisabledError();
  const member = await prisma.userGroupMember.findUnique({
    where: { userId_userGroupId: { userId: input.userId, userGroupId: input.userGroupId } },
    select: { userId: true },
  });
  if (!member) throw new StreamLeagueMissingError();
  const channel = streamClient().chat.channel(CHANNEL_TYPE, leagueChannelId(input.userGroupId));
  try {
    const state = await channel.get({ state: true, messages_limit: input.limit });
    return recent(state.messages, input.audience, input.limit);
  } catch (error) {
    if (isMissingChannel(error)) return [];
    throw error;
  }
}

export async function postDirectMessage(input: {
  userId: string;
  peerId: string;
  text: string;
  audience: RoomAudience;
  kind?: string;
}): Promise<RoomMessage> {
  if (!isStreamChatEnabled()) throw new StreamDisabledError();
  const peer = await prisma.user.findUnique({
    where: { id: input.peerId },
    select: { id: true, name: true },
  });
  if (!peer) throw new StreamUserMissingError();
  if (input.audience === "bots") {
    const delegate = await prisma.botDelegate.findFirst({
      where: { userId: input.peerId, status: "active" },
      select: { id: true },
    });
    if (!delegate) throw new StreamPeerUnavailableError();
  }
  const client = streamClient();
  await client.upsertUsers(await namedUsers([input.userId, input.peerId]));
  const channel = client.chat.channel(CHANNEL_TYPE);
  await channel.getOrCreate({
    data: {
      created_by_id: input.userId,
      members: [{ user_id: input.userId }, { user_id: input.peerId }],
      custom: { room: "direct" },
    },
  });
  const sent = await channel.sendMessage({
    skip_push: input.audience === "bots",
    message: {
      text: input.text,
      user_id: input.userId,
      custom: customOf(input),
    },
  });
  const row = roomMessage(sent.message);
  if (!row) throw new Error("Stream chat returned an unreadable message");
  return row;
}

export async function listDirectMessages(input: {
  userId: string;
  peerId: string;
  limit: number;
  audience?: RoomAudience;
}): Promise<RoomMessage[]> {
  if (!isStreamChatEnabled()) throw new StreamDisabledError();
  const peer = await prisma.user.findUnique({
    where: { id: input.peerId },
    select: { id: true },
  });
  if (!peer) throw new StreamUserMissingError();
  const found = await streamClient().chat.queryChannels({
    filter_conditions: {
      type: CHANNEL_TYPE,
      member_count: 2,
      "custom.room": "direct",
      members: { $in: [input.userId] },
      $and: [{ members: { $in: [input.peerId] } }],
    },
    message_limit: input.limit,
    limit: 1,
    state: true,
    user_id: input.userId,
  });
  return recent(found.channels[0]?.messages, input.audience, input.limit);
}

export function clampMessageLimit(raw: string | undefined): number {
  if (!raw) return MESSAGE_LIMIT;
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > MESSAGE_LIMIT) {
    throw new Error("limit must be an integer from 1 to 50");
  }
  return limit;
}
