import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const canonicalize = require("canonicalize") as (value: unknown) => string | undefined;

export const CUT_SIGNATURE_TTL_SECONDS = 300;

export type DelegateKey = {
  privateKey: string;
  publicKey: string;
};

export type CutRequestPayload = {
  version: 1;
  method: string;
  url: string;
  body: string;
  chainId: number;
  created: number;
  expires: number;
  nonce: string;
};

export function generateDelegateKey(): DelegateKey {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const publicKey = createPublicKey(privateKey)
    .export({ type: "spki", format: "der" })
    .toString("base64");
  return {
    privateKey: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
    publicKey,
  };
}

export function isDelegatePublicKey(value: string): boolean {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length < 80 || value.length > 200) return false;
  try {
    const key = createPublicKey({ key: Buffer.from(value, "base64"), format: "der", type: "spki" });
    return key.asymmetricKeyType === "ec" && key.asymmetricKeyDetails?.namedCurve === "prime256v1";
  } catch {
    return false;
  }
}

export function publicKeyFromPrivate(privateKey: string): string {
  const key = createPrivateKey({ key: Buffer.from(privateKey, "base64"), format: "der", type: "pkcs8" });
  return createPublicKey(key).export({ type: "spki", format: "der" }).toString("base64");
}

export function canonicalPayload(payload: unknown): string {
  const serialized = canonicalize(payload);
  if (!serialized) throw new Error("Could not serialize the signature payload");
  return serialized;
}

export function signPayload(privateKey: string, payload: unknown): string {
  const signature = sign("sha256", Buffer.from(canonicalPayload(payload), "utf8"), {
    key: createPrivateKey({ key: Buffer.from(privateKey, "base64"), format: "der", type: "pkcs8" }),
    dsaEncoding: "der",
  });
  return signature.toString("base64");
}

export function verifyPayload(publicKey: string, payload: unknown, signature: string): boolean {
  try {
    return verify(
      "sha256",
      Buffer.from(canonicalPayload(payload), "utf8"),
      {
        key: createPublicKey({ key: Buffer.from(publicKey, "base64"), format: "der", type: "spki" }),
        dsaEncoding: "der",
      },
      Buffer.from(signature, "base64"),
    );
  } catch {
    return false;
  }
}

export function hashBody(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function cutRequestPayload(input: {
  method: string;
  url: string;
  body: Uint8Array;
  chainId: number;
  created: number;
  expires: number;
  nonce: string;
}): CutRequestPayload {
  return {
    version: 1,
    method: input.method.toUpperCase(),
    url: input.url,
    body: hashBody(input.body),
    chainId: input.chainId,
    created: input.created,
    expires: input.expires,
    nonce: input.nonce,
  };
}
