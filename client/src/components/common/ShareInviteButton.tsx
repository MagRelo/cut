import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { BRAND_PROSE } from "../../lib/brand";

interface ShareInviteButtonProps {
  url: string;
  shareTitle?: string;
  shareText?: string;
  ariaLabel?: string;
}

export function ShareInviteButton({
  url,
  shareTitle = BRAND_PROSE,
  shareText = `Join ${BRAND_PROSE}`,
  ariaLabel = "Share invite link",
}: ShareInviteButtonProps) {
  const [feedback, setFeedback] = useState<null | "shared" | "copied">(null);

  const handleClick = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url,
        });
        setFeedback("shared");
        setTimeout(() => setFeedback(null), 2000);
        return;
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setFeedback("copied");
      setTimeout(() => setFeedback(null), 2000);
    } catch (e) {
      console.error("Share/copy failed:", e);
    }
  };

  const label = feedback === "shared" ? "Shared!" : feedback === "copied" ? "Copied!" : "Share";
  const active = feedback !== null;

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      aria-label={active ? label : ariaLabel}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded px-3 py-1 font-display text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        active ? "bg-blue-600" : "bg-blue-500 hover:bg-blue-600"
      }`}
    >
      {label}
      <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden />
    </button>
  );
}
