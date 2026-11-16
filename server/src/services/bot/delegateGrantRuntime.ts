import { getAddress, isAddress, type Address, type Hex } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { addressToEmptyAccount, KernelV3_1AccountAbi } from "@zerodev/sdk";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { getPaymentTokenAddress } from "../../lib/contractAddresses.js";
import { prisma } from "../../lib/prisma.js";
import { getPublicClient } from "../shared/contractClient.js";
import {
  DELEGATE_CALL_POLICY_ADDRESS,
  DELEGATE_CALL_POLICY_VERSION,
  DELEGATE_SIGNATURE_POLICY_ADDRESS,
  MAX_DELEGATE_CONTESTS,
  type ApprovalCheckDeps,
} from "./delegatePolicy.js";

const entryPoint = { address: entryPoint07Address, version: "0.7" as const };

export function createApprovalCheckDeps(): ApprovalCheckDeps {
  return {
    paymentToken: getPaymentTokenAddress,
    knownContests: async (chainId, addresses) => {
      const wanted = addresses.map((address) => address.toLowerCase());
      if (wanted.length === 0) return new Set();
      const rows = await prisma.contest.findMany({
        where: {
          chainId,
          OR: wanted.map((address) => ({
            address: { equals: address, mode: "insensitive" as const },
          })),
        },
        select: { address: true },
      });
      return new Set(rows.flatMap((row) => (row.address ? [row.address.toLowerCase()] : [])));
    },
    readPermissionConfig: async (chainId, smartWallet, permissionId) => {
      const publicClient = getPublicClient(chainId);
      const code = await publicClient.getCode({ address: smartWallet });
      if (!code || code === "0x") return null;
      const config = await publicClient.readContract({
        address: smartWallet,
        abi: KernelV3_1AccountAbi,
        functionName: "permissionConfig",
        args: [permissionId],
      });
      return { signer: getAddress(config.signer), policyData: [...config.policyData] as Hex[] };
    },
    permissionIdFor: async (chainId, delegateAddress, policies) => {
      const plugin = await toPermissionValidator(getPublicClient(chainId), {
        entryPoint,
        kernelVersion: KERNEL_V3_1,
        signer: await toECDSASigner({ signer: addressToEmptyAccount(delegateAddress) }),
        policies,
      });
      return plugin.getIdentifier() as Hex;
    },
  };
}

export type DelegatePolicyInfo = {
  chainId: number;
  paymentToken: Address;
  /** Open Cut contests on this chain, soonest end first, capped at maxContests. */
  contests: Address[];
  maxContests: number;
  callPolicy: { version: string; address: Address };
  signaturePolicy: { address: Address; allowedCallers: Address[] };
};

/** What an owner needs to build the grant. Contest addresses are public on-chain. */
export async function readDelegatePolicyInfo(chainId: number): Promise<DelegatePolicyInfo | null> {
  const paymentToken = getPaymentTokenAddress(chainId);
  if (!paymentToken) return null;
  const rows = await prisma.contest.findMany({
    where: { chainId, status: "OPEN", address: { not: null } },
    select: { address: true },
    orderBy: { endTime: "asc" },
    take: MAX_DELEGATE_CONTESTS,
  });
  return {
    chainId,
    paymentToken,
    contests: rows.flatMap((row) =>
      row.address && isAddress(row.address.toLowerCase())
        ? [getAddress(row.address.toLowerCase())]
        : [],
    ),
    maxContests: MAX_DELEGATE_CONTESTS,
    callPolicy: { version: DELEGATE_CALL_POLICY_VERSION, address: DELEGATE_CALL_POLICY_ADDRESS },
    signaturePolicy: { address: DELEGATE_SIGNATURE_POLICY_ADDRESS, allowedCallers: [] },
  };
}
