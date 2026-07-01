"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileItems = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/dashboard/assistant", label: "Assistant", icon: MessageSquare },
  { href: "/dashboard/automations", label: "Automations", icon: Zap },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-background/95 backdrop-blur border-t border-border/40 pb-[env(safe-area-inset-bottom)] pt-2 px-2 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.1)]">
      {mobileItems.map((item) => {
        const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/dashboard");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-lg transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon size={20} className={cn("transition-transform", isActive && "scale-110 text-primary")} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
