import usdcIcon from "../../../assets/funds/usdc.svg";
import baseIcon from "../../../assets/funds/base.svg";

function AssetSpec({
  label,
  iconSrc,
  title,
  padded = true,
}: {
  label: string;
  iconSrc: string;
  title: string;
  padded?: boolean;
}) {
  return (
    <div className={padded ? "px-4 py-3" : undefined}>
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <img src={iconSrc} alt="" width={16} height={16} className="h-4 w-4 shrink-0" aria-hidden />
        <p className="font-display text-sm font-semibold leading-none text-gray-900">{title}</p>
      </div>
    </div>
  );
}

export function FundingAssetChips({
  tokenSymbol,
  networkLabel,
  stacked = false,
}: {
  tokenSymbol: string;
  networkLabel: string;
  stacked?: boolean;
}) {
  return (
    <div className={stacked ? "flex flex-col gap-3" : "grid grid-cols-2 divide-x divide-gray-100"}>
      <AssetSpec label="Token" iconSrc={usdcIcon} title={tokenSymbol} padded={!stacked} />
      <AssetSpec label="Network" iconSrc={baseIcon} title={networkLabel} padded={!stacked} />
    </div>
  );
}
