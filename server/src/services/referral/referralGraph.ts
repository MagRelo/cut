import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  hashTypedData,
  http,
  keccak256,
  parseAbiParameters,
  zeroAddress,
  zeroHash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChainConfig } from "../../lib/chainConfig.js";
import { getOperatorPrivateKey } from "../../lib/operator.js";
import ReferralGraph from "../../contracts/ReferralGraph.json" with { type: "json" };

/** Referral txs are signed by the operator key. */

export function getReferralWalletClient(chainId: number) {
  const { chain, rpcUrl } = getChainConfig(chainId);
  const account = privateKeyToAccount(getOperatorPrivateKey());
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
  return { walletClient, account, chain };
}

export function getReferralPublicClient(chainId: number) {
  const { chain, rpcUrl } = getChainConfig(chainId);
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

export async function referralGraphIsRegistered(
  chainId: number,
  contractAddress: `0x${string}`,
  userAddress: `0x${string}`,
  groupId: Hex,
): Promise<boolean> {
  const publicClient = getReferralPublicClient(chainId);
  return publicClient.readContract({
    address: contractAddress,
    abi: ReferralGraph.abi,
    functionName: "isRegistered",
    args: [userAddress, groupId],
  }) as Promise<boolean>;
}

export async function referralGraphGetReferrer(
  chainId: number,
  contractAddress: `0x${string}`,
  userAddress: `0x${string}`,
  groupId: Hex,
): Promise<`0x${string}`> {
  const publicClient = getReferralPublicClient(chainId);
  const referrer = (await publicClient.readContract({
    address: contractAddress,
    abi: ReferralGraph.abi,
    functionName: "getReferrer",
    args: [userAddress, groupId],
  })) as string;
  return referrer.toLowerCase() as `0x${string}`;
}

export async function referralGraphRegister(
  chainId: number,
  contractAddress: `0x${string}`,
  userAddress: `0x${string}`,
  referrer: `0x${string}`,
  groupId: Hex,
): Promise<Hex> {
  const { walletClient, chain } = getReferralWalletClient(chainId);
  const publicClient = getReferralPublicClient(chainId);
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: ReferralGraph.abi,
    functionName: "register",
    args: [userAddress, referrer, groupId],
    chain,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function referralGraphBatchRegister(
  chainId: number,
  contractAddress: `0x${string}`,
  userAddresses: `0x${string}`[],
  referrer: `0x${string}`,
  groupId: Hex,
): Promise<Hex> {
  const { walletClient, chain } = getReferralWalletClient(chainId);
  const publicClient = getReferralPublicClient(chainId);
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: ReferralGraph.abi,
    functionName: "batchRegister",
    args: [userAddresses, referrer, groupId],
    chain,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/** Inclusive signature window passed as `referralDeadline` on `settleContest`. */
export const REFERRAL_REWARD_DEADLINE_SECONDS = 3600n;

const REWARD_ROOTS_TYPES = {
  RewardRoots: [
    { name: "groupId", type: "bytes32" },
    { name: "rewardId", type: "bytes32" },
    { name: "user", type: "address" },
    { name: "token", type: "address" },
    { name: "totalAmount", type: "uint256" },
    { name: "payer", type: "address" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export type RewardRootsMessage = {
  groupId: Hex;
  rewardId: Hex;
  user: `0x${string}`;
  token: `0x${string}`;
  totalAmount: bigint;
  payer: `0x${string}`;
  deadline: bigint;
};

/** `keccak256(abi.encode("contest-catalyst", contest, nonce))`. Nonce `0` is the usual id. */
export function referralRewardId(contest: `0x${string}`, nonce: Hex): Hex {
  return keccak256(
    encodeAbiParameters(parseAbiParameters("string, address, bytes32"), [
      "contest-catalyst",
      contest,
      nonce,
    ]),
  );
}

/** Gross referral fee. Repay between primary and secondary does not change this sum. */
export function quoteReferralFee(
  primaryPrizePool: bigint,
  totalSecondaryLiquidity: bigint,
  referralNetworkBps: bigint,
): bigint {
  return ((primaryPrizePool + totalSecondaryLiquidity) * referralNetworkBps) / 10_000n;
}

/**
 * Primary winner is the largest `payoutBps`. A tie keeps the earlier entry.
 * Matches `ContestController._primaryWinnerEntry`.
 */
export function primaryWinnerEntryId(
  winningEntries: readonly string[],
  payoutBps: readonly number[],
): string | null {
  let bestIndex = -1;
  let bestBps = -1;
  for (let i = 0; i < winningEntries.length; i++) {
    const bps = payoutBps[i] ?? 0;
    if (bps > bestBps) {
      bestBps = bps;
      bestIndex = i;
    }
  }
  if (bestIndex < 0) return null;
  return winningEntries[bestIndex] ?? null;
}

export function rewardRootsDomain(chainId: number, graphAddress: `0x${string}`) {
  return {
    name: "ReferralGraph",
    version: "1",
    chainId,
    verifyingContract: graphAddress,
  } as const;
}

export function hashRewardRoots(
  chainId: number,
  graphAddress: `0x${string}`,
  message: RewardRootsMessage,
): Hex {
  return hashTypedData({
    domain: rewardRootsDomain(chainId, graphAddress),
    types: REWARD_ROOTS_TYPES,
    primaryType: "RewardRoots",
    message,
  });
}

/** Operator signs. The contest submits `rewardRoots` and is the payer. */
export async function signRewardRoots(
  chainId: number,
  graphAddress: `0x${string}`,
  message: RewardRootsMessage,
): Promise<{ signature: Hex; oracle: `0x${string}` }> {
  const { walletClient, account } = getReferralWalletClient(chainId);
  const signature = await walletClient.signTypedData({
    account,
    domain: rewardRootsDomain(chainId, graphAddress),
    types: REWARD_ROOTS_TYPES,
    primaryType: "RewardRoots",
    message,
  });
  return { signature, oracle: account.address };
}

export type ReferralSettleAuth = {
  referralNonce: Hex;
  referralDeadline: bigint;
  referralOracle: `0x${string}`;
  referralSignature: Hex;
};

/**
 * Auth args for `settleContest`. A zero fee skips the signature; the contest ignores it
 * when the winner has no payable ancestors. A positive fee is signed with nonce 0.
 */
export async function buildReferralSettleAuth(params: {
  chainId: number;
  contestAddress: `0x${string}`;
  graphAddress: `0x${string}` | null;
  groupId: Hex;
  winner: `0x${string}`;
  token: `0x${string}`;
  referralFee: bigint;
  deadline: bigint;
}): Promise<{ ok: true; auth: ReferralSettleAuth } | { ok: false; error: string }> {
  if (params.referralFee === 0n) {
    return {
      ok: true,
      auth: {
        referralNonce: zeroHash,
        referralDeadline: 0n,
        referralOracle: zeroAddress,
        referralSignature: "0x",
      },
    };
  }

  if (!params.graphAddress) {
    return {
      ok: false,
      error: `No referralGraphAddress configured for chain ${params.chainId}`,
    };
  }

  const referralNonce = zeroHash;
  const signed = await signRewardRoots(params.chainId, params.graphAddress, {
    groupId: params.groupId,
    rewardId: referralRewardId(params.contestAddress, referralNonce),
    user: params.winner,
    token: params.token,
    totalAmount: params.referralFee,
    payer: params.contestAddress,
    deadline: params.deadline,
  });

  return {
    ok: true,
    auth: {
      referralNonce,
      referralDeadline: params.deadline,
      referralOracle: signed.oracle,
      referralSignature: signed.signature,
    },
  };
}
