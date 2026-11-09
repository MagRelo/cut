export type TxPhase =
  | "idle"
  | "awaitingSignature"
  | "confirming"
  | "recording"
  | "confirmed"
  | "chainFailed"
  | "recordFailed";

const IN_FLIGHT: ReadonlySet<TxPhase> = new Set([
  "awaitingSignature",
  "confirming",
  "recording",
]);

export function txPhaseInFlight(phase: TxPhase): boolean {
  return IN_FLIGHT.has(phase);
}

/** Shared button words. The idle label is the action, such as "Place Wager". */
export function txPhaseLabel(phase: TxPhase, idleLabel: string): string {
  switch (phase) {
    case "awaitingSignature":
      return "Confirm in wallet";
    case "confirming":
      return "Confirming";
    case "recording":
      return "Saving";
    case "confirmed":
      return "Confirmed";
    case "recordFailed":
      return "Saving failed";
    case "idle":
    case "chainFailed":
      return idleLabel;
  }
}
