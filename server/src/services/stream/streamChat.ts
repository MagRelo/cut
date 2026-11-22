import { StreamClient } from "@stream-io/node-sdk";
import { prisma } from "../../lib/prisma.js";

const CHANNEL_TYPE = "messaging";
const MESSAGE_LIMIT = 50;

export type RoomAudience = "humans" | "bots";
export type RoomType = "league" | "direct";
export type RoomRef = { type: RoomType; id: string };
export type RoomAttachmentType = "image" | "video" | "audio" | "file";
export type RoomAttachmentInput = { type: RoomAttachmentType; url: string; name?: string };
export type RoomAttachment = {
  type: RoomAttachmentType;
  url: string;
  thumbUrl: string | null;
  name: string | null;
};
export type RoomFile = { data: Uint8Array; filename: string; mimeType: string };

export type RoomMessage = {
  id: string;
  text: string;
  userId: string;
  audience: RoomAudience;
  kind: string | null;
  createdAt: string;
  attachments: RoomAttachment[];
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

export class StreamMessageInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamMessageInvalidError";
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

const ATTACHMENT_TYPES = new Set<RoomAttachmentType>(["image", "video", "audio", "file"]);
const MAX_ATTACHMENTS = 10;

function attachmentTypeOf(value: string | undefined, imageUrl: string | undefined): RoomAttachmentType {
  if (value && ATTACHMENT_TYPES.has(value as RoomAttachmentType)) return value as RoomAttachmentType;
  return imageUrl ? "image" : "file";
}

function readAttachments(raw: unknown): RoomAttachment[] {
  if (!Array.isArray(raw)) return [];
  const rows: RoomAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as {
      type?: string;
      image_url?: string;
      asset_url?: string;
      thumb_url?: string;
      title?: string;
      fallback?: string;
    };
    const type = attachmentTypeOf(row.type, row.image_url);
    const url = (type === "image" ? row.image_url || row.asset_url : row.asset_url || row.image_url) ?? "";
    if (!url) continue;
    rows.push({
      type,
      url,
      thumbUrl: row.thumb_url ?? null,
      name: row.title || row.fallback || null,
    });
  }
  return rows;
}

