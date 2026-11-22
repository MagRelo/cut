import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  upsertUsers,
  queryChannels,
  getOrCreate,
  update,
  sendMessage,
  get,
  uploadChannelImage,
  uploadChannelFile,
  channel,
} = vi.hoisted(() => ({
  upsertUsers: vi.fn(),
  queryChannels: vi.fn(),
  getOrCreate: vi.fn(),
  update: vi.fn(),
  sendMessage: vi.fn(),
  get: vi.fn(),
  uploadChannelImage: vi.fn(),
  uploadChannelFile: vi.fn(),
  channel: vi.fn(),
}));

vi.mock("@stream-io/node-sdk", () => ({
  StreamClient: class {
    upsertUsers = upsertUsers;
    chat = { channel, queryChannels };
  },
}));

const { findMany, findUniqueUser, findMember, findDelegate, findGroup } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUniqueUser: vi.fn(),
  findMember: vi.fn(),
  findDelegate: vi.fn(),
  findGroup: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: { findMany, findUnique: findUniqueUser },
    userGroup: { findUnique: findGroup },
    userGroupMember: { findUnique: findMember },
    botDelegate: { findFirst: findDelegate },
  },
}));

import {
  listMessages,
  observeLeagueMessages,
  postMessage,
  StreamLeagueMissingError,
  StreamPeerUnavailableError,
  syncLeagueMemberAdded,
} from "./streamChat.js";

