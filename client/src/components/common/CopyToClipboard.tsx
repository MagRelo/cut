import { useState } from "react";

interface CopyToClipboardProps {
  text: string;
  truncated?: boolean; // Default true - show truncated format
  displayText?: React.ReactNode; // Optional custom display (keeps flexibility)
  className?: string;
}

export function CopyToClipboard({
  text,
  truncated = true,
  displayText,
  className = "",
}: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Wallet icon
  const walletIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );

  const copyIcon = copied ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 text-green-500 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );

  // If custom displayText is provided, use it
  if (displayText) {
    return (
      <button
        onClick={handleCopy}
        className={`inline-flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer ${className}`}
        title="Click to copy"
      >
        {displayText}
        {copyIcon}
      </button>
    );
  }

  // Default rendering based on truncated prop
  const truncatedAddress = text ? `${text.slice(0, 6)}...${text.slice(-6)}` : "";

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 hover:text-blue-600 transition-colors cursor-pointer ${className}`}
      title="Click to copy"
    >
      {walletIcon}
      {truncated ? (
        // Truncated view - inline with icon
        <>
          <span className="font-mono text-xs">{truncatedAddress}</span>
          {copyIcon}
        </>
      ) : (
        // Full address view - multi-line layout
        <div className="flex flex-col items-start gap-1 w-full">
          <span className="font-mono text-sm text-gray-800 break-all w-full">{text}</span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            Click to copy address {copyIcon}
          </span>
        </div>
      )}
    </button>
  );
}
