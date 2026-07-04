import type {
  SideBetMarketResponse,
  SideBetTicketsListResponse,
} from "../../types/sideBet";
import { buildBettableSideBetMarket, buildSideBetTicketsFixture } from "./sideBetMock";

export type StorybookSideBetMarketMode =
  | "bettable"
  | "closed"
  | "unavailable"
  | "loading"
  | "error";

export type StorybookSideBetTicketsMode = "withTickets" | "empty" | "loading" | "error";

type MarketSnapshot =
  | { kind: "ready"; data: SideBetMarketResponse }
  | { kind: "loading" }
  | { kind: "error" };

type TicketsSnapshot =
  | { kind: "ready"; data: SideBetTicketsListResponse }
  | { kind: "loading" }
  | { kind: "error" };

let marketSnapshot: MarketSnapshot = {
  kind: "ready",
  data: buildBettableSideBetMarket(),
};
let ticketsSnapshot: TicketsSnapshot = {
  kind: "ready",
  data: buildSideBetTicketsFixture(),
};

const subscribers = new Set<() => void>();

function emitChange() {
  subscribers.forEach((listener) => listener());
}

export function subscribeStorybookSideBet(listener: () => void) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function getStorybookSideBetMarketSnapshot() {
  return marketSnapshot;
}

export function getStorybookSideBetTicketsSnapshot() {
  return ticketsSnapshot;
}

function marketForMode(mode: StorybookSideBetMarketMode): MarketSnapshot {
  switch (mode) {
    case "loading":
      return { kind: "loading" };
    case "error":
      return { kind: "error" };
    case "closed":
      return {
        kind: "ready",
        data: buildBettableSideBetMarket({ bettable: false, marketStatus: "LOCKED" }),
      };
    case "unavailable":
      return {
        kind: "ready",
        data: buildBettableSideBetMarket({ bettable: false, marketStatus: "PENDING" }),
      };
    case "bettable":
    default:
      return { kind: "ready", data: buildBettableSideBetMarket() };
  }
}

function ticketsForMode(mode: StorybookSideBetTicketsMode): TicketsSnapshot {
  switch (mode) {
    case "loading":
      return { kind: "loading" };
    case "error":
      return { kind: "error" };
    case "empty":
      return { kind: "ready", data: { tickets: [] } };
    case "withTickets":
    default:
      return { kind: "ready", data: buildSideBetTicketsFixture() };
  }
}

export function resetStorybookSideBetMocks(options?: {
  market?: StorybookSideBetMarketMode;
  tickets?: StorybookSideBetTicketsMode;
}) {
  marketSnapshot = marketForMode(options?.market ?? "bettable");
  ticketsSnapshot = ticketsForMode(options?.tickets ?? "withTickets");
  emitChange();
}
