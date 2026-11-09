import { Button } from "./Button";
import { ErrorMessage } from "./ErrorMessage";
import { LoadingSpinnerSmall } from "./LoadingSpinnerSmall";
import { txPhaseInFlight, txPhaseLabel, type TxPhase } from "../../lib/txPhase";

type TxButtonProps = {
  phase: TxPhase;
  idleLabel: string;
  onClick?: () => void;
  disabled?: boolean;
  error?: string | null;
  block?: boolean;
  className?: string;
  type?: "button" | "submit";
  spinnerColor?: "white" | "green" | "blue" | "red" | "gray";
};

/** Chain submit. In-flight phases share one label and a spinner. Failures sit under the control. */
export function TxButton({
  phase,
  idleLabel,
  onClick,
  disabled = false,
  error,
  block = false,
  className,
  type = "button",
  spinnerColor = "white",
}: TxButtonProps) {
  const inFlight = txPhaseInFlight(phase);
  const label = txPhaseLabel(phase, idleLabel);
  const buttonDisabled = disabled || inFlight || phase === "confirmed";

  const inner = (
    <span className="flex items-center justify-center gap-2">
      {inFlight ? <LoadingSpinnerSmall color={spinnerColor} /> : null}
      {label}
    </span>
  );

  return (
    <div className={block || className ? "w-full" : undefined}>
      {className ? (
        <button type={type} onClick={onClick} disabled={buttonDisabled} className={className}>
          {inner}
        </button>
      ) : (
        <Button type={type} block={block} onClick={onClick} disabled={buttonDisabled}>
          {inner}
        </Button>
      )}
      {error ? <ErrorMessage message={error} className="mt-2" /> : null}
    </div>
  );
}
