import { describe, expect, it } from "vitest";
import { assembleUserTransactions } from "./getUserTransactions.js";

const TOKEN = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const ONE = "1000000000000000000";

describe("assembleUserTransactions", () => {
  it("keeps a free lineup and replaces a paid lineup that has an entry transfer", () => {
    const rows = assembleUserTransactions(
      [
        lineup("free-lineup", "2026-01-01T00:00:00.000Z", 0),
        lineup("paid-lineup", "2026-01-02T00:00:00.000Z", 10),
      ],
      [],
      [
        payment({
          id: "entry-1",
          kind: "ENTRY",
          createdAt: "2026-01-02T00:00:01.000Z",
          metadata: { lineupId: "paid-lineup", direction: "out" },
        }),
      ],
    );

    const entries = rows.filter((row) => row.type === "CONTEST_ENTRY");
    expect(entries.map((row) => row.id)).toEqual([
      "CONTEST_ENTRY:entry-1",
      "CONTEST_ENTRY:free-lineup",
    ]);
    expect(entries.find((row) => row.id.endsWith("free-lineup"))?.amount).toBe(0);
    expect(entries.find((row) => row.id.endsWith("entry-1"))?.amount).toBe(-1);
  });

  it("uses wager rows and keeps a buy that has no payment yet", () => {
    const rows = assembleUserTransactions(
      [],
      [
        prediction("pred-old", "4", "2026-01-01T00:00:00.000Z"),
        prediction("pred-new", "9", "2026-01-03T00:00:00.000Z"),
      ],
      [
        payment({
          id: "wager-1",
          kind: "WAGER",
          createdAt: "2026-01-03T00:00:01.000Z",
          metadata: { entryId: "9", direction: "out" },
        }),
      ],
    );

    expect(rows.map((row) => row.id)).toEqual(["PREDICTION_BUY:wager-1", "PREDICTION_BUY:pred-old"]);
    expect(rows[0]?.amount).toBe(-1);
  });

  it("adds send, withdraw, and refund without relabeling a payout", () => {
    const rows = assembleUserTransactions(
      [],
      [],
      [
        payment({
          id: "send-1",
          kind: "SEND",
          createdAt: "2026-01-04T00:00:00.000Z",
          contestId: null,
          metadata: { direction: "out", counterparty: "0xabc" },
        }),
        payment({
          id: "withdraw-1",
          kind: "WITHDRAW",
          createdAt: "2026-01-03T00:00:00.000Z",
          metadata: { direction: "in" },
        }),
        payment({
          id: "refund-1",
          kind: "REFUND",
          createdAt: "2026-01-02T00:00:00.000Z",
          metadata: { direction: "in" },
        }),
        payment({
          id: "payout-1",
          kind: "PRIMARY",
          createdAt: "2026-01-01T00:00:00.000Z",
          metadata: {},
        }),
      ],
    );

    expect(rows.map((row) => [row.type, row.amount])).toEqual([
      ["SEND", -1],
      ["WITHDRAW", 1],
      ["REFUND", 1],
      ["PAYOUT_PRIMARY", 1],
    ]);
    expect(rows[0]?.detail).toBe("To 0xabc");
  });
});

function lineup(id: string, createdAt: string, primaryDeposit: number) {
  return {
    id,
    createdAt: new Date(createdAt),
    contestId: "contest-1",
    contest: {
      id: "contest-1",
      address: "0x1111111111111111111111111111111111111111",
      name: "Open",
      chainId: 84532,
      settings: { primaryDeposit },
    },
  };
}

function prediction(id: string, entryId: string, createdAt: string) {
  return {
    id,
    createdAt: new Date(createdAt),
    entryId,
    amountWei: ONE,
    lastTransactionHash: null,
    chainId: 84532,
    contestId: "contest-1",
    contest: {
      id: "contest-1",
      address: "0x1111111111111111111111111111111111111111",
      name: "Open",
      chainId: 84532,
    },
  };
}

function payment(input: {
  id: string;
  kind: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  contestId?: string | null;
}) {
  return {
    id: input.id,
    kind: input.kind,
    amountWei: ONE,
    transactionHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    tokenAddress: TOKEN,
    chainId: 84532,
    createdAt: new Date(input.createdAt),
    contestId: input.contestId === undefined ? "contest-1" : input.contestId,
    metadata: input.metadata,
    contest:
      input.contestId === null
        ? null
        : {
            id: "contest-1",
            address: "0x1111111111111111111111111111111111111111",
            name: "Open",
          },
  };
}
