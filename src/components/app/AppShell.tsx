import * as React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { CommandPalette } from "./CommandPalette";
import { MobileNav } from "./MobileNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex min-h-screen flex-col">
          <AppTopbar />
          <main className="flex-1 overflow-x-hidden p-4 md:p-6 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {children}
          </main>
          <MobileNav />
        </div>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  );
}
