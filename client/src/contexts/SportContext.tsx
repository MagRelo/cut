import React, { createContext, useContext, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { DEFAULT_SPORT_ID } from "../hooks/useSportData";

type SportContextValue = {
  sportId: string;
};

const SportContext = createContext<SportContextValue>({ sportId: DEFAULT_SPORT_ID });

export function SportProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const location = useLocation();

  const sportId = useMemo(() => {
    if (params.sportId) {
      return params.sportId;
    }
    const match = location.pathname.match(/^\/sports\/([^/]+)/);
    return match?.[1] ?? DEFAULT_SPORT_ID;
  }, [location.pathname, params.sportId]);

  const value = useMemo(() => ({ sportId }), [sportId]);

  return <SportContext.Provider value={value}>{children}</SportContext.Provider>;
}

export function useSportContext(): SportContextValue {
  return useContext(SportContext);
}
