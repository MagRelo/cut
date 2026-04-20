import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { isAddress } from "viem";
import {
  getStoredReferrerAddress,
  setStoredReferrerAddress,
} from "../lib/referralCapture";

/** Valid `?ref=0x…` from a location search string, lowercased, or null. */
export function parseValidRefFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const ref = params.get("ref")?.trim();
  if (!ref || !isAddress(ref)) return null;
  return ref.toLowerCase();
}

/** True when a referral wallet is in the URL or was captured to sessionStorage. */
export function useReferralCodeDetected(): boolean {
  const { search } = useLocation();
  const refFromUrl = useMemo(() => parseValidRefFromSearch(search), [search]);
  const [storedRef, setStoredRef] = useState<string | null>(() =>
    getStoredReferrerAddress()
  );

  useEffect(() => {
    const fromUrl = parseValidRefFromSearch(search);
    if (fromUrl) {
      setStoredRef(fromUrl);
      return;
    }
    setStoredRef(getStoredReferrerAddress());
  }, [search]);

  return !!(refFromUrl || storedRef);
}

/** Persist `?ref=0x…` into sessionStorage for signup (sent as `X-Cut-Referrer-Address`). */
export function useReferralCapture(): void {
  const { search } = useLocation();
  useEffect(() => {
    const refLower = parseValidRefFromSearch(search);
    if (!refLower) return;
    setStoredReferrerAddress(refLower);
  }, [search]);
}
