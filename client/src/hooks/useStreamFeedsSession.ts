import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCreateFeedsClient, type FeedsClient } from "@stream-io/feeds-react-sdk";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../utils/apiClient";
import { isStreamClientConfigured } from "../lib/stream/constants";

export type StreamTokenResponse = {
  apiKey: string;
  token: string;
  userId: string;
  expiresInSeconds: number;
};

async function fetchStreamToken(): Promise<StreamTokenResponse> {
  return apiClient.get<StreamTokenResponse>("/stream/token", {
    requiresAuth: true,
  });
}

/**
 * Connects an authenticated user to Stream Feeds when VITE_STREAM_API_KEY is set
 * and the server token endpoint is available.
 */
export function useStreamFeedsSession(): {
  client: FeedsClient | null;
  isReady: boolean;
  isEnabled: boolean;
  error: Error | null;
} {
  const { user } = useAuth();
  const envApiKey = import.meta.env.VITE_STREAM_API_KEY?.trim() ?? "";
  const enabled = isStreamClientConfigured() && Boolean(user?.id);

  const tokenQuery = useQuery({
    queryKey: ["stream", "token", user?.id],
    queryFn: fetchStreamToken,
    enabled,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const apiKey = tokenQuery.data?.apiKey?.trim() || envApiKey;
  const token = tokenQuery.data?.token;
  const userId = tokenQuery.data?.userId ?? user?.id;

  const userData = useMemo(() => {
    if (!userId) return "anonymous" as const;
    return {
      id: userId,
      ...(user?.name ? { name: user.name } : {}),
    };
  }, [userId, user?.name]);

  const client = useCreateFeedsClient({
    apiKey: enabled && apiKey && token ? apiKey : "",
    tokenOrProvider: enabled && token ? token : undefined,
    userData: enabled && token ? userData : "anonymous",
  });

  const isReady = Boolean(enabled && client && tokenQuery.isSuccess);

  return {
    client: isReady ? client : null,
    isReady,
    isEnabled: enabled,
    error: tokenQuery.error instanceof Error ? tokenQuery.error : null,
  };
}

export function useRefreshStreamToken(): () => void {
  const { user } = useAuth();
  const { refetch } = useQuery({
    queryKey: ["stream", "token", user?.id],
    queryFn: fetchStreamToken,
    enabled: false,
  });
  return useCallback(() => {
    void refetch();
  }, [refetch]);
}
