import React from "react";
import { Footer } from "../common/Footer";
import { PageContentPanel } from "./PagePanel";
import { TopNav } from "./TopNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-dvh bg-gray-100 flex flex-col">
      <main className="flex-1 min-h-0 pb-6">
        <div className="container mx-auto">
          <div className="max-w-shell mx-auto">
            <TopNav />
            <PageContentPanel>{children}</PageContentPanel>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};
