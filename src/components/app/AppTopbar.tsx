"use client";

import * as React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

export function AppTopbar() {
  const pathname = usePathname();

  // Simple breadcrumb logic
  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean);
    if (paths.length === 0) return "Dashboard";
    
    // Convert e.g., 'dashboard', 'settings' to 'Settings'
    const last = paths[paths.length - 1];
    return last.charAt(0).toUpperCase() + last.slice(1);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/40 bg-background/95 backdrop-blur px-4 supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <div className="mr-2 h-4 w-[1px] bg-border" />
      <Breadcrumb className="hidden sm:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium text-foreground">
              {getBreadcrumbs()}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground relative">
          <Bell size={16} />
          {/* Mock notification dot */}
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500 border-2 border-background" />
        </Button>
      </div>
    </header>
  );
}
