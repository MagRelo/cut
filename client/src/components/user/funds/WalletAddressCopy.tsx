import { CopyButton } from "../../common/CopyToClipboard";

export function WalletAddressCopy({
  address,
  label = "Wallet address",
}: {
  address: string;
  label?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className="mt-1.5 break-all font-mono text-sm font-semibold leading-snug text-gray-900">
        {address}
      </p>
      <CopyButton text={address} variant="cta" idleLabel="Copy Address" className="mt-1.5" />
    </div>
  );
}
