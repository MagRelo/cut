import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  decimalOddsFromStakeReturn,
  formatOddsFromDecimal,
  type OddsDisplayFormat,
} from "../lib/oddsFormat";
import { parseOddsDisplayFormat } from "../lib/oddsSettings";

export function useOddsFormat() {
  const { user } = useAuth();
  const format = parseOddsDisplayFormat(user?.settings);

  const formatOdds = useCallback(
    (decimal: number) => formatOddsFromDecimal(decimal, format),
    [format],
  );

  const formatStakeReturnOdds = useCallback(
    (stake: number, totalReturn: number) => {
      const decimal = decimalOddsFromStakeReturn(stake, totalReturn);
      if (decimal === null) return "—";
      return formatOddsFromDecimal(decimal, format);
    },
    [format],
  );

  return { format, formatOdds, formatStakeReturnOdds } satisfies {
    format: OddsDisplayFormat;
    formatOdds: (decimal: number) => string;
    formatStakeReturnOdds: (stake: number, totalReturn: number) => string;
  };
}
