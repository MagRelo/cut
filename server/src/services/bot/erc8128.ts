/**
 * ERC-8128: Signed HTTP Requests with Ethereum
 *
 * Implements RFC 9421 HTTP Message Signatures with Ethereum accounts.
 * Spec version: Draft (2026-01-16) from https://github.com/slice-so/ERCs/blob/d9c6f41183008285a0e9f1af1d2aeac72e7a8fdc/ERCS/erc-8128.md
 *
 * @see https://erc8128.slice.so/
 * @see https://www.rfc-editor.org/rfc/rfc9421
 */

import {
  getAddress,
  hashMessage,
  isAddress,
  keccak256,
  recoverAddress,
  toBytes,
  type Address,
  type Hex,
} from "viem";

export const ERC8128_SPEC_VERSION = "draft-2026-01-16";

export type Erc8128Params = {
  keyid: string;
  created: number;
  expires: number;
  nonce?: string;
};

export type Erc8128ParsedKeyid = {
  chainId: number;
  address: Address;
};

export type Erc8128VerifyInput = {
  method: string;
  authority: string;
  path: string;
  query?: string;
  contentDigest?: string;
  signatureInput: string;
  signature: string;
  body?: Uint8Array | string;
  nowSeconds: number;
};

export type Erc8128VerifyResult =
  | {
      ok: true;
      address: Address;
      chainId: number;
      nonce: string | undefined;
      created: number;
      expires: number;
      replayable: boolean;
    }
  | { ok: false; error: string };

const LABEL = "eth";
const KEYID_PREFIX = "eip8128:";

export function parseKeyid(keyid: string): Erc8128ParsedKeyid | null {
  if (!keyid.startsWith(KEYID_PREFIX)) return null;
  const rest = keyid.slice(KEYID_PREFIX.length);
  const colonIdx = rest.indexOf(":");
  if (colonIdx === -1) return null;
  const chainIdStr = rest.slice(0, colonIdx);
  const addressStr = rest.slice(colonIdx + 1);
  const chainId = parseInt(chainIdStr, 10);
  if (Number.isNaN(chainId) || chainId <= 0) return null;
  if (!isAddress(addressStr)) return null;
  return { chainId, address: getAddress(addressStr) };
}

export function formatKeyid(chainId: number, address: Address): string {
  return `${KEYID_PREFIX}${chainId}:${address.toLowerCase()}`;
}

/**
 * Parse the Signature-Input header for the "eth" label.
 * Format: eth=("@method" "@authority" "@path" ...);created=123;expires=456;nonce="xyz";keyid="eip8128:1:0x..."
 */
export function parseSignatureInput(input: string): Erc8128Params | null {
  const labelPrefix = `${LABEL}=`;
  if (!input.startsWith(labelPrefix)) {
    const labelMatch = input.match(new RegExp(`(?:^|,\\s*)${LABEL}=`));
    if (!labelMatch) return null;
    input = input.slice(labelMatch.index! + (labelMatch[0].startsWith(",") ? 2 : 0));
  } else {
    input = input.slice(labelPrefix.length);
  }

  const openParen = input.indexOf("(");
  const closeParen = input.indexOf(")");
  if (openParen === -1 || closeParen === -1 || closeParen < openParen) return null;

  const paramsStr = input.slice(closeParen + 1);
  const params: Record<string, string | number> = {};

  const paramRegex = /;([a-z]+)=(?:"([^"]+)"|(\d+))/g;
  let match;
  while ((match = paramRegex.exec(paramsStr)) !== null) {
    const [, key, strVal, numVal] = match;
    params[key!] = strVal !== undefined ? strVal : parseInt(numVal!, 10);
  }

  if (typeof params.keyid !== "string") return null;
  if (typeof params.created !== "number") return null;
  if (typeof params.expires !== "number") return null;

  return {
    keyid: params.keyid,
    created: params.created,
    expires: params.expires,
    nonce: typeof params.nonce === "string" ? params.nonce : undefined,
  };
}

/**
 * Parse the covered components from Signature-Input.
 */
export function parseCoveredComponents(input: string): string[] | null {
  const labelPrefix = `${LABEL}=`;
  let start = input.indexOf(labelPrefix);
  if (start === -1) return null;
  start += labelPrefix.length;

  const openParen = input.indexOf("(", start);
  const closeParen = input.indexOf(")", start);
  if (openParen === -1 || closeParen === -1 || closeParen < openParen) return null;

  const componentsStr = input.slice(openParen + 1, closeParen);
  const components: string[] = [];
  const componentRegex = /"([^"]+)"/g;
  let match;
  while ((match = componentRegex.exec(componentsStr)) !== null) {
    components.push(match[1]!);
  }
  return components;
}

/**
 * Extract the raw signature bytes from the Signature header for the "eth" label.
 * Format: eth=:base64signature:
 */
export function parseSignature(header: string): Hex | null {
  const labelPrefix = `${LABEL}=:`;
  let start = header.indexOf(labelPrefix);
  if (start === -1) return null;
  start += labelPrefix.length;

  const end = header.indexOf(":", start);
  if (end === -1) return null;

  const base64 = header.slice(start, end);
  try {
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length !== 65) return null;
    return `0x${bytes.toString("hex")}` as Hex;
  } catch {
    return null;
  }
}

/**
 * Build the RFC 9421 signature base from request components.
 * The signature base is what gets signed with ERC-191.
 */
