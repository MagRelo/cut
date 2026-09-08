import { CopyButton } from "../../common/CopyToClipboard";
import { walletSpecLabelClassName } from "./AssetChips";

export const walletAddressWellClassName =
  "select-all rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[13px] font-medium leading-6 tracking-tight text-gray-800";

/** Groups hex for scanability; wrapping lands on 4-char boundaries instead of mid-token. */
export function formatAddressForDisplay(address: string): string {
  const trimmed = address.trim();
  const hasPrefix = trimmed.startsWith("0x") || trimmed.startsWith("0X");
  const body = hasPrefix ? trimmed.slice(2) : trimmed;
  const groups = body.match(/.{1,4}/g);
  if (!groups) return trimmed;
  return hasPrefix ? `0x${groups.join(" ")}` : groups.join(" ");
}

export function WalletAddressCopy({
  address,
  label = "Wallet address",
}: {
  address: string;
  label?: string;
}) {
  return (
    <div>
      <p className={walletSpecLabelClassName}>{label}</p>
      <p
        className={`mt-1.5 ${walletAddressWellClassName}`}
        aria-label={address}
      >
        {formatAddressForDisplay(address)}
      </p>
      <CopyButton text={address} variant="cta" idleLabel="Copy Address" className="mt-3" />
    </div>
  );
}
