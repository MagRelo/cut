import { StreamClient } from "@stream-io/node-sdk";

export function isStreamFeedsEnabled(): boolean {
  if (process.env.STREAM_FEEDS_ENABLED !== "true") return false;
  const apiKey = process.env.STREAM_API_KEY?.trim();
  const apiSecret = process.env.STREAM_API_SECRET?.trim();
  return Boolean(apiKey && apiSecret);
}

let cachedClient: StreamClient | null = null;

export function getStreamFeedsClient(): StreamClient | null {
  if (!isStreamFeedsEnabled()) return null;
  if (cachedClient) return cachedClient;

  const apiKey = process.env.STREAM_API_KEY!.trim();
  const apiSecret = process.env.STREAM_API_SECRET!.trim();
  cachedClient = new StreamClient(apiKey, apiSecret, { timeout: 10_000 });
  return cachedClient;
}

export function requireStreamFeedsClient(): StreamClient {
  const client = getStreamFeedsClient();
  if (!client) {
    throw new Error(
      "Stream Feeds is not enabled. Set STREAM_FEEDS_ENABLED=true and STREAM_API_KEY / STREAM_API_SECRET.",
    );
  }
  return client;
}

export function getStreamApiKey(): string | null {
  const key = process.env.STREAM_API_KEY?.trim();
  return key || null;
}
