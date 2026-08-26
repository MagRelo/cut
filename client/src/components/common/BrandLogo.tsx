import { BRAND_LOGO_HEIGHT, BRAND_LOGO_SRC, BRAND_LOGO_WIDTH, BRAND_PROSE } from "../../lib/brand";

type BrandLogoProps = {
  className: string;
  /** Decorative marks next to visible wordmark should leave alt empty. */
  decorative?: boolean;
};

export function BrandLogo({ className, decorative = true }: BrandLogoProps) {
  return (
    <img
      src={BRAND_LOGO_SRC}
      alt={decorative ? "" : `${BRAND_PROSE} logo`}
      width={BRAND_LOGO_WIDTH}
      height={BRAND_LOGO_HEIGHT}
      className={className}
      decoding="async"
    />
  );
}