export function buildSignatureBase(
  components: string[],
  values: Record<string, string>,
  signatureInput: string,
): string {
  const lines: string[] = [];

  for (const component of components) {
    const value = values[component];
    if (value === undefined) {
      throw new Error(`Missing component value for ${component}`);
    }
    lines.push(`"${component}": ${value}`);
  }

  const labelPrefix = `${LABEL}=`;
  let sigParamsStart = signatureInput.indexOf(labelPrefix);
  if (sigParamsStart === -1) {
    throw new Error("Missing eth label in Signature-Input");
  }
  sigParamsStart += labelPrefix.length;
  const sigParams = signatureInput.slice(sigParamsStart);

  lines.push(`"@signature-params": ${sigParams}`);

  return lines.join("\n");
}

/**
 * Compute the content-digest header value for a body using SHA-256.
 */
export function computeContentDigest(body: Uint8Array | string): string {
  const bytes = typeof body === "string" ? toBytes(body) : body;
  const hash = keccak256(bytes).slice(2);
  const base64 = Buffer.from(hash, "hex").toString("base64");
  return `sha-256=:${base64}:`;
}

/**
 * Verify an ERC-8128 signed HTTP request.
 *
 * For Request-Bound signatures, must cover: @method, @authority, @path, @query (if present), content-digest (if body present)
 * For Non-Replayable signatures, must include nonce parameter.
 */
export async function verifyErc8128Request(input: Erc8128VerifyInput): Promise<Erc8128VerifyResult> {
  const params = parseSignatureInput(input.signatureInput);
  if (!params) {
    return { ok: false, error: "Invalid Signature-Input header" };
  }

  const keyid = parseKeyid(params.keyid);
  if (!keyid) {
    return { ok: false, error: "Invalid keyid format" };
  }

  if (params.created > input.nowSeconds) {
    return { ok: false, error: "Signature not yet valid (created in future)" };
  }
  if (params.expires <= input.nowSeconds) {
    return { ok: false, error: "Signature has expired" };
  }

  const maxValidity = 3600;
  if (params.expires - params.created > maxValidity) {
    return { ok: false, error: "Signature validity window exceeds maximum (1 hour)" };
  }

  const components = parseCoveredComponents(input.signatureInput);
  if (!components || components.length === 0) {
    return { ok: false, error: "No covered components in Signature-Input" };
  }

  if (!components.includes("@authority")) {
    return { ok: false, error: "Signature must cover @authority" };
  }

  const signature = parseSignature(input.signature);
  if (!signature) {
    return { ok: false, error: "Invalid Signature header" };
  }

  const componentValues: Record<string, string> = {
    "@method": input.method.toUpperCase(),
    "@authority": input.authority,
    "@path": input.path,
  };

  if (input.query) {
    componentValues["@query"] = input.query;
  }

  if (input.contentDigest) {
    componentValues["content-digest"] = input.contentDigest;
  }

  for (const component of components) {
    if (!(component in componentValues)) {
      return { ok: false, error: `Unknown or missing component: ${component}` };
    }
  }

  let signatureBase: string;
  try {
    signatureBase = buildSignatureBase(components, componentValues, input.signatureInput);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to build signature base",
    };
  }

  let recovered: Address;
  try {
    const messageHash = hashMessage({ raw: toBytes(signatureBase) });
    recovered = await recoverAddress({ hash: messageHash, signature });
  } catch {
    return { ok: false, error: "Invalid signature" };
  }

  if (getAddress(recovered) !== keyid.address) {
    return { ok: false, error: "Signature does not match keyid address" };
  }

  return {
    ok: true,
    address: keyid.address,
    chainId: keyid.chainId,
    nonce: params.nonce,
    created: params.created,
    expires: params.expires,
    replayable: params.nonce === undefined,
  };
}

/**
 * Build a Signature-Input header value for signing.
 */
export function buildSignatureInput(
  components: string[],
  params: Erc8128Params,
): string {
  const componentsList = components.map((c) => `"${c}"`).join(" ");
  let paramsStr = `;created=${params.created};expires=${params.expires}`;
  if (params.nonce) {
    paramsStr += `;nonce="${params.nonce}"`;
  }
  paramsStr += `;keyid="${params.keyid}"`;
  return `${LABEL}=(${componentsList})${paramsStr}`;
}

/**
 * Sign an HTTP request using ERC-8128.
 * Returns the Signature-Input and Signature header values.
 */
export async function signErc8128Request(input: {
  method: string;
  authority: string;
  path: string;
  query?: string;
  body?: Uint8Array | string;
  chainId: number;
  address: Address;
  signMessage: (message: Uint8Array) => Promise<Hex>;
  nonce?: string;
  ttlSeconds?: number;
  nowSeconds?: number;
}): Promise<{ signatureInput: string; signature: string; contentDigest?: string }> {
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const ttl = input.ttlSeconds ?? 60;

  const components: string[] = ["@method", "@authority", "@path"];
  const componentValues: Record<string, string> = {
    "@method": input.method.toUpperCase(),
    "@authority": input.authority,
    "@path": input.path,
  };

  if (input.query) {
    components.push("@query");
    componentValues["@query"] = input.query;
  }

  let contentDigest: string | undefined;
  if (input.body && (typeof input.body === "string" ? input.body.length > 0 : input.body.length > 0)) {
    contentDigest = computeContentDigest(input.body);
    components.push("content-digest");
    componentValues["content-digest"] = contentDigest;
  }

  const params: Erc8128Params = {
    keyid: formatKeyid(input.chainId, input.address),
    created: now,
    expires: now + ttl,
    nonce: input.nonce,
  };

  const signatureInput = buildSignatureInput(components, params);
  const signatureBase = buildSignatureBase(components, componentValues, signatureInput);

  const sig = await input.signMessage(toBytes(signatureBase));
  const base64Sig = Buffer.from(sig.slice(2), "hex").toString("base64");

  return {
    signatureInput,
    signature: `${LABEL}=:${base64Sig}:`,
    contentDigest,
  };
}
