import React from 'react';
import { TopNavigation } from '@/components/TopNavigation';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      {/* Top Navigation */}
      <TopNavigation />

      {/* Main Content - Full Width */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}

/*
 * COMMENTED OUT - OLD SIDEBAR LAYOUT (Phase 2: Dashboard Consolidation)
 * Preserved for potential design revert
 *
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="flex h-full items-center px-6">
              <SidebarTrigger className="mr-4" />
              <div className="flex-1" />
            </div>
          </header>

          <main className="flex-1 p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
*/