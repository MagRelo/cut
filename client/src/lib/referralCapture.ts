export const CUT_REFERRER_STORAGE_KEY = "cut_referrer_address";

export function getStoredReferrerAddress(): string | null {
  try {
    return sessionStorage.getItem(CUT_REFERRER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearStoredReferrerAddress(): void {
  try {
    sessionStorage.removeItem(CUT_REFERRER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function setStoredReferrerAddress(addressLower: string): void {
  try {
    sessionStorage.setItem(CUT_REFERRER_STORAGE_KEY, addressLower);
  } catch {
    /* ignore */
  }
}
