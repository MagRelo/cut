import { encodeAbiParameters, encodeEventTopics, type Hex } from "viem";
import { describe, expect, it } from "vitest";
import { findTransferLog, type TransferReceiptLog } from "./chainTransfer";

const TRANSFER = {
  type: "event",
  name: "Transfer",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
} as const;

const TOKEN = "0x1111111111111111111111111111111111111111" as const;
const FROM = "0x2222222222222222222222222222222222222222" as const;
const TO = "0x3333333333333333333333333333333333333333" as const;

function transferLog(value: bigint, logIndex: number | null, to: Hex = TO): TransferReceiptLog {
  return {
    address: TOKEN,
    topics: encodeEventTopics({
      abi: [TRANSFER],
      eventName: "Transfer",
      args: { from: FROM, to },
    }),
    data: encodeAbiParameters([{ type: "uint256" }], [value]),
    logIndex,
  };
}

describe("findTransferLog", () => {
  it("returns the log index and value when from, to, and amount match", () => {
    const found = findTransferLog([transferLog(50n, 4), transferLog(10n, 7)], {
      tokenAddress: TOKEN,
      from: FROM,
      to: TO,
      amountWei: "10",
    });
    expect(found).toEqual({ logIndex: 7, amountWei: "10" });
  });

  it("uses the only from/to transfer when the amount is not known yet", () => {
    const found = findTransferLog([transferLog(80n, 2)], {
      tokenAddress: TOKEN,
      from: FROM,
      to: TO,
    });
    expect(found).toEqual({ logIndex: 2, amountWei: "80" });
  });

  it("ignores a transfer to someone else and refuses two unmarked matches", () => {
    const other = "0x4444444444444444444444444444444444444444" as const;
    expect(
      findTransferLog([transferLog(80n, 2), transferLog(90n, 3, other)], {
        tokenAddress: TOKEN,
        from: FROM,
        to: TO,
      }),
    ).toEqual({ logIndex: 2, amountWei: "80" });
    expect(
      findTransferLog([transferLog(80n, 2), transferLog(90n, 3)], {
        tokenAddress: TOKEN,
        from: FROM,
        to: TO,
      }),
    ).toBeNull();
  });

  it("returns null without a log index or a matching amount", () => {
    expect(
      findTransferLog([transferLog(10n, null)], {
        tokenAddress: TOKEN,
        from: FROM,
        to: TO,
        amountWei: "10",
      }),
    ).toBeNull();
    expect(
      findTransferLog([transferLog(10n, 1)], {
        tokenAddress: TOKEN,
        from: FROM,
        to: TO,
        amountWei: "11",
      }),
    ).toBeNull();
  });
});
