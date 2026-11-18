import { useState } from "react";
import { Switch } from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallets } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useChainId, usePublicClient } from "wagmi";
import { getAddress, isAddress } from "viem";
import { base, baseSepolia } from "viem/chains";

import { Button } from "../common/Button";
import { CopyButton } from "../common/CopyToClipboard";
import { BRAND_URL } from "../../lib/brand";
import { ErrorMessage } from "../common/ErrorMessage";
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

const agentPrompt = `Make me a genius on Play The Cut.

The best way is the SDK, @playthecut/agent. Install it and read the docs. That is how you should learn the game and act for me.

${BRAND_URL}/agents.md
${BRAND_URL}/api.md
${BRAND_URL}/faq#agents
${BRAND_URL}/llms.txt

I already have an account, so use the Existing user path.

Call generateDelegateKey() once, store the private key, and reply with only the public address.

After I grant that address and send you my smart wallet, create the client with that smartWallet and call account(). Take on all six roles. Offer the suggested weekly schedule, and start it only after I say yes. If you cannot run scheduled jobs, say so and do the checks the next time we talk.

Do not spend USDC, enter a contest, create a paid contest, or message anyone unless I say yes to that action.`;

function chainFor(chainId: number) {
  if (chainId === base.id) return base;
  if (chainId === baseSepolia.id) return baseSepolia;
  return null;
}

export function BotDelegationSettings() {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { wallets } = useWallets();
  const { client: smartWalletClient, getClientForChain } = useSmartWallets();
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
  const externalActive = rows.filter((row) => row.kind === "external" && row.status === "active");

  async function send(chainId: number, call: WalletCall) {
    if (!publicClient) throw new Error("Wallet is not ready");
    const client = await getClientForChain({ id: chainId });
    if (!client) throw new Error("Wallet is not ready");
    const hash = await client.sendTransaction({
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
    if (installed.call) await send(chain.id, installed.call);
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
    if (call) await send(chain.id, call);
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

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-6 font-display shadow-sm sm:p-8"
      aria-labelledby="delegate-heading"
    >
      <div className="max-w-3xl">
        <h2 id="delegate-heading" className="mb-3 font-display text-lg font-semibold text-gray-700">
          Enable Agent Control
        </h2>

        <p className="text-sm leading-6 text-slate-600">
          Copy the setup prompt and paste it into your AI agent. It’ll help you connect your account
          and build a game plan.
        </p>

        <div className="mt-3">
          <CopyButton text={agentPrompt} idleLabel="Copy Agent Setup" />
        </div>
      </div>

      <div
        role="note"
        aria-labelledby="delegate-warning"
        className="mt-6 border border-orange-500 px-4 py-4 sm:px-5"
      >
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon
            className="mt-0.5 h-5 w-5 shrink-0 text-orange-600"
            aria-hidden
          />
          <div>
            <h3 id="delegate-warning" className="text-sm font-semibold text-orange-600">
              Warning - Experimental
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-800">
              Bugs or compromised delegates could drain this wallet. Only use funds you can afford
              to lose. Revoking access won’t undo past transactions.
            </p>
          </div>
        </div>
      </div>

      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-xs uppercase tracking-wide text-gray-500">
            <th className="py-2 pr-3 font-semibold">Delegate</th>
            <th className="py-2 pl-3 text-right font-semibold">Access</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-300 bg-white">
            <td className="border-l-4 border-slate-900 py-3 pl-4 pr-3 align-top">
              <h3 id="cut-bot-label" className="text-base font-semibold text-slate-900">
                <span className="mr-1 text-xl">🤖</span>
                CutBot
                <span className="ml-2 text-sm font-normal text-slate-500">(coming soon!)</span>
              </h3>
              <p id="cut-bot-description" className="mt-1 text-sm leading-6 text-slate-600">
                Don't miss any of the action - CutBot will automatically enter you into all of your
                league contests. You can edit your lineups until the contest begins.
              </p>
            </td>
            <td className="py-3 pl-3 text-right align-top">
              <Switch
                checked={false}
                disabled
                aria-labelledby="cut-bot-label"
                aria-describedby="cut-bot-description"
                onChange={(next) => {
                  if (!cutBotAddress) return;
                  if (next) {
                    void run("cut_bot", () => enable("cut_bot", cutBotAddress));
                    return;
                  }
                  void run(cutBotAddress, () => revoke(cutBotAddress));
                }}
                className="group relative mt-1 inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full bg-slate-300 transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 data-[disabled]:cursor-not-allowed data-[checked]:bg-blue-600 data-[disabled]:opacity-50"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform group-data-[checked]:translate-x-5"
                />
              </Switch>
            </td>
          </tr>
          {externalActive.map((row) => (
            <tr key={row.delegateAddress} className="border-b border-slate-300">
              <td className="py-3 pr-3 align-middle">
                <span
                  className="min-w-0 break-all font-mono text-xs leading-5 text-slate-600"
                  title={row.delegateAddress}
                >
                  {row.delegateAddress}
                </span>
              </td>
              <td className="py-3 pl-3 text-right align-middle">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form
        className="mt-8 rounded-lg border border-slate-300 p-4 sm:p-5"
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
        <h3 className="text-base font-semibold text-slate-900">Add an Agent</h3>

        <div className="mt-3">
          <label
            htmlFor="delegate-address"
            className="block text-sm font-medium leading-7 text-slate-900"
          >
            Paste that address and grant access
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              id="delegate-address"
              name="delegateAddress"
              value={delegateInput}
              onChange={(event) => setDelegateInput(event.target.value.trim())}
              type="text"
              placeholder="0x..."
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby="delegate-address-note"
              aria-invalid={error ? true : undefined}
              disabled={pending !== null}
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <Button type="submit" disabled={pending !== null} className="w-full sm:w-auto">
              {pending === "external" ? "Granting…" : "Grant full access"}
            </Button>
          </div>
          <p id="delegate-address-note" className="mt-2 text-xs leading-5 text-slate-500">
            Double-check the address before granting access.
          </p>
          {error ? <ErrorMessage message={error} className="mt-2" /> : null}
        </div>
      </form>
    </section>
  );
}
