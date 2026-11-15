import { createPublicClient, http, type Address, type Hex, type LocalAccount } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { createKernelAccountClient } from "@zerodev/sdk";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { deserializePermissionAccount } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { getChainConfig } from "../../lib/chainConfig.js";
import type { BotCall } from "./botCalls.js";

const entryPoint = {
  address: entryPoint07Address,
  version: "0.7" as const,
};

export type SubmitSessionKeyInput = {
  chainId: number;
  approval: string;
  calls: BotCall[];
  delegateAddress: Address;
  privateKey?: Hex;
  userOpSignature?: Hex;
};

/** ZeroDev's default asks for `zd_getUserOperationGasPrice`, which Pimlico does not serve. */
async function pimlicoUserOperationGas(bundlerClient: {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}) {
  const gasPrice = (await bundlerClient.request({
    method: "pimlico_getUserOperationGasPrice",
    params: [],
  })) as {
    standard: { maxFeePerGas: `0x${string}`; maxPriorityFeePerGas: `0x${string}` };
  };
  return {
    maxFeePerGas: BigInt(gasPrice.standard.maxFeePerGas),
    maxPriorityFeePerGas: BigInt(gasPrice.standard.maxPriorityFeePerGas),
  };
}

function bundlerUrl(): string | null {
  const url = process.env.PIMLICO_BUNDLER_URL?.trim();
  return url || null;
}

/**
 * Submit calls already authorized by a session key.
 * Cut Bot passes its private key. A personal delegate passes the userOp signature.
 */
export async function submitSessionKeyUserOp(
  input: SubmitSessionKeyInput,
): Promise<{ ok: true; txHash: Hex } | { ok: false; error: string }> {
  const bundler = bundlerUrl();
  if (!bundler) {
    return { ok: false, error: "Bundler is not configured" };
  }
  if (!input.privateKey && !input.userOpSignature) {
    return { ok: false, error: "Missing session key signature" };
  }

  try {
    const chainConfig = getChainConfig(input.chainId);
    const publicClient = createPublicClient({
      chain: chainConfig.chain,
      transport: http(chainConfig.rpcUrl),
    });
    const signer = input.privateKey
      ? privateKeyToAccount(input.privateKey)
      : fixedSignatureAccount(input.delegateAddress, input.userOpSignature as Hex);
    const modularSigner = await toECDSASigner({ signer });
    const account = await deserializePermissionAccount(
      publicClient,
      entryPoint,
      KERNEL_V3_1,
      input.approval,
      modularSigner,
    );
    const sponsorshipPolicyId = process.env.PIMLICO_SPONSORSHIP_POLICY_ID?.trim();
    const kernelClient = createKernelAccountClient({
      account,
      chain: chainConfig.chain,
      bundlerTransport: http(bundler),
      userOperation: {
        estimateFeesPerGas: async ({ bundlerClient }) =>
          pimlicoUserOperationGas(
            bundlerClient as {
              request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
            },
          ),
      },
      paymaster: sponsorshipPolicyId ? true : undefined,
      paymasterContext: sponsorshipPolicyId ? { sponsorshipPolicyId } : undefined,
    });
    const userOpHash = await kernelClient.sendUserOperation({
      callData: await account.encodeCalls(
        input.calls.map((call) => ({
          to: call.to,
          value: call.value,
          data: call.data,
        })),
      ),
    });
    const receipt = await kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
    return { ok: true, txHash: receipt.receipt.transactionHash };
  } catch (error) {
    const message = error instanceof Error ? error.message : "User operation failed";
    return { ok: false, error: message };
  }
}

function fixedSignatureAccount(address: Address, signature: Hex): LocalAccount {
  return {
    address,
    type: "local",
    source: "custom",
    publicKey: "0x",
    sign: async () => signature,
    signMessage: async () => signature,
    signTypedData: async () => signature,
    signTransaction: async () => {
      throw new Error("Session key does not sign transactions");
    },
  };
}