function roomMessage(message: {
  id?: string;
  text?: string;
  created_at?: Date | string;
  custom?: Record<string, unknown>;
  attachments?: unknown;
  user?: { id?: string };
}): RoomMessage | null {
  const attachments = readAttachments(message.attachments);
  const text = typeof message.text === "string" ? message.text : attachments.length > 0 ? "" : null;
  if (!message.id || text === null || !message.created_at) return null;
  const audience = message.custom?.audience === "bots" ? "bots" : "humans";
  const kind = typeof message.custom?.kind === "string" ? message.custom.kind : null;
  const createdAt =
    message.created_at instanceof Date
      ? message.created_at.toISOString()
      : new Date(message.created_at).toISOString();
  return {
    id: message.id,
    text,
    userId: message.user?.id ?? "",
    audience,
    kind,
    createdAt,
    attachments,
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

function safeFilename(name: string): string {
  const cleaned = name.replace(/["\r\n\\]/g, "").trim();
  return cleaned || "file";
}

function mimeKind(mime: string): RoomAttachmentType {
  if (mime.startsWith("image/") && mime !== "image/vnd.adobe.photoshop") return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

function linkAttachment(input: RoomAttachmentInput) {
  const custom = {};
  if (input.type === "image") {
    return {
      type: "image" as const,
      image_url: input.url,
      ...(input.name ? { fallback: input.name } : {}),
      custom,
    };
  }
  return {
    type: input.type,
    asset_url: input.url,
    ...(input.name ? { title: input.name } : {}),
    custom,
  };
}

type LeagueChannel = Awaited<ReturnType<typeof openLeagueChannel>>;

async function uploadFiles(channel: LeagueChannel, userId: string, files: RoomFile[]) {
  const attachments = [];
  for (const file of files) {
    const mime = file.mimeType.trim().toLowerCase() || "application/octet-stream";
    const kind = mimeKind(mime);
    const blob = new File([new Uint8Array(file.data)], safeFilename(file.filename), { type: mime });
    const request = { file: blob as unknown as string, user: { id: userId } };
    const uploaded =
      kind === "image" ? await channel.uploadChannelImage(request) : await channel.uploadChannelFile(request);
    if (!uploaded.file) throw new Error("Stream chat returned no file");
    const custom = {};
    attachments.push(
      kind === "image"
        ? {
            type: "image" as const,
            image_url: uploaded.file,
            ...(uploaded.thumb_url ? { thumb_url: uploaded.thumb_url } : {}),
            fallback: blob.name,
            custom,
          }
        : {
            type: kind,
            asset_url: uploaded.file,
            ...(uploaded.thumb_url ? { thumb_url: uploaded.thumb_url } : {}),
            title: blob.name,
            custom,
          },
    );
  }
  return attachments;
}

function assertContent(input: { text: string; attachments?: RoomAttachmentInput[]; files?: RoomFile[] }): void {
  const count = (input.attachments?.length ?? 0) + (input.files?.length ?? 0);
  if (count > MAX_ATTACHMENTS) throw new StreamMessageInvalidError("Too many attachments");
  if (!input.text && count === 0) {
    throw new StreamMessageInvalidError("Message text or an attachment is required");
  }
  if (input.files?.some((file) => file.data.byteLength === 0)) {
    throw new StreamMessageInvalidError("File is empty");
  }
}

async function openDirectChannel(userId: string, peerId: string, audience: RoomAudience) {
  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    select: { id: true, name: true },
  });
  if (!peer) throw new StreamUserMissingError();
  if (audience === "bots") {
    const delegate = await prisma.botDelegate.findFirst({
      where: { userId: peerId, status: "active" },
      select: { id: true },
    });
    if (!delegate) throw new StreamPeerUnavailableError();
  }
  const client = streamClient();
  await client.upsertUsers(await namedUsers([userId, peerId]));
  const channel = client.chat.channel(CHANNEL_TYPE);
  await channel.getOrCreate({
    data: {
      created_by_id: userId,
      members: [{ user_id: userId }, { user_id: peerId }],
      custom: { room: "direct" },
    },
  });
  return channel;
}

async function openRoom(userId: string, room: RoomRef, audience: RoomAudience) {
  if (room.type === "league") {
    await requireLeagueMember(userId, room.id);
    return openLeagueChannel(room.id, userId);
  }
  return openDirectChannel(userId, room.id, audience);
}

async function requireLeagueMember(userId: string, userGroupId: string): Promise<void> {
  const member = await prisma.userGroupMember.findUnique({
    where: { userId_userGroupId: { userId, userGroupId } },
    select: { userId: true },
  });
  if (!member) throw new StreamLeagueMissingError();
}

export async function postMessage(input: {
  userId: string;
  room: RoomRef;
  text: string;
  audience: RoomAudience;
  kind?: string;
  attachments?: RoomAttachmentInput[];
  files?: RoomFile[];
}): Promise<RoomMessage> {
  if (!isStreamChatEnabled()) throw new StreamDisabledError();
  assertContent(input);
  const channel = await openRoom(input.userId, input.room, input.audience);
  const attachments = [
    ...(input.attachments ?? []).map(linkAttachment),
    ...(await uploadFiles(channel, input.userId, input.files ?? [])),
  ];
  const sent = await channel.sendMessage({
    skip_push: input.audience === "bots",
    message: {
      text: input.text,
      user_id: input.userId,
      custom: customOf(input),
      ...(attachments.length > 0 ? { attachments } : {}),
    },
  });
  const row = roomMessage(sent.message);
  if (!row) throw new Error("Stream chat returned an unreadable message");
  return row;
}

export async function listMessages(input: {
  userId: string;
  room: RoomRef;
  limit: number;
  audience?: RoomAudience;
}): Promise<RoomMessage[]> {
  if (!isStreamChatEnabled()) throw new StreamDisabledError();
  if (input.room.type === "league") {
    await requireLeagueMember(input.userId, input.room.id);
    const channel = streamClient().chat.channel(CHANNEL_TYPE, leagueChannelId(input.room.id));
    try {
      const state = await channel.get({ state: true, messages_limit: input.limit });
      return recent(state.messages, input.audience, input.limit);
    } catch (error) {
      if (isMissingChannel(error)) return [];
      throw error;
    }
  }
  const peer = await prisma.user.findUnique({
    where: { id: input.room.id },
    select: { id: true },
  });
  if (!peer) throw new StreamUserMissingError();
  const found = await streamClient().chat.queryChannels({
    filter_conditions: {
      type: CHANNEL_TYPE,
      member_count: 2,
      "custom.room": "direct",
      members: { $in: [input.userId] },
      $and: [{ members: { $in: [input.room.id] } }],
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
