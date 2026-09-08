import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { Connect } from "./Connect";

interface SignInPromptProps {
  action: string;
  className?: string;
}

export function SignInPrompt({ action, className = "" }: SignInPromptProps) {
  return (
    <div
      className={[
        "flex w-full max-w-sm flex-col items-center justify-center gap-3 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center justify-center gap-2">
        <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-yellow-500" aria-hidden />
        <p className="font-display text-sm text-gray-600">
          <b>Sign in</b> to {action}
        </p>
      </div>
      <Connect />
    </div>
  );
}
