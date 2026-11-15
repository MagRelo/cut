/**
 * Tests for ERC-8128 HTTP Message Signatures with Ethereum.
 *
 * ERC-8128 spec version: draft-2026-01-16
 * @see https://erc8128.slice.so/
 */

import { getAddress, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import {
  buildSignatureBase,
  buildSignatureInput,
  computeContentDigest,
  formatKeyid,
  parseCoveredComponents,
  parseKeyid,
  parseSignature,
  parseSignatureInput,
  signErc8128Request,
  verifyErc8128Request,
  ERC8128_SPEC_VERSION,
} from "./erc8128.js";

const CHAIN_ID = 84532;
const testKey = generatePrivateKey();
const testAccount = privateKeyToAccount(testKey);
const TEST_ADDRESS = getAddress(testAccount.address);

describe("ERC-8128 keyid parsing", () => {
  it("parses a valid keyid", () => {
    const keyid = `eip8128:${CHAIN_ID}:${TEST_ADDRESS.toLowerCase()}`;
    const result = parseKeyid(keyid);
    expect(result).toEqual({
      chainId: CHAIN_ID,
      address: TEST_ADDRESS,
    });
  });

  it("rejects keyid with wrong prefix", () => {
    expect(parseKeyid(`eip712:${CHAIN_ID}:${TEST_ADDRESS}`)).toBeNull();
    expect(parseKeyid(`eth:${CHAIN_ID}:${TEST_ADDRESS}`)).toBeNull();
  });

  it("rejects keyid with invalid chain id", () => {
    expect(parseKeyid(`eip8128:abc:${TEST_ADDRESS}`)).toBeNull();
    expect(parseKeyid(`eip8128:-1:${TEST_ADDRESS}`)).toBeNull();
    expect(parseKeyid(`eip8128:0:${TEST_ADDRESS}`)).toBeNull();
  });

  it("rejects keyid with invalid address", () => {
    expect(parseKeyid(`eip8128:${CHAIN_ID}:0x123`)).toBeNull();
    expect(parseKeyid(`eip8128:${CHAIN_ID}:notanaddress`)).toBeNull();
  });

  it("formats keyid correctly", () => {
    const keyid = formatKeyid(CHAIN_ID, TEST_ADDRESS);
    expect(keyid).toBe(`eip8128:${CHAIN_ID}:${TEST_ADDRESS.toLowerCase()}`);
  });
});

describe("ERC-8128 Signature-Input parsing", () => {
  it("parses a complete Signature-Input header", () => {
    const input = `eth=("@method" "@authority" "@path");created=1700000000;expires=1700000060;nonce="abc123";keyid="eip8128:${CHAIN_ID}:${TEST_ADDRESS.toLowerCase()}"`;
    const result = parseSignatureInput(input);
    expect(result).toEqual({
      keyid: `eip8128:${CHAIN_ID}:${TEST_ADDRESS.toLowerCase()}`,
      created: 1700000000,
      expires: 1700000060,
      nonce: "abc123",
    });
  });

  it("parses Signature-Input without nonce (replayable)", () => {
    const input = `eth=("@method" "@authority" "@path");created=1700000000;expires=1700000060;keyid="eip8128:${CHAIN_ID}:${TEST_ADDRESS.toLowerCase()}"`;
    const result = parseSignatureInput(input);
    expect(result).toEqual({
      keyid: `eip8128:${CHAIN_ID}:${TEST_ADDRESS.toLowerCase()}`,
      created: 1700000000,
      expires: 1700000060,
      nonce: undefined,
    });
  });

  it("parses covered components", () => {
    const input = `eth=("@method" "@authority" "@path" "@query" "content-digest");created=1;expires=2;keyid="k"`;
    const components = parseCoveredComponents(input);
    expect(components).toEqual(["@method", "@authority", "@path", "@query", "content-digest"]);
  });

  it("returns null for missing required params", () => {
    expect(parseSignatureInput(`eth=("@method");created=1;expires=2`)).toBeNull(); // missing keyid
    expect(parseSignatureInput(`eth=("@method");keyid="k";expires=2`)).toBeNull(); // missing created
    expect(parseSignatureInput(`eth=("@method");keyid="k";created=1`)).toBeNull(); // missing expires
  });
});

describe("ERC-8128 Signature header parsing", () => {
  it("parses a valid signature header", () => {
    // 65-byte signature in base64
    const sigBytes = Buffer.alloc(65, 0x42);
    const base64Sig = sigBytes.toString("base64");
    const header = `eth=:${base64Sig}:`;
    const result = parseSignature(header);
    expect(result).toBe(`0x${"42".repeat(65)}`);
  });

  it("returns null for invalid signature length", () => {
    const shortSig = Buffer.alloc(32, 0x42).toString("base64");
    expect(parseSignature(`eth=:${shortSig}:`)).toBeNull();
  });

  it("returns null for missing eth label", () => {
    const sigBytes = Buffer.alloc(65, 0x42).toString("base64");
    expect(parseSignature(`other=:${sigBytes}:`)).toBeNull();
  });
});

describe("ERC-8128 signature base construction", () => {
  it("builds signature base per RFC 9421", () => {
    const components = ["@method", "@authority", "@path"];
    const values = {
      "@method": "POST",
      "@authority": "api.example.com",
      "@path": "/api/bot/actions",
    };
    const signatureInput = `eth=("@method" "@authority" "@path");created=1700000000;expires=1700000060;keyid="eip8128:1:0xabc"`;

    const base = buildSignatureBase(components, values, signatureInput);
    expect(base).toContain('"@method": POST');
    expect(base).toContain('"@authority": api.example.com');
    expect(base).toContain('"@path": /api/bot/actions');
    expect(base).toContain('"@signature-params":');
  });

  it("throws for missing component value", () => {
    expect(() =>
      buildSignatureBase(
        ["@method", "@authority", "@missing"],
        { "@method": "GET", "@authority": "example.com" },
        "eth=()",
      ),
    ).toThrow(/Missing component value/);
  });
});

describe("ERC-8128 content-digest", () => {
  it("computes content-digest for a body", () => {
    const body = JSON.stringify({ action: "test" });
    const digest = computeContentDigest(body);
    expect(digest).toMatch(/^sha-256=:[A-Za-z0-9+/]+=*:$/);
  });

  it("produces consistent digest for same input", () => {
    const body = "test body";
    const digest1 = computeContentDigest(body);
    const digest2 = computeContentDigest(body);
    expect(digest1).toBe(digest2);
  });
});

describe("ERC-8128 request signing and verification", () => {
  it("signs and verifies a request-bound non-replayable request", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ action: "lineupUpsert", chainId: CHAIN_ID });

    const signed = await signErc8128Request({
      method: "POST",
      authority: "api.playthecut.com",
      path: "/api/bot/actions",
      body,
      chainId: CHAIN_ID,
      address: TEST_ADDRESS,
      signMessage: async (message) => {
        return testAccount.signMessage({ message: { raw: message } });
      },
      nonce: "unique-nonce-12345",
      ttlSeconds: 60,
      nowSeconds,
    });

    expect(signed.signatureInput).toContain("eth=");
    expect(signed.signatureInput).toContain("@method");
    expect(signed.signatureInput).toContain("@authority");
    expect(signed.signatureInput).toContain("@path");
    expect(signed.signatureInput).toContain("content-digest");
    expect(signed.signatureInput).toContain("nonce=");
    expect(signed.signature).toMatch(/^eth=:[A-Za-z0-9+/]+=*:$/);

    const result = await verifyErc8128Request({
      method: "POST",
      authority: "api.playthecut.com",
      path: "/api/bot/actions",
      contentDigest: signed.contentDigest,
      signatureInput: signed.signatureInput,
      signature: signed.signature,
      body,
      nowSeconds,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.address).toBe(TEST_ADDRESS);
      expect(result.chainId).toBe(CHAIN_ID);
      expect(result.nonce).toBe("unique-nonce-12345");
      expect(result.replayable).toBe(false);
    }
  });

  it("signs and verifies a replayable read request (no nonce)", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);

    const signed = await signErc8128Request({
      method: "GET",
      authority: "api.playthecut.com",
      path: "/api/bot/contests",
      query: "?smartWallet=0x123",
      chainId: CHAIN_ID,
      address: TEST_ADDRESS,
      signMessage: async (message) => {
        return testAccount.signMessage({ message: { raw: message } });
      },
      // No nonce - replayable
      ttlSeconds: 60,
      nowSeconds,
    });

    expect(signed.signatureInput).not.toContain("nonce=");

    const result = await verifyErc8128Request({
      method: "GET",
      authority: "api.playthecut.com",
      path: "/api/bot/contests",
      query: "?smartWallet=0x123",
      signatureInput: signed.signatureInput,
      signature: signed.signature,
      nowSeconds,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.address).toBe(TEST_ADDRESS);
      expect(result.replayable).toBe(true);
      expect(result.nonce).toBeUndefined();
    }
  });

  it("rejects expired signature", async () => {
    const pastTime = Math.floor(Date.now() / 1000) - 120;

    const signed = await signErc8128Request({
      method: "GET",
      authority: "api.playthecut.com",
      path: "/api/bot/contests",
      chainId: CHAIN_ID,
      address: TEST_ADDRESS,
      signMessage: async (message) => {
        return testAccount.signMessage({ message: { raw: message } });
      },
      ttlSeconds: 60,
      nowSeconds: pastTime,
    });

    const result = await verifyErc8128Request({
      method: "GET",
      authority: "api.playthecut.com",
      path: "/api/bot/contests",
      signatureInput: signed.signatureInput,
      signature: signed.signature,
      nowSeconds: Math.floor(Date.now() / 1000),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("expired");
    }
  });

  it("rejects signature with validity window too long", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);

    const signed = await signErc8128Request({
      method: "GET",
      authority: "api.playthecut.com",
      path: "/api/bot/contests",
      chainId: CHAIN_ID,
      address: TEST_ADDRESS,
      signMessage: async (message) => {
        return testAccount.signMessage({ message: { raw: message } });
      },
      ttlSeconds: 7200, // 2 hours - exceeds max
      nowSeconds,
    });

    const result = await verifyErc8128Request({
      method: "GET",
      authority: "api.playthecut.com",
      path: "/api/bot/contests",
      signatureInput: signed.signatureInput,
      signature: signed.signature,
      nowSeconds,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("exceeds maximum");
    }
  });

  it("rejects tampered body", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const originalBody = JSON.stringify({ action: "join" });
    const tamperedBody = JSON.stringify({ action: "leave" });

    const signed = await signErc8128Request({
      method: "POST",
      authority: "api.playthecut.com",
      path: "/api/bot/actions",
      body: originalBody,
      chainId: CHAIN_ID,
      address: TEST_ADDRESS,
      signMessage: async (message) => {
        return testAccount.signMessage({ message: { raw: message } });
      },
      nonce: "nonce-123",
      nowSeconds,
    });

    // Recompute content-digest for tampered body
    const tamperedDigest = computeContentDigest(tamperedBody);

    const result = await verifyErc8128Request({
      method: "POST",
      authority: "api.playthecut.com",
      path: "/api/bot/actions",
      contentDigest: tamperedDigest, // Different from signed
      signatureInput: signed.signatureInput,
      signature: signed.signature,
      body: tamperedBody,
      nowSeconds,
    });

    // Should fail because content-digest doesn't match what was signed,
    // resulting in signature verification failure (recovered address won't match)
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/does not match|Invalid signature/);
    }
  });

  it("rejects signature from wrong key", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const otherKey = generatePrivateKey();
    const otherAccount = privateKeyToAccount(otherKey);

    const signed = await signErc8128Request({
      method: "GET",
      authority: "api.playthecut.com",
      path: "/api/bot/contests",
      chainId: CHAIN_ID,
      address: TEST_ADDRESS, // Claims to be TEST_ADDRESS
      signMessage: async (message) => {
        // But signs with a different key
        return otherAccount.signMessage({ message: { raw: message } });
      },
      nowSeconds,
    });

    const result = await verifyErc8128Request({
      method: "GET",
      authority: "api.playthecut.com",
      path: "/api/bot/contests",
      signatureInput: signed.signatureInput,
      signature: signed.signature,
      nowSeconds,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("does not match keyid");
    }
  });
});

