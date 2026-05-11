import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { encodeAbiParameters } from "viem";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export interface VerifyContestContractParams {
  chainId: number;
  contestAddress: string;

  paymentTokenAddress: string;
  oracle: string;

  /** `_primaryDepositAmount` as uint256 decimal string (token base units, 18 decimals). */
  primaryDepositAmountWei: string;

  oracleFeeBps: number;
  expiryTimestamp: number;
  primaryDepositSecondarySubsidyBps: number;
}

/**
 * Fire-and-forget contract verification for a single `ContestController` instance.
 *
 * Uses Blockscout API v2 "standard-input" endpoint (preferred by Blockscout docs).
 */
export async function queueVerifyContestContract(params: VerifyContestContractParams): Promise<void> {
  const chainIdToBlockscoutBaseUrl: Record<number, string> = {
    84532: "https://base-sepolia.blockscout.com",
    8453: "https://base.blockscout.com",
  };

  const blockscoutBaseUrl = chainIdToBlockscoutBaseUrl[params.chainId];
  if (!blockscoutBaseUrl) {
    throw new Error(`Unsupported chainId for verification: ${params.chainId}`);
  }

  // Server build copies `server/src/contracts/*.json` into `dist/src/contracts/*.json`,
  // so resolve relative to this module.
  const artifactPath = path.join(moduleDir, "..", "..", "contracts", "ContestController.json");
  const artifactRaw = fs.readFileSync(artifactPath, "utf8");
  const artifact = JSON.parse(artifactRaw) as {
    bytecode?: { object?: string };
    rawMetadata?: string;
  };

  const bytecodeObject = artifact.bytecode?.object;
  if (!bytecodeObject) {
    throw new Error(`Missing bytecode.object in ${artifactPath}`);
  }

  const rawMetadata = artifact.rawMetadata ? JSON.parse(artifact.rawMetadata) : null;
  const compilerVersion: string | undefined = rawMetadata?.compiler?.version;
  if (!compilerVersion) {
    throw new Error(`Missing compiler version in ContestController artifact rawMetadata`);
  }

  const solidityCompilerVersion = compilerVersion.startsWith("v") ? compilerVersion : `v${compilerVersion}`;

  const sources: Record<string, any> = (rawMetadata as any)?.sources ?? {};
  const license = Object.values(sources)[0]?.license as string | undefined;
  // Blockscout expects lowercase short license identifiers like "mit", "gnu_gpl_v2", etc.
  const licenseType = license?.toLowerCase().includes("mit") ? "mit" : "mit";

  const constructorArgsHex = encodeAbiParameters(
    [
      { type: "address" },
      { type: "address" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
    ],
    [
      params.paymentTokenAddress as `0x${string}`,
      params.oracle as `0x${string}`,
      BigInt(params.primaryDepositAmountWei),
      BigInt(params.oracleFeeBps),
      BigInt(params.expiryTimestamp),
      BigInt(params.primaryDepositSecondarySubsidyBps),
    ],
  );

  // `encodeAbiParameters` returns a `0x...` hex string. Blockscout examples omit the `0x` prefix.
  const constructorArgs = constructorArgsHex.startsWith("0x") ? constructorArgsHex.slice(2) : constructorArgsHex;

  const contractName = "ContestController";
  const autodetectConstructorArgs = "false";

  const url = `${blockscoutBaseUrl}/api/v2/smart-contracts/${params.contestAddress}/verification/via/standard-input`;

  const form = new FormData();
  form.append("compiler_version", solidityCompilerVersion);
  form.append("contract_name", contractName);
  form.append("files[0]", bytecodeObject);
  form.append("autodetect_constructor_args", autodetectConstructorArgs);
  form.append("constructor_args", constructorArgs);
  form.append("license_type", licenseType);

  const response = await fetch(url, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Blockscout verification request failed (${response.status}): ${text}`);
  }
}

