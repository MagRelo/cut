import usdcIcon from "../../../assets/funds/usdc.svg";
import baseIcon from "../../../assets/funds/base.svg";

export const walletSpecLabelClassName =
  "text-[11px] font-medium uppercase tracking-[0.12em] text-gray-600";

export const walletSpecCtaClassName =
  "inline-flex w-full min-h-11 items-center justify-center gap-2 rounded border border-blue-500 bg-blue-500 px-4 font-display text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50";

export const walletSpecSecondaryClassName =
  "min-h-11 w-full rounded border border-gray-300 px-4 font-display text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";

function AssetSpec({
  label,
  iconSrc,
  title,
  padded = true,
  large = false,
}: {
  label: string;
  iconSrc: string;
  title: string;
  padded?: boolean;
  large?: boolean;
}) {
  const iconPx = large ? 20 : 16;

  return (
    <div className={padded ? "px-4 py-3" : undefined}>
      <p className={walletSpecLabelClassName}>{label}</p>
      <div className={`mt-1 flex items-center ${large ? "gap-2" : "gap-1.5"}`}>
        <img
          src={iconSrc}
          alt=""
          width={iconPx}
          height={iconPx}
          className={`${large ? "h-5 w-5" : "h-4 w-4"} shrink-0`}
          aria-hidden
        />
        <p className="font-display text-sm font-medium leading-none text-gray-900">{title}</p>
      </div>
    </div>
  );
}

export function AssetChips({
  tokenSymbol,
  networkLabel,
  flush = false,
}: {
  tokenSymbol: string;
  networkLabel: string;
  /** Specs without card padding or a divider — used in send/receive. */
  flush?: boolean;
}) {
  return (
    <div
      className={flush ? "flex flex-col gap-4" : "grid grid-cols-2 divide-x divide-gray-100"}
    >
      <AssetSpec
        label="Token"
        iconSrc={usdcIcon}
        title={tokenSymbol}
        padded={!flush}
        large={flush}
      />
      <AssetSpec
        label="Network"
        iconSrc={baseIcon}
        title={networkLabel}
        padded={!flush}
        large={flush}
      />
    </div>
  );
}
