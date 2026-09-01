import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  getStoredReferralCode,
  parseValidRefFromSearch,
  setStoredReferralCode,
} from "../lib/referralCapture";

export { parseValidRefFromSearch } from "../lib/referralCapture";

/** True when a referral code is in the URL or was captured to sessionStorage. */
export function useReferralCodeDetected(): boolean {
  const { search } = useLocation();
  const refFromUrl = useMemo(() => parseValidRefFromSearch(search), [search]);
  const [storedRef, setStoredRef] = useState<string | null>(() =>
    getStoredReferralCode()
  );

  useEffect(() => {
    const fromUrl = parseValidRefFromSearch(search);
    if (fromUrl) {
      setStoredRef(fromUrl);
      return;
    }
    setStoredRef(getStoredReferralCode());
  }, [search]);

  return !!(refFromUrl || storedRef);
}

/** Persist `?ref=` into sessionStorage for signup (sent as `X-Cut-Referral-Code`). */
export function useReferralCapture(): void {
  const { search } = useLocation();
  useEffect(() => {
    const code = parseValidRefFromSearch(search);
    if (!code) return;
    setStoredReferralCode(code);
  }, [search]);
}
