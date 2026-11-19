import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { upsertUsers, queryChannels, getOrCreate, update, sendMessage, get, channel } = vi.hoisted(
  () => ({
    upsertUsers: vi.fn(),
    queryChannels: vi.fn(),
    getOrCreate: vi.fn(),
    update: vi.fn(),
    sendMessage: vi.fn(),
    get: vi.fn(),
    channel: vi.fn(),
  }),
);

vi.mock("@stream-io/node-sdk", () => ({
  StreamClient: class {
    upsertUsers = upsertUsers;
    chat = { channel, queryChannels };
  },
}));

const { findMany, findUniqueUser, findMember, findDelegate } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUniqueUser: vi.fn(),
  findMember: vi.fn(),
  findDelegate: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: { findMany, findUnique: findUniqueUser },
    userGroupMember: { findUnique: findMember },
    botDelegate: { findFirst: findDelegate },
  },
}));

import { postDirectMessage, StreamPeerUnavailableError, syncLeagueMemberAdded } from "./streamChat.js";

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

    await postDirectMessage({
      userId: "user-1",
      peerId: "user-2",
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
      postDirectMessage({
        userId: "user-1",
        peerId: "user-2",
        text: "hello",
        audience: "bots",
      }),
    ).rejects.toBeInstanceOf(StreamPeerUnavailableError);
    expect(getOrCreate).not.toHaveBeenCalled();
  });
});