describe("stream chat rooms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STREAM_API_KEY = "key";
    process.env.STREAM_API_SECRET = "secret";
    channel.mockImplementation((type: string, id?: string) => ({
      type,
      id,
      getOrCreate,
      update,
      sendMessage,
      get,
      uploadChannelImage,
      uploadChannelFile,
    }));
    findMany.mockResolvedValue([{ id: "user-1", name: "Ada" }]);
    update.mockResolvedValue({});
    getOrCreate.mockResolvedValue({ channel: { id: "!members-1" } });
    sendMessage.mockResolvedValue({
      message: {
        id: "msg-1",
        text: "hello",
        created_at: new Date("2026-11-19T12:00:00.000Z"),
        custom: { audience: "bots" },
        user: { id: "user-1" },
      },
    });
  });

  afterEach(() => {
    delete process.env.STREAM_API_KEY;
    delete process.env.STREAM_API_SECRET;
  });

  it("adds a joined member to the league channel", async () => {
    await syncLeagueMemberAdded("league-1", "user-1");

    expect(channel).toHaveBeenCalledWith("messaging", "league-league-1");
    expect(update).toHaveBeenCalledWith({ add_members: [{ user_id: "user-1" }] });
  });

  it("opens one distinct direct channel for the pair", async () => {
    findUniqueUser.mockResolvedValue({ id: "user-2", name: "Bea" });
    findDelegate.mockResolvedValue({ id: "delegate-1" });
    findMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) =>
      where.id.in.map((id: string) => ({ id, name: id })),
    );

    await postMessage({
      userId: "user-1",
      room: { type: "direct", id: "user-2" },
      text: "hello",
      audience: "bots",
    });

    expect(channel).toHaveBeenCalledTimes(1);
    expect(channel).toHaveBeenCalledWith("messaging");
    expect(getOrCreate).toHaveBeenCalledTimes(1);
    expect(getOrCreate).toHaveBeenCalledWith({
      data: {
        created_by_id: "user-1",
        members: [{ user_id: "user-1" }, { user_id: "user-2" }],
        custom: { room: "direct" },
      },
    });
  });

  it("rejects a bots direct message when the peer has no active delegate", async () => {
    findUniqueUser.mockResolvedValue({ id: "user-2", name: "Bea" });
    findDelegate.mockResolvedValue(null);

    await expect(
      postMessage({
        userId: "user-1",
        room: { type: "direct", id: "user-2" },
        text: "hello",
        audience: "bots",
      }),
    ).rejects.toBeInstanceOf(StreamPeerUnavailableError);
    expect(getOrCreate).not.toHaveBeenCalled();
  });

  it("lists the direct channel for both members", async () => {
    findUniqueUser.mockResolvedValue({ id: "user-2" });
    queryChannels.mockResolvedValue({
      channels: [
        {
          messages: [
            {
              id: "msg-1",
              text: "hello",
              created_at: new Date("2026-11-19T12:00:00.000Z"),
              custom: { audience: "humans" },
              user: { id: "user-2" },
            },
          ],
        },
      ],
    });

    await expect(
      listMessages({ userId: "user-1", room: { type: "direct", id: "user-2" }, limit: 20 }),
    ).resolves.toEqual([
      {
        id: "msg-1",
        text: "hello",
        userId: "user-2",
        audience: "humans",
        kind: null,
        createdAt: "2026-11-19T12:00:00.000Z",
        attachments: [],
      },
    ]);
    expect(queryChannels).toHaveBeenCalledWith({
      filter_conditions: {
        type: "messaging",
        member_count: 2,
        "custom.room": "direct",
        members: { $in: ["user-1"] },
        $and: [{ members: { $in: ["user-2"] } }],
      },
      message_limit: 20,
      limit: 1,
      state: true,
      user_id: "user-1",
    });
  });

  it("posts to the league channel for a member", async () => {
    findMember.mockResolvedValue({ userId: "user-1" });

    await postMessage({
      userId: "user-1",
      room: { type: "league", id: "league-1" },
      text: "hello",
      audience: "humans",
    });

    expect(channel).toHaveBeenCalledWith("messaging", "league-league-1");
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({ text: "hello", user_id: "user-1" }),
      }),
    );
    expect(uploadChannelImage).not.toHaveBeenCalled();
  });

  it("uploads an image and sends it as an attachment", async () => {
    findMember.mockResolvedValue({ userId: "user-1" });
    uploadChannelImage.mockResolvedValue({
      file: "https://cdn.example/meme.png",
      thumb_url: "https://cdn.example/meme-thumb.png",
    });
    sendMessage.mockImplementation(async (request: { message: { text: string; attachments?: unknown[] } }) => ({
      message: {
        id: "msg-1",
        text: request.message.text,
        created_at: new Date("2026-11-19T12:00:00.000Z"),
        custom: { audience: "humans" },
        user: { id: "user-1" },
        attachments: request.message.attachments,
      },
    }));

    await expect(
      postMessage({
        userId: "user-1",
        room: { type: "league", id: "league-1" },
        text: "",
        audience: "humans",
        files: [{ data: new Uint8Array([1, 2, 3]), filename: "meme.png", mimeType: "image/png" }],
      }),
    ).resolves.toMatchObject({
      text: "",
      attachments: [
        {
          type: "image",
          url: "https://cdn.example/meme.png",
          thumbUrl: "https://cdn.example/meme-thumb.png",
          name: "meme.png",
        },
      ],
    });

    const uploaded = uploadChannelImage.mock.calls[0]?.[0].file as File;
    expect(uploaded).toBeInstanceOf(File);
    expect(uploaded.name).toBe("meme.png");
    expect(uploadChannelFile).not.toHaveBeenCalled();
    expect(sendMessage.mock.calls[0]?.[0].message.attachments[0]).toMatchObject({
      type: "image",
      image_url: "https://cdn.example/meme.png",
      thumb_url: "https://cdn.example/meme-thumb.png",
    });
  });

  it("uploads a video through the file endpoint", async () => {
    findMember.mockResolvedValue({ userId: "user-1" });
    uploadChannelFile.mockResolvedValue({
      file: "https://cdn.example/clip.mp4",
      thumb_url: "https://cdn.example/clip-thumb.jpg",
    });

    await postMessage({
      userId: "user-1",
      room: { type: "league", id: "league-1" },
      text: "clip",
      audience: "humans",
      files: [{ data: new Uint8Array([1]), filename: "clip.mp4", mimeType: "video/mp4" }],
    });

    expect(uploadChannelImage).not.toHaveBeenCalled();
    expect(uploadChannelFile.mock.calls[0]?.[0].file).toBeInstanceOf(File);
    expect(sendMessage.mock.calls[0]?.[0].message.attachments[0]).toMatchObject({
      type: "video",
      asset_url: "https://cdn.example/clip.mp4",
      thumb_url: "https://cdn.example/clip-thumb.jpg",
      title: "clip.mp4",
    });
  });

  it("sends a link attachment without uploading", async () => {
    findMember.mockResolvedValue({ userId: "user-1" });

    await postMessage({
      userId: "user-1",
      room: { type: "league", id: "league-1" },
      text: "look",
      audience: "humans",
      attachments: [{ type: "image", url: "https://example.com/a.png", name: "a" }],
    });

    expect(uploadChannelImage).not.toHaveBeenCalled();
    expect(uploadChannelFile).not.toHaveBeenCalled();
    expect(sendMessage.mock.calls[0]?.[0].message.attachments[0]).toMatchObject({
      type: "image",
      image_url: "https://example.com/a.png",
      fallback: "a",
    });
  });

  it("reads image attachments from a league list", async () => {
    findMember.mockResolvedValue({ userId: "user-1" });
    get.mockResolvedValue({
      messages: [
        {
          id: "msg-1",
          text: "",
          created_at: new Date("2026-11-19T12:00:00.000Z"),
          custom: { audience: "humans" },
          user: { id: "user-1" },
          attachments: [
            {
              type: "image",
              image_url: "https://cdn.example/meme.png",
              thumb_url: "https://cdn.example/meme-thumb.png",
              fallback: "meme.png",
            },
          ],
        },
      ],
    });

    await expect(
      listMessages({ userId: "user-1", room: { type: "league", id: "league-1" }, limit: 10 }),
    ).resolves.toEqual([
      {
        id: "msg-1",
        text: "",
        userId: "user-1",
        audience: "humans",
        kind: null,
        createdAt: "2026-11-19T12:00:00.000Z",
        attachments: [
          {
            type: "image",
            url: "https://cdn.example/meme.png",
            thumbUrl: "https://cdn.example/meme-thumb.png",
            name: "meme.png",
          },
        ],
      },
    ]);
  });

  it("reads a league channel without membership or joining", async () => {
    findGroup.mockResolvedValue({ id: "league-1", name: "Sunday" });
    findMany.mockResolvedValue([{ id: "user-2", name: "Bea" }]);
    get.mockResolvedValue({
      messages: [
        {
          id: "msg-old",
          text: "earlier",
          created_at: new Date("2026-11-19T11:00:00.000Z"),
          custom: { audience: "humans" },
          user: { id: "user-2" },
        },
        {
          id: "msg-new",
          text: "later",
          created_at: new Date("2026-11-19T12:00:00.000Z"),
          custom: { audience: "bots", kind: "lineup" },
          user: { id: "missing-user" },
        },
      ],
    });

    await expect(observeLeagueMessages("league-1", 10)).resolves.toEqual({
      league: { id: "league-1", name: "Sunday" },
      messages: [
        {
          id: "msg-old",
          text: "earlier",
          userId: "user-2",
          userName: "Bea",
          audience: "humans",
          kind: null,
          createdAt: "2026-11-19T11:00:00.000Z",
          attachments: [],
        },
        {
          id: "msg-new",
          text: "later",
          userId: "missing-user",
          userName: null,
          audience: "bots",
          kind: "lineup",
          createdAt: "2026-11-19T12:00:00.000Z",
          attachments: [],
        },
      ],
    });
    expect(findMember).not.toHaveBeenCalled();
    expect(getOrCreate).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(upsertUsers).not.toHaveBeenCalled();
    expect(channel).toHaveBeenCalledWith("messaging", "league-league-1");
  });

  it("returns an empty transcript when the league channel does not exist", async () => {
    findGroup.mockResolvedValue({ id: "league-1", name: "Sunday" });
    get.mockRejectedValue({ code: 16 });

    await expect(observeLeagueMessages("league-1", 10)).resolves.toEqual({
      league: { id: "league-1", name: "Sunday" },
      messages: [],
    });
  });

  it("refuses an unknown league before contacting Stream", async () => {
    findGroup.mockResolvedValue(null);

    await expect(observeLeagueMessages("missing", 10)).rejects.toBeInstanceOf(
      StreamLeagueMissingError,
    );
    expect(channel).not.toHaveBeenCalled();
  });
});
