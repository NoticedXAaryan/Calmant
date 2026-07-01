"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  LayoutDashboard,
  MessageSquare,
  ListTodo,
  Brain,
  Zap,
  Activity,
  History,
  Settings,
  FolderGit2,
  Search,
  Target,
  Bell,
  Blocks,
  HelpCircle,
} from "lucide-react";

import { useSession, signOut } from "@/lib/auth-client";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WorkerStatus } from "@/components/WorkerStatus";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navGroups = [
  {
    title: "Work",
    items: [
      { title: "Today", url: "/dashboard", icon: LayoutDashboard },
      { title: "Plan", url: "/dashboard/schedule", icon: Calendar },
      { title: "Focus", url: "/dashboard/habits", icon: Target },
    ],
  },
  {
    title: "AI",
    items: [
      { title: "Assistant", url: "/dashboard/assistant", icon: MessageSquare },
      { title: "Delegated work", url: "/dashboard/assistant/delegated", icon: FolderGit2 },
      { title: "Memory", url: "/dashboard/assistant/memory", icon: Brain },
      { title: "Activity log", url: "/dashboard/activity", icon: Activity },
    ],
  },
  {
    title: "Automation",
    items: [
      { title: "Automations", url: "/dashboard/automations", icon: Zap },
      { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
      { title: "Integrations", url: "/dashboard/integrations", icon: Blocks },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="border-b border-border/40 pb-4 pt-4 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 mb-4">
          <Logo imageSize={24} />
        </Link>
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground shadow-sm h-9"
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        >
          <Search className="mr-2 h-4 w-4" />
          Search or command...
          <kbd className="pointer-events-none absolute right-2 top-[50%] -translate-y-[50%] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={pathname === item.url || (item.url === '/dashboard' && pathname === '/dashboard')}
                      tooltip={item.title}
                      render={<Link href={item.url} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={pathname.startsWith("/dashboard/settings")} render={<Link href="/dashboard/settings" />}>
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/dashboard/settings" />}>
                  <HelpCircle />
                  <span>Help & Support</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-4 gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">Theme</span>
          <ThemeToggle />
        </div>
        <div className="py-2">
          <WorkerStatus />
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{userName}</span>
            <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Logout
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
