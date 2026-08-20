import {
  createPublicClient,
  getAddress,
  http,
  parseEventLogs,
  type Abi,
  type TransactionReceipt,
} from "viem";
import ContestFactory from "../../contracts/ContestFactory.json" with { type: "json" };
import ContestController from "../../contracts/ContestController.json" with { type: "json" };
import { getChainConfig } from "../../lib/chainConfig.js";
import { getContestFactoryAddress, getPaymentTokenAddress } from "../../lib/contractAddresses.js";
import { getOperatorAddress } from "../../lib/operator.js";

const factoryAbi = ContestFactory.abi as Abi;
const contestAbi = ContestController.abi as Abi;
const RECEIPT_TIMEOUT_MS = 5_000;

export type VerifyFactoryContestError =
  | "receipt_not_found"
  | "receipt_failed"
  | "not_factory_contest"
  | "address_mismatch"
  | "operator_mismatch"
  | "token_mismatch"
  | "rpc_error";

export type VerifyFactoryContestResult =
  | {
      ok: true;
      contestAddress: `0x${string}`;
      operator: `0x${string}`;
      paymentToken: `0x${string}`;
    }
  | { ok: false; error: VerifyFactoryContestError };

export function matchingFactoryCreatedContest(
  receipt: TransactionReceipt,
  factoryAddress: string,
  claimedAddress: string,
): `0x${string}` | null {
  const factory = getAddress(factoryAddress);
  const claimed = getAddress(claimedAddress as `0x${string}`);

  const logs = parseEventLogs({
    abi: factoryAbi,
    eventName: "ContestCreated",
    logs: receipt.logs,
  });

  for (const log of logs) {
    if (getAddress(log.address) !== factory) continue;
    const args = log.args as { contest: `0x${string}` };
    if (getAddress(args.contest) === claimed) {
      return claimed;
    }
  }
  return null;
}

export async function verifyFactoryContestCreation(params: {
  chainId: number;
  transactionHash: `0x${string}`;
  claimedAddress: string;
}): Promise<VerifyFactoryContestResult> {
  const factoryAddress = getContestFactoryAddress(params.chainId);
  const expectedToken = getPaymentTokenAddress(params.chainId);
  if (!factoryAddress || !expectedToken) {
    return { ok: false, error: "rpc_error" };
  }

  let expectedOperator: `0x${string}`;
  try {
    expectedOperator = getOperatorAddress();
  } catch (error) {
    console.error("verifyFactoryContestCreation operator config:", error);
    return { ok: false, error: "rpc_error" };
  }

  const chainConfig = getChainConfig(params.chainId);
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl, { timeout: RECEIPT_TIMEOUT_MS }),
  });

  let receipt: TransactionReceipt;
  try {
    receipt = await publicClient.getTransactionReceipt({
      hash: params.transactionHash,
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (
      name === "TransactionReceiptNotFoundError" ||
      name === "WaitForTransactionReceiptTimeoutError"
    ) {
      return { ok: false, error: "receipt_not_found" };
    }
    console.error("verifyFactoryContestCreation rpc error:", error);
    return { ok: false, error: "rpc_error" };
  }

  if (receipt.status !== "success") {
    return { ok: false, error: "receipt_failed" };
  }

  const created = matchingFactoryCreatedContest(
    receipt,
    factoryAddress,
    params.claimedAddress,
  );
  if (!created) {
    const factoryLogs = parseEventLogs({
      abi: factoryAbi,
      eventName: "ContestCreated",
      logs: receipt.logs,
    }).filter((log) => getAddress(log.address) === factoryAddress);
    return {
      ok: false,
      error: factoryLogs.length > 0 ? "address_mismatch" : "not_factory_contest",
    };
  }

  try {
    const [operatorRaw, paymentTokenRaw] = await Promise.all([
      publicClient.readContract({
        address: created,
        abi: contestAbi,
        functionName: "operator",
      }) as Promise<`0x${string}`>,
      publicClient.readContract({
        address: created,
        abi: contestAbi,
        functionName: "paymentToken",
      }) as Promise<`0x${string}`>,
    ]);
    const operator = getAddress(operatorRaw);
    const paymentToken = getAddress(paymentTokenRaw);
    if (operator !== getAddress(expectedOperator)) {
      return { ok: false, error: "operator_mismatch" };
    }
    if (paymentToken !== getAddress(expectedToken)) {
      return { ok: false, error: "token_mismatch" };
    }
    return { ok: true, contestAddress: created, operator, paymentToken };
  } catch (error) {
    console.error("verifyFactoryContestCreation clone read error:", error);
    return { ok: false, error: "rpc_error" };
  }
}
