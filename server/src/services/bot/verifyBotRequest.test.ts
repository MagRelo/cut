import { createCutAgent, generateDelegateKey, signPayload } from "@playthecut/agent";
import { afterEach, describe, expect, it } from "vitest";
import { canonicalRequestUrl, verifyBotRequest, type VerifyBotRequestDeps } from "./verifyBotRequest.js";

const key = generateDelegateKey();

function deps(partial: Partial<VerifyBotRequestDeps> = {}): VerifyBotRequestDeps {
  const used = new Set<string>();
  return {
    now: () => Math.floor(Date.now() / 1000),
    consumeNonce: async (nonceKey) => {
      if (used.has(nonceKey)) return false;
      used.add(nonceKey);
      return true;
    },
    ...partial,
  };
}

describe("verifyBotRequest", () => {
  const previousPublicUrl = process.env.APP_PUBLIC_URL;
  const previousAlias = process.env.PUBLIC_APP_URL;

  afterEach(() => {
    if (previousPublicUrl === undefined) delete process.env.APP_PUBLIC_URL;
    else process.env.APP_PUBLIC_URL = previousPublicUrl;
    if (previousAlias === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = previousAlias;
  });

  it("accepts a request from the agent SDK", async () => {
    process.env.APP_PUBLIC_URL = "https://playthecut.com";
    let captured: Request | undefined;
    const agent = createCutAgent({
      privateKey: key.privateKey,
      smartWallet: "0x1111111111111111111111111111111111111111",
      origin: "https://playthecut.com",
      fetch: async (request) => {
        captured = request.clone();
        return new Response(JSON.stringify({ contests: [] }), {
          headers: { "content-type": "application/json" },
        });
      },
    });
    await agent.contests();
    const result = await verifyBotRequest(captured!, deps());
    expect(result).toMatchObject({ ok: true, signer: key.publicKey, chainId: 8453 });
  });

  it("rejects a reused nonce", async () => {
    let captured: Request | undefined;
    const agent = createCutAgent({
      privateKey: key.privateKey,
      smartWallet: "0x1111111111111111111111111111111111111111",
      origin: "https://playthecut.com",
      fetch: async (request) => {
        captured = request.clone();
        return new Response(JSON.stringify({ contests: [] }), {
          headers: { "content-type": "application/json" },
        });
      },
    });
    await agent.contests();
    const store = deps();
    await expect(verifyBotRequest(captured!.clone(), store)).resolves.toMatchObject({ ok: true });
    await expect(verifyBotRequest(captured!.clone(), store)).resolves.toMatchObject({
      ok: false,
      error: "Action nonce has already been used",
    });
  });

  it("rejects an expired signature", async () => {
    const created = 1_700_000_000;
    const payload = {
      version: 1 as const,
      method: "GET",
      url: "https://playthecut.com/api/contests?chainId=8453",
      body: "",
      chainId: 8453,
      created,
      expires: created + 60,
      nonce: "nonce-expired-1",
    };
    const request = new Request(payload.url, {
      headers: {
        "x-cut-public-key": key.publicKey,
        "x-cut-signature": signPayload(key.privateKey, {
          ...payload,
          body: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        }),
        "x-cut-created": String(created),
        "x-cut-expires": String(created + 60),
        "x-cut-nonce": payload.nonce,
        "x-cut-chain-id": "8453",
      },
    });
    const result = await verifyBotRequest(request, deps({ now: () => created + 120 }));
    expect(result).toMatchObject({ ok: false, error: "Action signature has expired" });
  });

  it("pins a proxied request to the configured origin and ignores a forged host", async () => {
    process.env.APP_PUBLIC_URL = "https://playthecut.com";
    const created = Math.floor(Date.now() / 1000);
    const publicUrl = "https://playthecut.com/api/contests?chainId=8453";
    const payload = {
      version: 1 as const,
      method: "GET",
      url: publicUrl,
      body: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      chainId: 8453,
      created,
      expires: created + 60,
      nonce: "nonce-proxy-https",
    };
    const headers = {
      "x-forwarded-proto": "https",
      "x-forwarded-host": "evil.example",
      "x-cut-public-key": key.publicKey,
      "x-cut-signature": signPayload(key.privateKey, payload),
      "x-cut-created": String(created),
      "x-cut-expires": String(created + 60),
      "x-cut-nonce": payload.nonce,
      "x-cut-chain-id": "8453",
    };
    const request = new Request("http://10.0.0.8:3000/api/contests?chainId=8453", { headers });
    expect(canonicalRequestUrl(request)).toBe(publicUrl);
    await expect(verifyBotRequest(request, deps())).resolves.toMatchObject({ ok: true });

    const forged = {
      ...payload,
      url: "https://evil.example/api/contests?chainId=8453",
      nonce: "nonce-forged-host",
    };
    const mismatch = new Request("http://10.0.0.8:3000/api/contests?chainId=8453", {
      headers: {
        ...headers,
        "x-cut-signature": signPayload(key.privateKey, forged),
        "x-cut-nonce": forged.nonce,
      },
    });
    expect(canonicalRequestUrl(mismatch)).toBe(publicUrl);
    await expect(verifyBotRequest(mismatch, deps())).resolves.toMatchObject({
      ok: false,
      error: "Invalid action signature",
    });
  });

  it("keeps a loopback URL and rejects a key that is not a P-256 public key", async () => {
    const created = Math.floor(Date.now() / 1000);
    const localUrl = "http://localhost:3000/api/contests?chainId=8453";
    const payload = {
      version: 1 as const,
      method: "GET",
      url: localUrl,
      body: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      chainId: 8453,
      created,
      expires: created + 60,
      nonce: "nonce-loopback-1",
    };
    const request = new Request(localUrl, {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "evil.example",
        "x-cut-public-key": key.publicKey,
        "x-cut-signature": signPayload(key.privateKey, payload),
        "x-cut-created": String(created),
        "x-cut-expires": String(created + 60),
        "x-cut-nonce": payload.nonce,
        "x-cut-chain-id": "8453",
      },
    });
    expect(canonicalRequestUrl(request)).toBe(localUrl);
    await expect(verifyBotRequest(request, deps())).resolves.toMatchObject({ ok: true });

    const badKey = new Request(localUrl, {
      headers: {
        "x-cut-public-key": "0x1111111111111111111111111111111111111111",
        "x-cut-signature": "sig",
        "x-cut-created": String(created),
        "x-cut-expires": String(created + 60),
        "x-cut-nonce": "nonce-bad-key1",
        "x-cut-chain-id": "8453",
      },
    });
    await expect(verifyBotRequest(badKey, deps())).resolves.toMatchObject({
      ok: false,
      error: "Invalid public key",
    });
  });
});
