import { Fragment, useState } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { CpuChipIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import { useSigners, useWallets } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";

import { Button } from "../common/Button";
import { defaultPaymentTokenSymbol } from "../../config/targetChain";
import { ErrorMessage } from "../common/ErrorMessage";
import { botDelegatesQueryKey, useBotDelegates } from "../../hooks/useActiveAgentControl";
import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../utils/apiClient";

function looksLikePublicKey(value: string): boolean {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length >= 80 && value.length <= 200;
}

function parseAgentPaste(value: string): { publicKey: string; label: string } {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const keyIndex = lines.findIndex((line) => looksLikePublicKey(line));
  if (keyIndex === -1) return { publicKey: lines[0] ?? "", label: "" };
  const label = lines.find((_, index) => index !== keyIndex) ?? "";
  return { publicKey: lines[keyIndex] ?? "", label: label.slice(0, 40) };
}

function agentName(row: { label?: string | null; kind?: string }): string {
  const label = row.label?.trim();
  if (label) return label;
  return row.kind === "account" ? "Account agent" : "Agent";
}

function calendarDay(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatWhen(iso: string, withTime: boolean): string {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  };
  return withTime
    ? date.toLocaleString("en-US", options)
    : date.toLocaleDateString("en-US", options);
}

function agentDetail(row: { kind?: string; createdAt: string }, withTime: boolean): string {
  const when = formatWhen(row.createdAt, withTime);
  return row.kind === "account" ? `Created this account · ${when}` : `Granted ${when}`;
}

function sharedCalendarDays(rows: { createdAt: string }[]): Set<string> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const day = calendarDay(row.createdAt);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([day]) => day));
}

function agentStatus(status: string): string | null {
  if (status === "pending") return "Grant didn't finish";
  if (status === "revoking") return "Removal didn't finish";
  return null;
}

