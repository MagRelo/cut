import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { type GlobalErrorDetails } from "../../contexts/GlobalErrorContext";

interface GlobalErrorOverlayProps {
  error: GlobalErrorDetails | null;
}

export const GlobalErrorOverlay: React.FC<GlobalErrorOverlayProps> = ({ error }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !error) {
    return null;
  }

  const handleRetry = () => {
    if (error.onRetry) {
      error.onRetry();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
      <div className="relative max-w-md w-full rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl text-white">
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 h-16 w-16 rounded-full border border-white/40 bg-white/90 flex items-center justify-center shadow-xl">
          <img src="/logo-transparent.png" alt="the Cut" className="h-12" />
        </div>

        <div className="pt-14 pb-10 px-8 text-center">
          <p className="text-sm font-semibold tracking-[0.3em] uppercase text-white/70">the Cut</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            {error.title ?? "We hit a rough patch"}
          </h2>
          <p className="mt-3 text-sm text-white/80">{error.message}</p>

          <div className="mt-8 flex flex-col gap-3">
            {error.onRetry && (
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center justify-center rounded-full bg-white/90 px-6 py-2.5 text-sm font-semibold text-slate-900 shadow hover:bg-white"
              >
                {error.retryLabel ?? "Try Again"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
