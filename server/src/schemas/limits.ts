/** Shared max lengths for user-facing string fields. */

export const NAME_MAX_LENGTH = 80;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const CONTEST_TYPE_MAX_LENGTH = 32;
export const PAYMENT_TOKEN_SYMBOL_MAX_LENGTH = 16;

export const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
export const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const DECIMAL_ID_REGEX = /^\d+$/;
export const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

export const BPS_MIN = 0;
export const BPS_MAX = 10_000;

export const API_JSON_BODY_MAX_BYTES = 128 * 1024;
/** Hard cap on lineup write `picks` (sport roster max is 3–4; 8 is a safe ceiling). */
export const LINEUP_PICKS_MAX = 8;

export const ADMIN_LIST_USER_TYPES = [
  "USER",
  "TEST",
  "ADMIN",
  "SUPER_ADMIN",
  "PUBLIC",
] as const;

export type AdminListUserType = (typeof ADMIN_LIST_USER_TYPES)[number];

export function clipName(name: string, max = NAME_MAX_LENGTH): string {
  return name.length <= max ? name : name.slice(0, max);
}
