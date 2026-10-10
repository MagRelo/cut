import React from "react";
import { Footer } from "../common/Footer";
import { PageContentPanel } from "./PagePanel";
import { TopNav } from "./TopNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-100">
      <main className="min-h-0 flex-1 pb-6">
        <div className="container mx-auto">
          <div className="mx-auto max-w-shell">
            <TopNav />
            <PageContentPanel>{children}</PageContentPanel>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};
