import {
  getStorybookSideBetMarketSnapshot,
  getStorybookSideBetTicketsSnapshot,
} from "../../src/test/fixtures/sideBetStorybook";

const SIDE_BET_MARKET_PATH = /\/api\/bets\/side\/lineup\/[^/]+\/market(?:\?|$)/;
const SIDE_BET_TICKETS_PATH = /\/api\/bets\/side\/tickets(?:\?|$)/;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function loadingResponse(signal?: AbortSignal | null): Promise<Response> {
  return new Promise((_, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    signal?.addEventListener("abort", () => {
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

export function installStorybookSideBetFetchMock() {
  if (typeof window === "undefined") return;

  const marker = "__cutSideBetFetchMockInstalled";
  if ((window as unknown as Record<string, boolean>)[marker]) return;
  (window as unknown as Record<string, boolean>)[marker] = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url = requestUrl(input);
    const method = requestMethod(input, init);

    if (method === "GET" && SIDE_BET_MARKET_PATH.test(url)) {
      const snapshot = getStorybookSideBetMarketSnapshot();
      if (snapshot.kind === "loading") {
        return loadingResponse(init?.signal);
      }
      if (snapshot.kind === "error") {
        return jsonResponse({ error: "Parlay market unavailable" }, 503);
      }
      return jsonResponse(snapshot.data);
    }

    if (method === "GET" && SIDE_BET_TICKETS_PATH.test(url)) {
      const snapshot = getStorybookSideBetTicketsSnapshot();
      if (snapshot.kind === "loading") {
        return loadingResponse(init?.signal);
      }
      if (snapshot.kind === "error") {
        return jsonResponse({ error: "Could not load tickets" }, 503);
      }
      return jsonResponse(snapshot.data);
    }

    if (method === "POST" && SIDE_BET_TICKETS_PATH.test(url)) {
      const body =
        init?.body != null
          ? (JSON.parse(String(init.body)) as Record<string, unknown>)
          : {};
      return jsonResponse({
        id: `ticket-${Date.now()}`,
        hitsRequired: body.hitsRequired,
        topN: body.topN,
        stakeAmount: body.stakeAmount,
        decimalOddsAtPlacement: 3.1,
        americanDisplayAtPlacement: "+210",
        quoteVersionAtPlacement: 1,
        status: "OPEN",
        playerIds: [],
        placementPlayers: [],
      });
    }

    return originalFetch(input, init);
  };
}
