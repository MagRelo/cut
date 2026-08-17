import { getAddress, zeroAddress } from "viem";
import ContestController from "../../contracts/ContestController.json" with { type: "json" };
import { getPublicClient } from "../shared/contractClient.js";

export type EntryOwnerCheck =
  | { ok: true; owner: `0x${string}` }
  | { ok: false; error: "unowned" | "not_owner" | "rpc_error" };

export async function verifyPrimaryEntryOwner(params: {
  contestAddress: string;
  chainId: number;
  entryId: string;
  walletAddress: string;
}): Promise<EntryOwnerCheck> {
  try {
    const publicClient = getPublicClient(params.chainId);
    const owner = (await publicClient.readContract({
      address: params.contestAddress as `0x${string}`,
      abi: ContestController.abi,
      functionName: "entryOwner",
      args: [BigInt(params.entryId)],
    })) as `0x${string}`;

    if (!owner || getAddress(owner) === zeroAddress) {
      return { ok: false, error: "unowned" };
    }
    if (getAddress(owner) !== getAddress(params.walletAddress as `0x${string}`)) {
      return { ok: false, error: "not_owner" };
    }
    return { ok: true, owner };
  } catch (error) {
    console.error("verifyPrimaryEntryOwner error:", error);
    return { ok: false, error: "rpc_error" };
  }
}
