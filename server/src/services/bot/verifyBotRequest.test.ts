import { BoundedMemoryNonceStore, signRequest, type EthHttpSigner } from "@slicekit/erc8128";
import { createCutAgent } from "@playthecut/agent";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it, vi } from "vitest";
import { verifyBotRequest, type VerifyBotRequestDeps } from "./verifyBotRequest.js";

const key = generatePrivateKey();
const account = privateKeyToAccount(key);
const WALLET = "0x1111111111111111111111111111111111111111" as const;

function signer(chainId = 8453): EthHttpSigner {
  return {
    chainId,
    address: account.address,
    signMessage: (message) => account.signMessage({ message: { raw: message } }),
  };
}

function deps(partial: Partial<VerifyBotRequestDeps> = {}): VerifyBotRequestDeps {
  return {
    getCode: async () => "0x",
    verifySmartAccount: vi.fn(async () => false),
    nonceStore: new BoundedMemoryNonceStore(),
    now: () => 1_700_000_000,
    ...partial,
  };
}

describe("verifyBotRequest", () => {
  it("accepts a request-bound signature", async () => {
    const request = await signRequest(
      "https://playthecut.com/api/bot/contests?chainId=8453&smartWallet=" + WALLET,
      signer(),
      { created: 1_700_000_000, expires: 1_700_000_060 },
    );
    const result = await verifyBotRequest(request, deps());
    expect(result).toMatchObject({ ok: true, chainId: 8453, signer: account.address });
  });

  it("accepts a signature from @playthecut/agent", async () => {
    let captured: Request | undefined;
    const agent = createCutAgent({
      privateKey: key,
      smartWallet: WALLET,
      origin: "https://playthecut.com",
      fetch: async (request) => {
        captured = request.clone();
        return new Response(JSON.stringify({ contests: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });
    await agent.contests();
    expect(captured!.headers.get("signature-input")).toContain(
      `keyid="eip155:8453:${account.address.toLowerCase()}"`,
    );
    const now = Math.floor(Date.now() / 1000);
    const result = await verifyBotRequest(captured!, deps({ now: () => now }));
    expect(result).toMatchObject({ ok: true, chainId: 8453, signer: account.address });
  });

  it("rejects an eip8128 keyid", async () => {
    const signed = await signRequest(
      "https://playthecut.com/api/bot/contests?chainId=8453&smartWallet=" + WALLET,
      signer(),
      { created: 1_700_000_000, expires: 1_700_000_060 },
    );
    const headers = new Headers(signed.headers);
    headers.set(
      "signature-input",
      headers.get("signature-input")!.replaceAll("eip155:", "eip8128:"),
    );
    const result = await verifyBotRequest(new Request(signed, { headers }), deps());
    expect(result).toMatchObject({ ok: false, status: 401, error: "Invalid action signature" });
  });

  it("accepts an https signature that nginx forwarded as http", async () => {
    const signed = await signRequest(
      "https://playthecut.com/api/bot/contests?chainId=8453&smartWallet=" + WALLET,
      signer(),
      { created: 1_700_000_000, expires: 1_700_000_060 },
    );
    const headers = new Headers(signed.headers);
    headers.set("x-forwarded-proto", "https");
    const proxied = new Request(signed.url.replace(/^https:/, "http:"), {
      method: signed.method,
      headers,
    });
    const result = await verifyBotRequest(proxied, deps());
    expect(result).toMatchObject({ ok: true, chainId: 8453, signer: account.address });
  });

  it("rejects that http url when the forwarded scheme is missing", async () => {
    const signed = await signRequest(
      "https://playthecut.com/api/bot/contests?chainId=8453&smartWallet=" + WALLET,
      signer(),
      { created: 1_700_000_000, expires: 1_700_000_060 },
    );
    const proxied = new Request(signed.url.replace(/^https:/, "http:"), {
      method: signed.method,
      headers: signed.headers,
    });
    const result = await verifyBotRequest(proxied, deps());
    expect(result).toMatchObject({ ok: false, status: 401, error: "Invalid action signature" });
  });

  it("accepts a proxied post whose body is still covered", async () => {
    const body = JSON.stringify({ action: "lineupUpsert", candidates: ["ep-1"] });
    const signed = await signRequest(
      "https://playthecut.com/api/auth/yield",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      },
      signer(),
      { created: 1_700_000_000, expires: 1_700_000_060 },
    );
    const headers = new Headers(signed.headers);
    headers.set("x-forwarded-proto", "https");
    const proxied = new Request(signed.url.replace(/^https:/, "http:"), {
      method: "POST",
      headers,
      body: await signed.arrayBuffer(),
    });
    const result = await verifyBotRequest(proxied, deps());
    expect(result).toMatchObject({ ok: true, signer: account.address });
  });

  it("rejects an expired signature", async () => {
    const request = await signRequest(
      "https://playthecut.com/api/bot/contests?chainId=8453",
      signer(),
      {
        created: 1_700_000_000 - 120,
        expires: 1_700_000_000 - 60,
      },
    );
    const result = await verifyBotRequest(request, deps());
    expect(result).toMatchObject({ ok: false, status: 401, error: "Action signature has expired" });
  });

  it("rejects a reused nonce", async () => {
    const used = deps();
    const request = await signRequest(
      "https://playthecut.com/api/bot/contests?chainId=8453",
      signer(),
      {
        created: 1_700_000_000,
        expires: 1_700_000_060,
      },
    );
    expect((await verifyBotRequest(request.clone(), used)).ok).toBe(true);
    const again = await verifyBotRequest(request, used);
    expect(again).toMatchObject({ ok: false, error: "Action nonce has already been used" });
  });

  it("rejects a tampered body", async () => {
    const signed = await signRequest(
      "https://playthecut.com/api/auth/yield",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "lineupUpsert", candidates: ["ep-1"] }),
      },
      signer(),
      { created: 1_700_000_000, expires: 1_700_000_060 },
    );
    const tampered = new Request(signed.url, {
      method: signed.method,
      headers: signed.headers,
      body: JSON.stringify({ action: "lineupUpsert", candidates: ["ep-2"] }),
    });
    const result = await verifyBotRequest(tampered, deps());
    expect(result).toMatchObject({ ok: false, error: "Request body does not match the signature" });
  });

  it("rejects a signature for an unsupported chain", async () => {
    const request = await signRequest(
      "https://playthecut.com/api/bot/contests?chainId=1",
      signer(1),
      {
        created: 1_700_000_000,
        expires: 1_700_000_060,
      },
    );
    const result = await verifyBotRequest(request, deps());
    expect(result).toMatchObject({
      ok: false,
      status: 400,
      error: "ChainId must be 8453 (Base) or 84532 (Base Sepolia)",
    });
  });

  it("accepts an ERC-1271 smart wallet signature", async () => {
    const verifySmartAccount = vi.fn(async () => true as const);
    const request = await signRequest(
      "https://playthecut.com/api/bot/contests?chainId=8453",
      {
        chainId: 8453,
        address: WALLET,
        signMessage: (message) => account.signMessage({ message: { raw: message } }),
      },
      { created: 1_700_000_000, expires: 1_700_000_060 },
    );
    const result = await verifyBotRequest(
      request,
      deps({
        getCode: async () => "0x6001600055",
        verifySmartAccount,
      }),
    );
    expect(result).toMatchObject({ ok: true, signer: WALLET });
    expect(verifySmartAccount).toHaveBeenCalledOnce();
  });
});
