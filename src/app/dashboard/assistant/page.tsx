"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MonitorPlay, ChevronRight } from "lucide-react";
import AssistantChat from "@/components/AssistantChat";
import { useSession } from "@/lib/auth-client";
import { LiveSandboxViewer, SandboxStatus } from "@/components/LiveSandboxViewer";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function AssistantPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [ready, setReady] = useState(false);
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatus>('idle');
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!document.cookie.includes("vibe2ship_onboarded=true")) {
        router.push("/dashboard/onboarding");
      } else {
        setReady(true);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [router]);

  // Auto-expand sandbox when it goes live
  useEffect(() => {
    if (sandboxStatus === 'live') {
      setIsSandboxOpen(true);
    }
  }, [sandboxStatus]);

  const userName = session?.user?.name?.split(" ")[0] || undefined;

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col md:h-screen lg:flex-row w-full overflow-hidden relative bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 min-w-0 h-full relative z-0 transition-all duration-300 ease-in-out">
        <AssistantChat userName={userName} />
      </div>

      {/* Floating Widget (When Collapsed) */}
      <AnimatePresence>
        {!isSandboxOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute right-6 top-6 z-40 hidden lg:block"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsSandboxOpen(true)}
              className="h-12 w-12 rounded-full shadow-lg border-border/50 bg-card/80 backdrop-blur-md hover:bg-accent hover:text-accent-foreground group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <MonitorPlay className="h-5 w-5" />
              {sandboxStatus === 'live' && (
                <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expandable Sandbox Sidebar */}
      <AnimatePresence initial={false}>
        {isSandboxOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 480, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl hidden lg:flex flex-col z-30 shadow-2xl shrink-0 overflow-hidden"
          >
            <div className="w-[480px] flex-1 flex flex-col h-full p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <MonitorPlay className="w-5 h-5 text-primary" />
                    Live Browser
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Watch web tasks execute autonomously.</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSandboxOpen(false)}
                  className="rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 rounded-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-inner bg-black">
                <LiveSandboxViewer onStatusChange={setSandboxStatus} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