describe("ERC-8128 spec version", () => {
  it("exports the spec version", () => {
    expect(ERC8128_SPEC_VERSION).toBe("draft-2026-01-16");
  });
});

describe("ERC-8128 request binding", () => {
  const authority = "api.playthecut.com";
  const path = "/api/bot/actions";
  const signMessage = async (message: Uint8Array) =>
    testAccount.signMessage({ message: { raw: message } });

  it("uses RFC 9530 SHA-256 for Content-Digest", () => {
    // RFC 9530 section 2 example.
    expect(computeContentDigest('{"hello": "world"}')).toBe(
      "sha-256=:X48E9qOokqqrvdts8nOJRJN3OWDUoyWxBf7kbu9DBPE=:",
    );
  });

  it("rejects a swapped body even when the signed Content-Digest header is replayed", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ action: "join" });
    const signed = await signErc8128Request({
      method: "POST",
      authority,
      path,
      body,
      chainId: CHAIN_ID,
      address: TEST_ADDRESS,
      signMessage,
      nonce: "nonce-binding-1",
      nowSeconds,
    });
    const result = await verifyErc8128Request({
      method: "POST",
      authority,
      path,
      contentDigest: signed.contentDigest,
      signatureInput: signed.signatureInput,
      signature: signed.signature,
      body: JSON.stringify({ action: "leave" }),
      nowSeconds,
    });
    expect(result).toEqual({ ok: false, error: "Content-Digest does not match the request body" });
  });

  it("requires content-digest coverage when the request has a body", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const signed = await signErc8128Request({
      method: "POST",
      authority,
      path,
      chainId: CHAIN_ID,
      address: TEST_ADDRESS,
      signMessage,
      nonce: "nonce-binding-2",
      nowSeconds,
    });
    const body = JSON.stringify({ action: "join" });
    const result = await verifyErc8128Request({
      method: "POST",
      authority,
      path,
      contentDigest: computeContentDigest(body),
      signatureInput: signed.signatureInput,
      signature: signed.signature,
      body,
      nowSeconds,
    });
    expect(result).toEqual({ ok: false, error: "Signature must cover content-digest" });
  });

  it("requires @query coverage when the request has a query", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const signed = await signErc8128Request({
      method: "GET",
      authority,
      path: "/api/bot/balance",
      chainId: CHAIN_ID,
      address: TEST_ADDRESS,
      signMessage,
      nowSeconds,
    });
    const result = await verifyErc8128Request({
      method: "GET",
      authority,
      path: "/api/bot/balance",
      query: "?smartWallet=0x0000000000000000000000000000000000000001",
      signatureInput: signed.signatureInput,
      signature: signed.signature,
      nowSeconds,
    });
    expect(result).toEqual({ ok: false, error: "Signature must cover @query" });
  });

  it("rejects a signature for a different authority", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const signed = await signErc8128Request({
      method: "GET",
      authority: "evil.example",
      path: "/api/bot/contests",
      chainId: CHAIN_ID,
      address: TEST_ADDRESS,
      signMessage,
      nowSeconds,
    });
    const result = await verifyErc8128Request({
      method: "GET",
      authority,
      path: "/api/bot/contests",
      signatureInput: signed.signatureInput,
      signature: signed.signature,
      nowSeconds,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects malformed nonces", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const signed = await signErc8128Request({
      method: "GET",
      authority,
      path: "/api/bot/contests",
      chainId: CHAIN_ID,
      address: TEST_ADDRESS,
      signMessage,
      nonce: "short",
      nowSeconds,
    });
    const result = await verifyErc8128Request({
      method: "GET",
      authority,
      path: "/api/bot/contests",
      signatureInput: signed.signatureInput,
      signature: signed.signature,
      nowSeconds,
    });
    expect(result).toEqual({ ok: false, error: "Invalid nonce (8-128 URL-safe characters)" });
  });
});
