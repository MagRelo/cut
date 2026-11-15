import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallets } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useChainId, usePublicClient } from "wagmi";
import { getAddress, isAddress } from "viem";
import { base, baseSepolia } from "viem/chains";

import { Button } from "../common/Button";
import { ErrorMessage } from "../common/ErrorMessage";
import { PageSection } from "../layout/PageSection";
import {
  prepareBotSessionKey,
  prepareBotSessionRevoke,
  type WalletCall,
} from "../../lib/botSessionKey";
import apiClient from "../../utils/apiClient";

type DelegateRow = {
  delegateAddress: string;
  kind: "cut_bot" | "external";
  status: string;
};

type DelegateResponse = {
  delegates: DelegateRow[];
  cutBotAddress: string | null;
};

const queryKey = ["bot-delegates"] as const;

function sameAddress(left: string, right: string) {
  return isAddress(left) && isAddress(right) && getAddress(left) === getAddress(right);
}

function chainFor(chainId: number) {
  if (chainId === base.id) return base;
  if (chainId === baseSepolia.id) return baseSepolia;
  return null;
}

export function BotDelegationSettings() {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { wallets } = useWallets();
  const { client: smartWalletClient } = useSmartWallets();
  const queryClient = useQueryClient();
  const [delegateInput, setDelegateInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const delegates = useQuery({
    queryKey,
    queryFn: () => apiClient.get<DelegateResponse>("/bot/delegates", { requiresAuth: true }),
  });

  const smartWallet = smartWalletClient?.account?.address;
  const embedded = wallets.find(
    (wallet) => wallet.type === "ethereum" && wallet.walletClientType === "privy",
  );
  const rows = delegates.data?.delegates ?? [];
  const cutBotAddress = delegates.data?.cutBotAddress ?? null;
  const cutBotActive = rows.some((row) => row.kind === "cut_bot" && row.status === "active");
  const externalActive = rows.filter((row) => row.kind === "external" && row.status === "active");

  async function send(call: WalletCall) {
    if (!smartWalletClient || !publicClient) throw new Error("Wallet is not ready");
    if (!("paymaster" in smartWalletClient) || !smartWalletClient.paymaster) {
      throw new Error(
        "Privy has no paymaster for this chain. The wallet has no ETH, so this transaction cannot be sponsored.",
      );
    }
    const hash = await smartWalletClient.sendTransaction({
      calls: [{ to: call.to, data: call.data, value: 0n }],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") throw new Error("Transaction reverted");
  }

  async function enable(kind: "cut_bot" | "external", delegateAddress: string) {
    const chain = chainFor(chainId);
    if (!chain || !smartWallet || !embedded) {
      throw new Error("Wallet is not ready");
    }
    const owner = await embedded.getEthereumProvider();
    const installed = await prepareBotSessionKey({
      chain,
      owner: owner as unknown as Parameters<typeof prepareBotSessionKey>[0]["owner"],
      ownerAddress: getAddress(embedded.address),
      smartWallet: getAddress(smartWallet),
      delegateAddress: getAddress(delegateAddress),
    });
    await send(installed.call);
    await apiClient.post(
      "/bot/delegates",
      {
        kind,
        delegateAddress,
        smartWallet,
        approval: installed.approval,
        permissionId: installed.permissionId,
      },
      { requiresAuth: true },
    );
  }

  async function revoke(delegateAddress: string) {
    const chain = chainFor(chainId);
    if (!chain || !smartWallet) {
      throw new Error("Wallet is not ready");
    }
    const call = await prepareBotSessionRevoke({
      chain,
      smartWallet: getAddress(smartWallet),
      delegateAddress: getAddress(delegateAddress),
    });
    await send(call);
    await apiClient.post("/bot/delegates/revoke", { delegateAddress }, { requiresAuth: true });
  }

  async function run(key: string, task: () => Promise<void>) {
    setPending(key);
    setError(null);
    try {
      await task();
      await queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the delegate");
    } finally {
      setPending(null);
    }
  }

  const cutBotBusy =
    pending === "cut_bot" ||
    (cutBotAddress !== null && pending !== null && sameAddress(pending, cutBotAddress));
  const toggleDisabled = !delegates.isSuccess || !cutBotAddress || pending !== null;

  return (
    <PageSection variant="card">
      <h2 className="mb-3 font-display text-lg font-semibold text-gray-700">Delegates</h2>

      <p className="mb-4 pl-3 font-display text-sm text-gray-700">
        A delegate is a blank check on this wallet. It can sign any transaction, including sending
        funds. Turn it off to remove the key.
      </p>

      <div className="space-y-6 pl-3">
        <section className="space-y-2">
          <h3 id="cut-bot-label" className="font-display text-sm font-semibold text-gray-900">
            Cut Bot
          </h3>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4">
            <p className="font-display text-sm text-gray-700">
              The server signs while you are away.
              {cutBotAddress ? (
                <span className="mt-0.5 block truncate font-mono text-xs text-gray-600">
                  {cutBotAddress}
                </span>
              ) : (
                <span className="mt-0.5 block text-xs text-gray-600">
                  Not configured on the server
                </span>
              )}
            </p>
            <button
              type="button"
              role="switch"
              aria-labelledby="cut-bot-label"
              aria-checked={cutBotActive}
              aria-busy={cutBotBusy}
              disabled={toggleDisabled}
              onClick={() => {
                if (!cutBotAddress) return;
                if (cutBotActive) {
                  void run(cutBotAddress, () => revoke(cutBotAddress));
                  return;
                }
                void run("cut_bot", () => enable("cut_bot", cutBotAddress));
              }}
              className={`relative h-7 w-12 shrink-0 rounded-full border border-slate-900 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                cutBotActive ? "bg-slate-900" : "bg-white"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full border border-slate-900 transition-transform ${
                  cutBotActive ? "translate-x-6 bg-white" : "translate-x-0.5 bg-slate-900"
                }`}
              />
              <span className="sr-only">{cutBotActive ? "Revoke Cut Bot" : "Allow Cut Bot"}</span>
            </button>
          </div>
        </section>

        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isAddress(delegateInput)) {
              setError("Enter a valid address");
              return;
            }
            void run("external", async () => {
              await enable("external", delegateInput);
              setDelegateInput("");
            });
          }}
        >
          <h3 className="font-display text-sm font-semibold text-gray-900">BYO</h3>
          <p className="font-display text-sm text-gray-700">
            Paste a public address. That bot signs with its own key.
          </p>
          <label htmlFor="personal-delegate" className="sr-only">
            Delegate address
          </label>
          <input
            id="personal-delegate"
            value={delegateInput}
            onChange={(event) => setDelegateInput(event.target.value.trim())}
            placeholder="0x…"
            className="mt-1 block w-full rounded-sm border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            autoComplete="off"
            spellCheck={false}
            disabled={pending !== null}
          />

          {externalActive.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {externalActive.map((row) => (
                <li
                  key={row.delegateAddress}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4"
                >
                  <span
                    className="truncate font-mono text-xs text-gray-800"
                    title={row.delegateAddress}
                  >
                    {row.delegateAddress}
                  </span>
                  <Button
                    type="button"
                    variant="neutral"
                    size="compact"
                    disabled={pending !== null}
                    onClick={() => {
                      void run(row.delegateAddress, () => revoke(row.delegateAddress));
                    }}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4">
            <div className="flex flex-col items-center gap-2 pt-4">
              <Button type="submit" disabled={pending !== null} className="min-w-[120px]">
                {pending === "external" ? "Allowing..." : "Allow address"}
              </Button>
              {error ? <ErrorMessage message={error} className="text-center" /> : null}
            </div>
          </div>
        </form>
      </div>
    </PageSection>
  );
}
