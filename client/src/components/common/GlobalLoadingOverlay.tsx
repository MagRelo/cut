import React, { useEffect, useRef, useState } from "react";
import { BRAND_PROSE, BRAND_WORDMARK } from "../../lib/brand";
import { LoadingSpinnerSmall } from "./LoadingSpinnerSmall";

interface GlobalLoadingOverlayProps {
  isBlocking: boolean;
}

const FADE_DURATION_MS = 300;
const MIN_VISIBLE_MS = 750;
const DEBUG_FORCE_OVERLAY = false;

export const GlobalLoadingOverlay: React.FC<GlobalLoadingOverlayProps> = ({ isBlocking }) => {
  const shouldForceOverlay = DEBUG_FORCE_OVERLAY;
  const effectiveBlocking = shouldForceOverlay || isBlocking;
  const [isRendered, setIsRendered] = useState(effectiveBlocking);
  const [isVisible, setIsVisible] = useState(effectiveBlocking);
  const visibleSinceRef = useRef<number | null>(effectiveBlocking ? Date.now() : null);

  useEffect(() => {
    if (effectiveBlocking) {
      setIsRendered(true);
      visibleSinceRef.current = Date.now();
      const rafId = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(rafId);
    }

    const shownAt = visibleSinceRef.current;
    const elapsedMs = shownAt ? Date.now() - shownAt : MIN_VISIBLE_MS;
    const remainingMs = Math.max(0, MIN_VISIBLE_MS - elapsedMs);

    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, remainingMs);

    const unmountTimer = window.setTimeout(() => {
      setIsRendered(false);
      visibleSinceRef.current = null;
    }, remainingMs + FADE_DURATION_MS);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(unmountTimer);
    };
  }, [effectiveBlocking]);

  if (!isRendered) {
    return null;
  }

  return (
    <div
      aria-hidden={!isVisible}
      aria-live="polite"
      role="status"
      className={`fixed inset-0 ${
        shouldForceOverlay
          ? "z-[9999] bg-fuchsia-600/70 outline outline-4 outline-yellow-300"
          : "z-[900] bg-slate-950"
      } flex items-center justify-center transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex flex-col items-center gap-2 text-white">
        <img src="/logo-transparent.png" alt={`${BRAND_PROSE} logo`} className="h-14 w-auto" />

        <div>
          <p className="text-sm tracking-[0.2em] uppercase text-white/80">{BRAND_WORDMARK}</p>
        </div>

        <div className="scale-125 mt-2">
          <LoadingSpinnerSmall color="white" />
        </div>
      </div>
    </div>
  );
};
