import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isAddress } from "viem";
import { setStoredReferrerAddress } from "../lib/referralCapture";

/** Persist `?ref=0x…` into sessionStorage for signup (sent as `X-Cut-Referrer-Address`). */
export function useReferralCapture(): void {
  const { search } = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(search);
    const ref = params.get("ref")?.trim();
    if (!ref || !isAddress(ref)) return;
    setStoredReferrerAddress(ref.toLowerCase());
  }, [search]);
}
