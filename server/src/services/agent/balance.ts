import { erc20Abi, formatUnits, getAddress, isAddress } from "viem";
import { getPaymentTokenAddress } from "../../lib/contractAddresses.js";
import { getPublicClient } from "../shared/contractClient.js";
import { PAYMENT_TOKEN_DECIMALS, roundMoney } from "../../utils/paymentAmount.js";

/** USDC balance for the wallet, or null when the token or the read is unavailable. */
export async function readWalletUsdc(chainId: number, address: string): Promise<number | null> {
  const token = getPaymentTokenAddress(chainId);
  if (!token || !isAddress(address)) return null;
  try {
    const balance = await getPublicClient(chainId).readContract({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [getAddress(address)],
    });
    return roundMoney(Number(formatUnits(balance, PAYMENT_TOKEN_DECIMALS)));
  } catch {
    return null;
  }
}
