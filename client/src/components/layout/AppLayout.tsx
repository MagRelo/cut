import React from "react";
import { useLocation } from "react-router-dom";
import { Footer } from "../common/Footer";
import { PageContentPanel } from "./PagePanel";
import { SportEventContextBar } from "../platform/SportEventContextBar";
import { TopNav } from "./TopNav";
import { SportActiveEventScopeProvider } from "../../contexts/EventScopeContext";
import { useSportContext } from "../../contexts/SportContext";
import { showSportEventContext } from "../../lib/sportEventContextRoutes";

interface AppLayoutProps {
  children: React.ReactNode;
}

function SportEventScopeShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { sportId } = useSportContext();
  const showBar = showSportEventContext(location.pathname);

  if (!showBar) {
    return <>{children}</>;
  }

  return (
    <SportActiveEventScopeProvider sportId={sportId}>
      <SportEventContextBar />
      {children}
    </SportActiveEventScopeProvider>
  );
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-dvh bg-gray-100 flex flex-col">
      <main className="flex-1 min-h-0 pb-6">
        <div className="container mx-auto">
          <div className="max-w-shell mx-auto">
            <TopNav />
            <SportEventScopeShell>
              <PageContentPanel>{children}</PageContentPanel>
            </SportEventScopeShell>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};
