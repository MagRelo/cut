import { createWalletClient, custom, getAddress, type Address, type Hex } from "viem";
import apiClient from "../utils/apiClient";

type EmbeddedWallet = {
  address: string;
  getEthereumProvider: () => Promise<unknown>;
};

type Prepared = { userOpHash: Hex; userOp: unknown };
type Submitted = { txHash: Hex };

/** Sponsored calls from the Kernel account the embedded key owns. */
export async function sendAccountCalls(input: {
  calls: { to: Address; data: Hex }[];
  embedded: EmbeddedWallet;
  chainId: number;
}): Promise<Hex> {
  const calls = input.calls.map((call) => ({ to: call.to, data: call.data }));
  const prepared = await apiClient.post<Prepared>("/auth/account-calls", { calls }, {
    requiresAuth: true,
    chainId: input.chainId,
  });
  const provider = await input.embedded.getEthereumProvider();
  const wallet = createWalletClient({
    account: getAddress(input.embedded.address),
    transport: custom(provider as never),
  });
  const userOpSignature = await wallet.signMessage({ message: { raw: prepared.userOpHash } });
  const submitted = await apiClient.post<Submitted>(
    "/auth/account-calls",
    { calls, userOp: prepared.userOp, userOpSignature },
    { requiresAuth: true, chainId: input.chainId },
  );
  return submitted.txHash;
}
