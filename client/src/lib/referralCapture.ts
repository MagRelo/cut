export const CUT_REFERRAL_CODE_STORAGE_KEY = "cut_referral_code";

/** Same alphabet as server `INVITE_ALPHABET` (no 0/O/1/l/I). */
export const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
export const REFERRAL_CODE_LENGTH = 8;

export function isValidReferralCode(code: string): boolean {
  if (code.length !== REFERRAL_CODE_LENGTH) return false;
  for (const ch of code) {
    if (!REFERRAL_CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

/** Valid opaque `?ref=` code from a location search string, or null. Case-sensitive. */
export function parseValidRefFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const ref = params.get("ref")?.trim();
  if (!ref) return null;
  if (ref.startsWith("0x") || ref.startsWith("0X")) return null;
  if (!isValidReferralCode(ref)) return null;
  return ref;
}

export function getStoredReferralCode(): string | null {
  try {
    return sessionStorage.getItem(CUT_REFERRAL_CODE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearStoredReferralCode(): void {
  try {
    sessionStorage.removeItem(CUT_REFERRAL_CODE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function setStoredReferralCode(code: string): void {
  try {
    sessionStorage.setItem(CUT_REFERRAL_CODE_STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
}