function AgentItem({
  name,
  detail,
  status,
  action,
}: {
  name: string;
  detail: string;
  status: string | null;
  action?: { label: string; busy: boolean; disabled: boolean; onClick: () => void };
}) {
  return (
    <li className="flex flex-col gap-3 rounded-md border border-slate-300 bg-white px-4 py-3 shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-900">{name}</p>
          {status ? (
            <span className="inline-flex shrink-0 items-center rounded bg-slate-900 px-1.5 py-0.5 text-xs font-medium text-white">
              {status}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-800">{detail}</p>
      </div>
      {action ? (
        <Button
          type="button"
          variant="neutral"
          disabled={action.disabled}
          onClick={action.onClick}
          className="w-full sm:w-auto"
        >
          {action.busy ? "Granting…" : action.label}
        </Button>
      ) : null}
    </li>
  );
}

function signerAlreadyAdded(err: unknown): boolean {
  return err instanceof Error && /duplicate signer/i.test(err.message);
}

export function BotDelegationSettings() {
  const { wallets } = useWallets();
  const { addSigners, removeSigners } = useSigners();
  const { client: smartWalletClient } = useSmartWallets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [delegateInput, setDelegateInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [revokeWarning, setRevokeWarning] = useState(false);

  const delegates = useBotDelegates();

  const embedded = wallets.find(
    (wallet) => wallet.type === "ethereum" && wallet.walletClientType === "privy",
  );
  const rows = (delegates.data?.delegates ?? []).filter((row) => row.status !== "revoked");
  const active = rows.filter((row) => row.status === "active");
  const pendingRows = rows.filter((row) => row.status === "pending");
  const revoking = rows.filter((row) => row.status === "revoking");
  const sharedDays = sharedCalendarDays(rows);

  function onDelegateInput(value: string) {
    if (!value.includes("\n")) {
      setDelegateInput(value.trim());
      return;
    }
    const parsed = parseAgentPaste(value);
    setDelegateInput(parsed.publicKey);
    if (parsed.label) setLabelInput(parsed.label);
  }

  async function enable(publicKey: string, label?: string | null) {
    if (!embedded || !smartWalletClient) throw new Error("Wallet is not ready");
    const name = label === undefined ? {} : { label };
    const prepared = await apiClient.post<{ quorumId: string }>(
      "/bot/delegates/quorum",
      { publicKey, ...name },
      { requiresAuth: true },
    );
    try {
      await addSigners({
        address: embedded.address,
        signers: [{ signerId: prepared.quorumId }],
      });
    } catch (err) {
      if (!signerAlreadyAdded(err)) throw err;
    }
    await apiClient.post(
      "/bot/delegates",
      { publicKey, quorumId: prepared.quorumId, ...name },
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

  function confirmRevoke() {
    setRevokeWarning(false);
    void run("revoke", revokeAll);
  }

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-6 font-display shadow-sm"
      aria-labelledby="delegate-heading"
    >
      <h1
        id="delegate-heading"
        className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-gray-900"
      >
        <CpuChipIcon className="h-6 w-6 shrink-0" aria-hidden />
        AI Agents
      </h1>

      <div className="max-w-3xl">
        <p className="text-sm leading-6 text-slate-600">
          You can use an AI agent (ChatGPT, Claude, Muse, Grok, etc.) to control your account. Here
          are a few of the things it can do:
        </p>
        <ul className="ml-4 mt-2 list-inside list-disc text-sm leading-6 text-slate-600">
          <li>Research players & tournaments</li>
          <li>Update your lineups & enter contests</li>
          <li>Make & settle sidebets</li>
        </ul>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Just tell your agent about Play the Cut and it will walk you through connecting your
          account!
        </p>

        {/* <div
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
        </div> */}

        <hr className="my-6 border-slate-300" />
      </div>

      <div className="mb-3 mt-8 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Active Agents</h3>
        <Button
          type="button"
          variant="neutral"
          size="compact"
          disabled={pending !== null || rows.length === 0}
          onClick={() => setRevokeWarning(true)}
        >
          Revoke all
        </Button>
      </div>
      <Transition show={revokeWarning} as={Fragment}>
        <Dialog onClose={() => setRevokeWarning(false)} className="relative z-50">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" aria-hidden />
          </TransitionChild>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <DialogTitle className="font-display text-lg font-semibold text-slate-900">
                  Revoke agent access
                </DialogTitle>
                <p className="mt-2 text-sm leading-6 text-slate-800">
                  This will revoke agent access. You can re-add an agent&apos;s access at any time.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button type="button" variant="neutral" onClick={() => setRevokeWarning(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={confirmRevoke}>
                    Revoke access
                  </Button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>

      {delegates.isError ? <ErrorMessage message="Could not load agents" className="mt-4" /> : null}
      {delegates.isSuccess || rows.length > 0 ? (
        <ul aria-label="Agents" className="flex flex-col gap-3">
          {rows.length === 0 ? (
            <li className="py-3 pl-3 text-sm italic leading-6 text-slate-800">No active agents</li>
          ) : (
            rows.map((row) => (
              <AgentItem
                key={row.delegateAddress}
                name={agentName(row)}
                detail={agentDetail(row, sharedDays.has(calendarDay(row.createdAt)))}
                status={agentStatus(row.status)}
                action={
                  row.status === "pending"
                    ? {
                        label: "Finish granting",
                        busy: pending === "grant",
                        disabled: pending !== null,
                        onClick: () => {
                          void run("grant", () => enable(row.delegateAddress));
                        },
                      }
                    : undefined
                }
              />
            ))
          )}
        </ul>
      ) : null}
      {revoking.length > 0 || (pendingRows.length > 0 && active.length === 0) ? (
        <div className="mt-4">
          <Button
            type="button"
            variant="neutral"
            disabled={pending !== null}
            onClick={() => {
              if (active.length > 0 || pendingRows.length > 0) {
                setRevokeWarning(true);
                return;
              }
              void run("remove", revokeAll);
            }}
          >
            {pending === "remove" ? "Removing…" : "Remove the key from the wallet"}
          </Button>
        </div>
      ) : null}
      {actionError ? <ErrorMessage message={actionError} className="mt-2" /> : null}

      <hr className="my-6 border-slate-300" />

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Add an Agent</h2>

      <form
        className="mt-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!looksLikePublicKey(delegateInput)) {
            setActionError(null);
            setFieldError("Enter the agent's public key");
            return;
          }
          const label = labelInput.trim();
          void run(
            "grant",
            async () => {
              await enable(delegateInput, label.length === 0 ? null : label.slice(0, 40));
              setDelegateInput("");
              setLabelInput("");
            },
            "field",
          );
        }}
      >
        <label htmlFor="agent-public-key" className="text-sm font-medium text-slate-900">
          Ask your agent for its key, then paste it here:
        </label>
        <input
          id="agent-public-key"
          name="publicKey"
          value={delegateInput}
          onChange={(event) => onDelegateInput(event.target.value)}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (!text.includes("\n")) return;
            event.preventDefault();
            const parsed = parseAgentPaste(text);
            setDelegateInput(parsed.publicKey);
            if (parsed.label) setLabelInput(parsed.label);
          }}
          type="text"
          placeholder="Agent Key"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-describedby="agent-public-key-note"
          aria-invalid={fieldError ? true : undefined}
          disabled={pending !== null}
          className="mt-3 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
        <label htmlFor="agent-name" className="mt-3 block text-sm font-medium text-slate-900">
          Name
        </label>
        <input
          id="agent-name"
          name="label"
          value={labelInput}
          onChange={(event) => setLabelInput(event.target.value.slice(0, 40))}
          type="text"
          placeholder="Claude, Cursor, …"
          maxLength={40}
          autoComplete="off"
          disabled={pending !== null}
          className="mt-3 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
        <Button type="submit" disabled={pending !== null} className="mt-3 w-full sm:w-auto">
          {pending === "grant" ? "Granting…" : "Grant full access"}
        </Button>
        <p id="agent-public-key-note" className="mt-2 text-xs leading-5 text-slate-500">
          This key can send {defaultPaymentTokenSymbol()}, enter a paid contest, create a paid
          contest, and send messages. Double-check the public key before granting access.
        </p>
        {fieldError ? <ErrorMessage message={fieldError} className="mt-2" /> : null}
      </form>
    </section>
  );
}
