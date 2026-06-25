"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  Target,
  Menu,
  X,
  Zap,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/habits", label: "Habits", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/integrations", label: "Integrations", icon: Zap },
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
      <Link href="/settings" className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity min-w-0">
        <div className="flex h-8 w-8 shrink-0 overflow-hidden items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          {session?.user?.image ? (
            <img src={session.user.image} alt={userName} className="h-full w-full object-cover" />
          ) : session ? (
            initials
          ) : (
            <User size={14} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate text-xs font-semibold">{userName}</div>
          <div className="truncate text-[10px] text-muted-foreground">{userEmail}</div>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSignOut}
        disabled={signingOut}
        title="Sign out"
        className="h-8 w-8 text-muted-foreground"
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
          "fixed bottom-0 left-0 top-0 z-40 flex w-64 flex-col border-r bg-card p-4 transition-transform duration-300 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
            <Zap size={20} />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">Life Saver</div>
            <div className="text-[11px] font-medium text-muted-foreground">AI Companion</div>
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-md bg-primary"
                  />
                )}
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-3 py-2.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
            <div>
              <div className="text-[11px] font-semibold">Agent Active</div>
              <div className="text-[10px] text-muted-foreground">Watching tasks</div>
            </div>
            <Sparkles size={12} className="ml-auto text-primary" />
          </div>

          <UserProfile />
        </div>
      </nav>

      {/* Mobile Toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden bg-card"
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
