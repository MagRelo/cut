/**
 * Build signed ChainRewardData for settleContest when a payable referral chain exists.
 */

import { encodePacked, getAddress, keccak256, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import ReferralGraph from "../../contracts/ReferralGraph.json" with { type: "json" };
import {
  getReferralGraphAddress,
  REFERRAL_ROOT,
} from "../../lib/referralConfig.js";
import { getReferralOraclePrivateKey } from "../referral/referralGraph.js";
import { getContestContract, getPublicClient } from "../shared/contractClient.js";

export type ChainRewardDataTuple = {
  user: `0x${string}`;
  totalAmount: bigint;
  rewardToken: `0x${string}`;
  groupId: Hex;
  eventId: Hex;
};

const EMPTY_REFERRAL_REWARD: ChainRewardDataTuple = {
  user: "0x0000000000000000000000000000000000000000",
  totalAmount: 0n,
  rewardToken: "0x0000000000000000000000000000000000000000",
  groupId: `0x${"0".repeat(64)}` as Hex,
  eventId: `0x${"0".repeat(64)}` as Hex,
};

export type SettlementReferralArgs = {
  referralReward: ChainRewardDataTuple;
  referralSignature: Hex;
};

export async function buildSettlementReferralArgs(params: {
  contestAddress: string;
  chainId: number;
  winningEntryId: string;
}): Promise<SettlementReferralArgs> {
  const { contestAddress, chainId, winningEntryId } = params;
  const contract = getContestContract(contestAddress, chainId);
  const publicClient = getPublicClient(chainId);

  const [
    referralNetworkBps,
    referralGroupId,
    paymentToken,
    primarySideBalance,
    secondarySideBalance,
    winnerOwner,
  ] = await Promise.all([
    contract.read.referralNetworkBps!() as Promise<bigint>,
    contract.read.referralGroupId!() as Promise<Hex>,
    contract.read.paymentToken!() as Promise<`0x${string}`>,
    contract.read.getPrimarySideBalance!() as Promise<bigint>,
    contract.read.getSecondarySideBalance!() as Promise<bigint>,
    contract.read.entryOwner!([BigInt(winningEntryId)]) as Promise<`0x${string}`>,
  ]);

  const totalGross = primarySideBalance + secondarySideBalance;
  if (referralNetworkBps === 0n || totalGross === 0n) {
    return { referralReward: EMPTY_REFERRAL_REWARD, referralSignature: "0x" };
  }

  const referralFee = (totalGross * referralNetworkBps) / 10_000n;
  if (referralFee === 0n) {
    return { referralReward: EMPTY_REFERRAL_REWARD, referralSignature: "0x" };
  }

  const winner = getAddress(winnerOwner);
  if (winner === "0x0000000000000000000000000000000000000000") {
    return { referralReward: EMPTY_REFERRAL_REWARD, referralSignature: "0x" };
  }

  const graphAddress = getReferralGraphAddress(chainId);
  if (!graphAddress) {
    return { referralReward: EMPTY_REFERRAL_REWARD, referralSignature: "0x" };
  }

  const payoutAnchor = (await publicClient.readContract({
    address: graphAddress,
    abi: ReferralGraph.abi,
    functionName: "getReferrer",
    args: [winner, referralGroupId],
  })) as `0x${string}`;

  const anchor = getAddress(payoutAnchor);
  if (anchor === REFERRAL_ROOT || anchor === "0x0000000000000000000000000000000000000000") {
    return { referralReward: EMPTY_REFERRAL_REWARD, referralSignature: "0x" };
  }

  const block = await publicClient.getBlock();
  const eventId = keccak256(
    encodePacked(
      ["address", "uint256", "uint256"],
      [contestAddress as `0x${string}`, block.timestamp, BigInt(winningEntryId)],
    ),
  );

  const referralReward: ChainRewardDataTuple = {
    user: anchor,
    totalAmount: referralFee,
    rewardToken: getAddress(paymentToken),
    groupId: referralGroupId,
    eventId,
  };

  const rewardHash = keccak256(
    encodePacked(
      ["address", "uint256", "address", "bytes32", "bytes32"],
      [
        referralReward.user,
        referralReward.totalAmount,
        referralReward.rewardToken,
        referralReward.groupId,
        referralReward.eventId,
      ],
    ),
  );

  const account = privateKeyToAccount(getReferralOraclePrivateKey());
  const signature = await account.signMessage({
    message: { raw: rewardHash },
  });

  return { referralReward, referralSignature: signature };
}
