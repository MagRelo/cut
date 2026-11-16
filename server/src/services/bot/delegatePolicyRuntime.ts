import { getAddress, isAddress, zeroAddress, type Address, type Hex } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { addressToEmptyAccount, KernelV3_1AccountAbi } from "@zerodev/sdk";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { getContestFactoryAddress } from "../../lib/contractAddresses.js";
import { getPublicClient } from "../shared/contractClient.js";
import { DELEGATE_POLICY_FLAG, type ApprovalCheckDeps } from "./delegatePolicy.js";

const entryPoint = { address: entryPoint07Address, version: "0.7" as const };

const delegatePolicyGetterAbi = [
  {
    type: "function",
    name: "delegatePolicy",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/** Found addresses only; a factory without the getter is re-read so a redeploy is picked up. */
const policyCache = new Map<string, Address>();

/**
 * TODO(deploy): the factories in server/src/contracts/{base,sepolia}.json predate
 * `delegatePolicy()`, so this returns null (delegateAdd answers 503) until a new ContestFactory
 * is deployed and `contestFactoryAddress` points at it.
 *
 * `ContestFactory.delegatePolicy()` for the chain's configured factory. Null when the chain has
 * no factory, the factory predates the policy (no getter), or the policy has no code.
 */
export async function readDelegatePolicyAddress(chainId: number): Promise<Address | null> {
  const factory = getContestFactoryAddress(chainId);
  if (!factory) return null;
  const key = `${chainId}:${factory.toLowerCase()}`;
  const cached = policyCache.get(key);
  if (cached) return cached;
  const publicClient = getPublicClient(chainId);
  let policy: Address;
  try {
    policy = await publicClient.readContract({
      address: factory,
      abi: delegatePolicyGetterAbi,
      functionName: "delegatePolicy",
    });
  } catch {
    return null;
  }
  if (!isAddress(policy) || policy === zeroAddress) return null;
  const code = await publicClient.getCode({ address: policy });
  if (!code || code === "0x") return null;
  const address = getAddress(policy);
  policyCache.set(key, address);
  return address;
}

export function createApprovalCheckDeps(): ApprovalCheckDeps {
  return {
    delegatePolicyAddress: readDelegatePolicyAddress,
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
  contestFactory: Address;
  /** NoSelfCallPolicy from `ContestFactory.delegatePolicy()`; null until the factory has one. */
  policyAddress: Address | null;
  /** Kernel policy flag to install it with (always 0x0000). */
  policyFlag: Hex;
};

/** What an owner needs to build the delegate permission. */
export async function readDelegatePolicyInfo(chainId: number): Promise<DelegatePolicyInfo | null> {
  const contestFactory = getContestFactoryAddress(chainId);
  if (!contestFactory) return null;
  return {
    chainId,
    contestFactory,
    policyAddress: await readDelegatePolicyAddress(chainId),
    policyFlag: DELEGATE_POLICY_FLAG,
  };
}
