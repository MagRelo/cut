import { describe, expect, it } from "vitest";
import { txPhaseInFlight, txPhaseLabel } from "./txPhase";

describe("txPhaseLabel", () => {
  it("uses the shared words and keeps the action for a failed chain", () => {
    expect(txPhaseLabel("idle", "Place Wager")).toBe("Place Wager");
    expect(txPhaseLabel("awaitingSignature", "Place Wager")).toBe("Confirm in wallet");
    expect(txPhaseLabel("confirming", "Place Wager")).toBe("Confirming");
    expect(txPhaseLabel("recording", "Place Wager")).toBe("Saving");
    expect(txPhaseLabel("confirmed", "Place Wager")).toBe("Confirmed");
    expect(txPhaseLabel("chainFailed", "Place Wager")).toBe("Place Wager");
    expect(txPhaseLabel("recordFailed", "Place Wager")).toBe("Saving failed");
  });

  it("treats only the three busy phases as in flight", () => {
    expect(txPhaseInFlight("awaitingSignature")).toBe(true);
    expect(txPhaseInFlight("confirming")).toBe(true);
    expect(txPhaseInFlight("recording")).toBe(true);
    expect(txPhaseInFlight("idle")).toBe(false);
    expect(txPhaseInFlight("chainFailed")).toBe(false);
    expect(txPhaseInFlight("recordFailed")).toBe(false);
    expect(txPhaseInFlight("confirmed")).toBe(false);
  });
});
