import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { BRAND_PROSE } from "../../lib/brand";

interface ShareInviteButtonProps {
  url: string;
  shareTitle?: string;
  shareText?: string;
  ariaLabel?: string;
  label?: string;
  variant?: "compact" | "cta" | "secondary" | "link";
  className?: string;
}

export function ShareInviteButton({
  url,
  shareTitle = BRAND_PROSE,
  shareText = `Join ${BRAND_PROSE}`,
  ariaLabel = "Share referral link",
  label: idleLabel = "Share",
  variant = "compact",
  className = "",
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

  const label = feedback === "shared" ? "Shared!" : feedback === "copied" ? "Copied!" : idleLabel;
  const active = feedback !== null;
  const variantClass =
    variant === "secondary"
      ? `w-full min-h-11 justify-center border px-4 sm:w-auto ${
          active
            ? "border-gray-400 bg-gray-50 text-gray-900"
            : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
        }`
      : variant === "cta"
        ? `justify-center min-w-[200px] border border-blue-500 px-4 py-2 text-white ${
            active ? "bg-blue-600" : "bg-blue-500 hover:bg-blue-600"
          }`
        : variant === "link"
          ? `px-0 py-0 text-base font-semibold ${active ? "text-blue-800" : "text-blue-600 hover:underline"}`
          : `px-3 py-1 text-white ${active ? "bg-blue-600" : "bg-blue-500 hover:bg-blue-600"}`;

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      aria-label={active ? label : ariaLabel}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded font-display text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${variantClass} ${className}`}
    >
      {label}
      <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden />
    </button>
  );
}
