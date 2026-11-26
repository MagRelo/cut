import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../utils/apiClient";

export function botDelegatesQueryKey(userId: string) {
  return ["bot-delegates", userId] as const;
}

export type BotDelegateRow = {
  delegateAddress: string;
  status: string;
  kind: string;
  label: string | null;
  createdAt: string;
  revokedAt: string | null;
  smartWallet?: string;
  quorumId?: string | null;
};

type DelegateResponse = {
  delegates: BotDelegateRow[];
};

export function useBotDelegates() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: botDelegatesQueryKey(userId ?? "anon"),
    enabled: userId !== null,
    queryFn: () => apiClient.get<DelegateResponse>("/bot/delegates", { requiresAuth: true }),
  });
}
