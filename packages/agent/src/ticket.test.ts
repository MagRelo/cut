import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { ticketFieldsSchema } from "./contract.js";
import { assertTicketAuthorization, kernelSignTypedData, ticketDigest } from "./ticket.js";

const WALLET = getAddress("0x1111111111111111111111111111111111111111");

const TICKET = {
  partyA: "Ada",
  partyB: "",
  proposition: "Scottie wins",
  partyAPosition: "yes",
  partyBPosition: "no",
  partyAStake: "1000000",
  partyBStake: "1000000",
  total: "2000000",
  price: "even",
  terms: "Sunday",
};

describe("ticket fields", () => {
  it("rejects a total that is not the two stakes", () => {
    const parsed = ticketFieldsSchema.safeParse({ ...TICKET, total: "1" });
    expect(parsed.success).toBe(false);
  });

  it("hashes numeric and string stakes the same way", () => {
    const parsed = ticketFieldsSchema.parse({ ...TICKET, partyAStake: 1_000_000, partyBStake: 1_000_000, total: 2_000_000 });
    expect(ticketDigest(parsed, 8453)).toBe(ticketDigest(TICKET, 8453));
  });
});

describe("assertTicketAuthorization", () => {
  it("accepts the Kernel wrap of this ticket", () => {
    const hash = ticketDigest(TICKET, 8453);
    expect(() =>
      assertTicketAuthorization({
        authorization: {
          method: "POST",
          url: "https://api.privy.io/v1/wallets/wallet/rpc",
          body: {
            method: "eth_signTypedData_v4",
            params: { typed_data: kernelSignTypedData(hash, 8453, WALLET) },
          },
        },
        fields: TICKET,
        chainId: 8453,
        smartWallet: WALLET,
      }),
    ).not.toThrow();
  });
});
