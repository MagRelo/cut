import { useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { CpuChipIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import { useSigners, useWallets } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";

import { Button } from "../common/Button";
import { CopyButton } from "../common/CopyToClipboard";
import { defaultPaymentTokenSymbol } from "../../config/targetChain";
import { BRAND_URL } from "../../lib/brand";
import { ErrorMessage } from "../common/ErrorMessage";
import { botDelegatesQueryKey, useBotDelegates } from "../../hooks/useActiveAgentControl";
import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../utils/apiClient";

const agentPrompt = `Make me a genius on Play The Cut.

The best way is the SDK, @playthecut/agent. Install it and read the docs. That is how you should learn the game and act for me.

${BRAND_URL}/access.md
${BRAND_URL}/agents.md
${BRAND_URL}/api.md
${BRAND_URL}/faq#agents
${BRAND_URL}/llms.txt

Call generateDelegateKey() once, store the private key, and reply with only the public key. I will paste that key in Account → Agents and choose Grant full access.

After I grant that key and send you my smart wallet, create the client with that smartWallet and call account(). Take on all six roles. Offer the suggested weekly schedule, and start it only after I say yes. If you cannot run scheduled jobs, say so and do the checks the next time we talk.

Do not spend USDC, enter a contest, create a paid contest, or message anyone unless I say yes to that action.`;

const PUBLIC_KEY_PREFIX = "MFkwEwYHKoZIzj0C";

function agentKeyLabel(publicKey: string): string {
  const unique = publicKey.startsWith(PUBLIC_KEY_PREFIX)
    ? publicKey.slice(PUBLIC_KEY_PREFIX.length)
    : publicKey;
  return unique.replace(/=+$/, "");
}

function looksLikePublicKey(value: string): boolean {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length >= 80 && value.length <= 200;
}

export function BotDelegationSettings() {
  const { wallets } = useWallets();
  const { addSigners, removeSigners } = useSigners();
  const { client: smartWalletClient } = useSmartWallets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [delegateInput, setDelegateInput] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [revokeWarning, setRevokeWarning] = useState<null | "active" | "pending" | "stuck">(null);

  const delegates = useBotDelegates();

  const embedded = wallets.find(
    (wallet) => wallet.type === "ethereum" && wallet.walletClientType === "privy",
  );
  const rows = delegates.data?.delegates ?? [];
  const active = rows.filter((row) => row.status === "active");
  const pendingRows = rows.filter((row) => row.status === "pending");
  const revoking = rows.filter((row) => row.status === "revoking");

  async function enable(publicKey: string) {
    if (!embedded || !smartWalletClient) throw new Error("Wallet is not ready");
    const prepared = await apiClient.post<{ quorumId: string }>(
      "/bot/delegates/quorum",
      { publicKey },
      { requiresAuth: true },
    );
    await addSigners({
      address: embedded.address,
      signers: [{ signerId: prepared.quorumId }],
    });
    await apiClient.post(
      "/bot/delegates",
      { publicKey, quorumId: prepared.quorumId },
      { requiresAuth: true },
    );
  }

  async function confirmSignerRemoval() {
    const confirmed = await apiClient.post<{ status: "revoked" | "revoking" }>(
      "/bot/delegates/revoke/confirm",
      {},
      { requiresAuth: true },
    );
    if (confirmed.status !== "revoked") {
      throw new Error("Removal from the wallet did not finish.");
    }
  }

  async function removeWalletSigners() {
    if (!embedded) throw new Error("Wallet is not ready");
    await removeSigners({ address: embedded.address });
    await confirmSignerRemoval();
  }

  async function revokeAll() {
    if (!embedded) throw new Error("Wallet is not ready");
    await apiClient.post("/bot/delegates/revoke", {}, { requiresAuth: true });
    await removeWalletSigners();
  }

  async function run(key: string, task: () => Promise<void>, scope: "field" | "action" = "action") {
    setPending(key);
    setFieldError(null);
    setActionError(null);
    try {
      await task();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update agent access";
      if (scope === "field") setFieldError(message);
      else setActionError(message);
    } finally {
      setPending(null);
      await queryClient.invalidateQueries({
        queryKey: user?.id ? botDelegatesQueryKey(user.id) : ["bot-delegates"],
      });
    }
  }

  function revokeWarningPanel(source: "active" | "pending" | "stuck") {
    if (revokeWarning !== source) return null;
    return (
      <>
        <div role="note" className="mt-4 border border-orange-500 px-4 py-3 sm:px-5">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon
              className="mt-0.5 h-5 w-5 shrink-0 text-orange-600"
              aria-hidden
            />
            <div>
              <h3 className="text-sm font-semibold text-orange-600">Revoke all agent access</h3>
              <p className="mt-1 text-sm leading-6 text-slate-800">
                Every agent will lose the ability to send {defaultPaymentTokenSymbol()}, enter or
                create a paid contest, and send messages.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button
            type="button"
            variant="neutral"
            disabled={pending !== null}
            onClick={() => {
              void run("revoke", revokeAll);
            }}
          >
            {pending === "revoke" ? "Revoking…" : "Revoke all agent access"}
          </Button>
        </div>
      </>
    );
  }

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-6 font-display shadow-sm sm:p-8"
      aria-labelledby="delegate-heading"
    >
      <h1 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-gray-900">
        <CpuChipIcon className="h-6 w-6 shrink-0" aria-hidden />
        Agents
      </h1>

      <div className="max-w-3xl">
        <p className="text-sm leading-6 text-slate-600">
          Use a personal agent to handle research, reminders, finding contests, etc.
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Copy and paste these instructions into your agent:
        </p>

        <div className="mt-3">
          <CopyButton text={agentPrompt} idleLabel="Copy Agent Instructions" />
        </div>

        <div
          role="note"
          aria-labelledby="delegate-warning"
          className="my-6 border border-orange-500 px-4 py-3 sm:px-5"
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
                Bugs or a compromised agent could drain this wallet. Only use funds you can afford
                to lose.
              </p>
            </div>
          </div>
        </div>
      </div>

      <form
        className="mt-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (!looksLikePublicKey(delegateInput)) {
            setActionError(null);
            setFieldError("Enter the agent's public key");
            return;
          }
          void run(
            "grant",
            async () => {
              await enable(delegateInput);
              setDelegateInput("");
            },
            "field",
          );
        }}
      >
        <h3 className="text-base font-semibold text-slate-900">Add an Agent</h3>

        <div className="mt-3">
          <label htmlFor="agent-public-key" className="text-sm font-medium text-slate-900">
            Public key
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              id="agent-public-key"
              name="publicKey"
              value={delegateInput}
              onChange={(event) => setDelegateInput(event.target.value.trim())}
              type="text"
              placeholder="Public key"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby="agent-public-key-note"
              aria-invalid={fieldError ? true : undefined}
              disabled={pending !== null}
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <Button type="submit" disabled={pending !== null} className="w-full sm:w-auto">
              {pending === "grant" ? "Granting…" : "Grant full access"}
            </Button>
          </div>
          <p id="agent-public-key-note" className="mt-2 text-xs leading-5 text-slate-500">
            This key can send {defaultPaymentTokenSymbol()}, enter a paid contest, create a paid
            contest, and send messages. Double-check the public key before granting access.
          </p>
          {fieldError ? <ErrorMessage message={fieldError} className="mt-2" /> : null}
        </div>

        {delegates.isError ? (
          <ErrorMessage message="Could not load agents" className="mt-4" />
        ) : null}
        {pendingRows.length > 0 ? (
          <div className="mt-6">
            <p className="text-sm leading-6 text-slate-800">Grant did not finish.</p>
            <ul className="mt-3 border-t border-slate-300">
              {pendingRows.map((row) => {
                const publicKey = agentKeyLabel(row.delegateAddress);
                return (
                  <li
                    key={row.delegateAddress}
                    className="flex flex-col gap-3 border-b border-slate-300 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0 break-all font-mono text-xs text-slate-800">
                      {publicKey}
                    </span>
                    <CopyButton text={publicKey} idleLabel="Copy public key" variant="secondary" />
                    <Button
                      type="button"
                      variant="neutral"
                      disabled={pending !== null}
                      onClick={() => {
                        void run("grant", () => enable(row.delegateAddress));
                      }}
                    >
                      {pending === "grant" ? "Granting…" : "Finish granting"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        {active.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-base font-semibold text-slate-900">Agents with access</h3>
            <ul className="mt-3 border-t border-slate-300">
              {active.map((row) => {
                const publicKey = agentKeyLabel(row.delegateAddress);
                return (
                  <li
                    key={row.delegateAddress}
                    className="flex flex-col gap-3 border-b border-slate-300 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0 break-all font-mono text-xs text-slate-800">
                      {publicKey}
                    </span>
                    <CopyButton text={publicKey} idleLabel="Copy public key" variant="secondary" />
                  </li>
                );
              })}
            </ul>
            <div className="mt-4">
              <Button
                type="button"
                variant="neutral"
                disabled={pending !== null}
                onClick={() => setRevokeWarning("active")}
              >
                Revoke all agent access
              </Button>
              {revokeWarningPanel("active")}
            </div>
          </div>
        ) : null}
        {revoking.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm leading-6 text-slate-800">
              Agents can no longer act in Play The Cut. Removal from the wallet did not finish.
            </p>
            <div className="mt-4">
              <Button
                type="button"
                variant="neutral"
                disabled={pending !== null}
                onClick={() => {
                  if (active.length > 0 || pendingRows.length > 0) {
                    setRevokeWarning("stuck");
                    return;
                  }
                  void run("remove", revokeAll);
                }}
              >
                {pending === "remove" ? "Removing…" : "Remove the key from the wallet"}
              </Button>
              {revokeWarningPanel("stuck")}
            </div>
          </div>
        ) : null}
        {pendingRows.length > 0 && active.length === 0 && revoking.length === 0 ? (
          <div className="mt-4">
            <Button
              type="button"
              variant="neutral"
              disabled={pending !== null}
              onClick={() => setRevokeWarning("pending")}
            >
              Remove the key from the wallet
            </Button>
            {revokeWarningPanel("pending")}
          </div>
        ) : null}
        {actionError ? <ErrorMessage message={actionError} className="mt-2" /> : null}
      </form>
    </section>
  );
}
