"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Target,
  Menu,
  X,
  Settings,
  LogOut,
  User,
  Zap,
  MessageSquare,
  Brain,
  FolderGit2,
  Activity,
  History,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import { WorkerStatus } from "./WorkerStatus";

const navItems = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/dashboard/schedule", label: "Schedule", icon: Calendar },
  { href: "/dashboard/habits", label: "Habits", icon: Target },
  { href: "/dashboard/assistant", label: "Assistant", icon: MessageSquare },
  { href: "/dashboard/assistant/memory", label: "Memory", icon: Brain },
  { href: "/dashboard/assistant/delegated", label: "Delegated", icon: FolderGit2 },
  { href: "/dashboard/integrations", label: "Integrations", icon: Zap },
  { href: "/dashboard/notifications", label: "Notifications", icon: History },
  { href: "/dashboard/automations", label: "Automations", icon: Activity },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function UserProfile() {
  const { data: session } = useSession();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/login");
    router.refresh();
  }

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 border-t border-border pt-4 mt-2">
      <Link href="/dashboard/settings" className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity min-w-0">
        <div className="flex h-8 w-8 shrink-0 overflow-hidden items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
          {session?.user?.image ? (
            <img src={session.user.image} alt={userName} className="h-full w-full object-cover" />
          ) : session ? (
            initials
          ) : (
            <User size={14} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-medium">{userName}</div>
          <div className="truncate text-xs text-muted-foreground">{userEmail}</div>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSignOut}
        disabled={signingOut}
        title="Sign out"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <LogOut size={14} />
      </Button>
    </div>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <nav
        className={cn(
          "fixed bottom-0 left-0 top-0 z-40 flex w-[260px] flex-col border-r border-border bg-card p-3 transition-transform duration-300 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="mb-6 flex items-center gap-2.5 px-3 py-2">
          <Logo imageSize={24} />
        </div>

        {/* Primary action */}
        <div className="px-1 mb-4">
          <Link href="/dashboard">
            <Button variant="outline" className="w-full justify-start gap-2 text-sm font-normal h-9">
              <LayoutDashboard size={15} />
              Open today
            </Button>
          </Link>
        </div>

        {/* Nav Items */}
        <div className="flex flex-1 flex-col gap-0.5 px-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/dashboard");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Bottom */}
        <div className="flex flex-col gap-3 px-1">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <div className="px-1 mt-1 border-t border-border/50 pt-2">
            <WorkerStatus />
          </div>
          <UserProfile />
        </div>
      </nav>

      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-3 top-3 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </Button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
