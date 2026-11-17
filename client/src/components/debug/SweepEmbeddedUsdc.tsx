import { useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useChainId, usePublicClient, useReadContract } from "wagmi";
import {
  createWalletClient,
  custom,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  getAddress,
  parseSignature,
  toHex,
  type Hex,
} from "viem";
import { base, baseSepolia } from "viem/chains";

import { Button } from "../common/Button";
import { ErrorMessage } from "../common/ErrorMessage";
import { PageSection } from "../layout/PageSection";
import { PAYMENT_TOKEN_DECIMALS } from "../../lib/paymentTokenSpend";
import { getContractAddress } from "../../utils/blockchainUtils";

const versionAbi = [
  {
    type: "function",
    name: "version",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

const transferWithAuthorizationAbi = [
  {
    type: "function",
    name: "transferWithAuthorization",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

const authorizationTypes = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

function chainFor(chainId: number) {
  if (chainId === base.id) return base;
  if (chainId === baseSepolia.id) return baseSepolia;
  return null;
}

function txUrl(chainId: number, hash: Hex): string | null {
  if (chainId === base.id) return `https://base.blockscout.com/tx/${hash}`;
  if (chainId === baseSepolia.id) return `https://base-sepolia.blockscout.com/tx/${hash}`;
  return null;
}

function randomNonce(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes, { size: 32 });
}

export function SweepEmbeddedUsdc() {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { wallets } = useWallets();
  const { client: smartWalletClient, getClientForChain } = useSmartWallets();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<Hex | null>(null);

  const embedded = wallets.find(
    (wallet) => wallet.type === "ethereum" && wallet.walletClientType === "privy",
  );
  const smartWallet = smartWalletClient?.account?.address;
  const tokenAddress = getContractAddress(chainId, "paymentTokenAddress");
  const token = tokenAddress ? getAddress(tokenAddress) : undefined;
  const embeddedAddress = embedded ? getAddress(embedded.address) : undefined;
  const sameWallet =
    embeddedAddress && smartWallet
      ? embeddedAddress.toLowerCase() === smartWallet.toLowerCase()
      : false;

  const balance = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: embeddedAddress ? [embeddedAddress] : undefined,
    query: { enabled: Boolean(token && embeddedAddress && !sameWallet) },
  });

  const amount = balance.data ?? 0n;
  const receiptUrl = hash ? txUrl(chainId, hash) : null;

  async function sweep() {
    const chain = chainFor(chainId);
    if (!chain || !publicClient || !token || !embedded || !embeddedAddress || !smartWallet) {
      throw new Error("Wallet is not ready");
    }
    if (amount <= 0n) throw new Error("Embedded wallet has no payment token");
    const destination = getAddress(smartWallet);
    const name = await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "name",
    });
    let version = "2";
    try {
      version = await publicClient.readContract({
        address: token,
        abi: versionAbi,
        functionName: "version",
      });
    } catch {
      version = "2";
    }
    const nonce = randomNonce();
    const validAfter = 0n;
    const validBefore = BigInt(Math.floor(Date.now() / 1000) + 60 * 60);
    const provider = await embedded.getEthereumProvider();
    const signer = createWalletClient({
      account: embeddedAddress,
      chain,
      transport: custom(provider),
    });
    const signature = await signer.signTypedData({
      account: embeddedAddress,
      domain: { name, version, chainId: chain.id, verifyingContract: token },
      types: authorizationTypes,
      primaryType: "TransferWithAuthorization",
      message: {
        from: embeddedAddress,
        to: destination,
        value: amount,
        validAfter,
        validBefore,
        nonce,
      },
    });
    const parsed = parseSignature(signature);
    const v = Number(parsed.v ?? (parsed.yParity === 0 ? 27 : 28));
    const client = await getClientForChain({ id: chain.id });
    if (!client) throw new Error("Smart wallet is not ready");
    const submitted = await client.sendTransaction({
      calls: [
        {
          to: token,
          value: 0n,
          data: encodeFunctionData({
            abi: transferWithAuthorizationAbi,
            functionName: "transferWithAuthorization",
            args: [
              embeddedAddress,
              destination,
              amount,
              validAfter,
              validBefore,
              nonce,
              v,
              parsed.r,
              parsed.s,
            ],
          }),
        },
      ],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: submitted });
    if (receipt.status === "reverted") throw new Error("Transaction reverted");
    setHash(submitted);
    await balance.refetch();
  }

  if (!embeddedAddress || !smartWallet || sameWallet) return null;

  return (
    <PageSection>
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Embedded wallet balance</h2>
      <div className="space-y-2 text-sm text-gray-800">
        <div>
          <strong>Embedded signer:</strong> <span className="font-mono">{embeddedAddress}</span>
        </div>
        <div>
          <strong>Smart wallet:</strong> <span className="font-mono">{smartWallet}</span>
        </div>
        <div>
          <strong>Embedded balance:</strong>{" "}
          {balance.isLoading ? "Loading..." : `${formatUnits(amount, PAYMENT_TOKEN_DECIMALS)} USDC`}
        </div>
        <p>
          The embedded signer signs a USDC authorization. The smart wallet submits it, and the
          paymaster sponsors the gas. The tokens move to the smart wallet.
        </p>
        <Button
          type="button"
          disabled={pending || amount <= 0n || !chainFor(chainId)}
          onClick={() => {
            setPending(true);
            setError(null);
            void sweep()
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Could not move the balance");
              })
              .finally(() => setPending(false));
          }}
        >
          {pending ? "Waiting for signature" : "Move embedded USDC to smart wallet"}
        </Button>
        {error ? <ErrorMessage message={error} /> : null}
        {receiptUrl ? (
          <div>
            <a className="text-blue-600 hover:underline" href={receiptUrl}>
              {hash}
            </a>
          </div>
        ) : null}
      </div>
    </PageSection>
  );
}
