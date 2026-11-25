import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, findMany, update, sendEmail } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: { findFirst, findMany, update },
  },
}));

vi.mock("../../lib/email/transport.js", () => ({
  sendEmail,
}));

import { claimLoginEmail, issueEmailClaim } from "./claimEmail.js";

function hashCode(userId: string, code: string): string {
  return createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

describe("email claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirst.mockResolvedValue(null);
    update.mockResolvedValue({});
    sendEmail.mockResolvedValue(undefined);
    process.env.PRIVY_APP_ID = "app";
    process.env.PRIVY_APP_SECRET = "secret";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));
  });

  it("stores a pending email and links Privy only after the mailed code", async () => {
    await issueEmailClaim("user-1", "Ada@Example.com");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ pendingEmail: "ada@example.com" }),
      }),
    );
    expect(fetch).not.toHaveBeenCalled();
    const html = sendEmail.mock.calls[0]?.[0].html as string;
    const code = html.match(/>(\d{6})</)?.[1];
    expect(code).toMatch(/^\d{6}$/);

    findMany.mockResolvedValue([
      {
        id: "user-1",
        privyUserId: "privy-1",
        email: null,
        verificationCode: hashCode("user-1", code!),
        verificationCodeExpiresAt: new Date(Date.now() + 60_000),
      },
    ]);
    await expect(claimLoginEmail("ada@example.com", code!)).resolves.toEqual({
      email: "ada@example.com",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.privy.io/v1/users/privy-1/accounts",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body).toEqual({ type: "email", address: "ada@example.com" });
    expect(update).toHaveBeenLastCalledWith({
      where: { id: "user-1" },
      data: {
        email: "ada@example.com",
        pendingEmail: null,
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
    });
  });

  it("does not let a second user take an inbox that is already claimed", async () => {
    findFirst.mockResolvedValue({ id: "other" });
    await expect(issueEmailClaim("user-2", "ada@example.com")).rejects.toMatchObject({
      code: "EMAIL_ALREADY_BOUND",
    });
    expect(update).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("rejects the wrong code", async () => {
    findMany.mockResolvedValue([
      {
        id: "user-1",
        privyUserId: "privy-1",
        email: null,
        verificationCode: hashCode("user-1", "000000"),
        verificationCodeExpiresAt: new Date(Date.now() + 60_000),
      },
    ]);
    await expect(claimLoginEmail("ada@example.com", "123456")).rejects.toMatchObject({
      status: 400,
      message: "Invalid or expired code",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
