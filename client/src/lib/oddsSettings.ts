import type { OddsDisplayFormat } from "./oddsFormat";
import { DEFAULT_ODDS_FORMAT } from "./oddsFormat";

export { DEFAULT_ODDS_FORMAT };

/** Stored in `user.settings`. */
export const ODDS_FORMAT_SETTING_KEY = "oddsFormat" as const;

export const ODDS_FORMAT_OPTIONS: {
  value: OddsDisplayFormat;
  label: string;
  example: string;
  description: string;
}[] = [
  { value: "american", label: "American", example: "+200", description: "e.g. +200, -110" },
  { value: "decimal", label: "Decimal", example: "3.00", description: "e.g. 3.00, 1.91" },
  { value: "english", label: "English", example: "2/1", description: "e.g. 2/1, 10/11" },
];

export function parseOddsDisplayFormat(
  settings: Record<string, unknown> | null | undefined,
): OddsDisplayFormat {
  const raw = settings?.[ODDS_FORMAT_SETTING_KEY];
  if (raw === "american" || raw === "decimal" || raw === "english") {
    return raw;
  }
  return DEFAULT_ODDS_FORMAT;
}
