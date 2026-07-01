"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MonitorPlay, Activity } from "lucide-react";
import AssistantChat from "@/components/AssistantChat";
import { useSession } from "@/lib/auth-client";
import { SandboxStatus } from "@/components/LiveSandboxViewer";
import { ActionPanel } from "@/components/app/assistant/ActionPanel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

// Dummy data for visual demonstration
const initialToolActions = [
  { id: "1", message: "Assistant is checking your tasks...", status: "success" as const, time: "10:00 AM" },
  { id: "2", message: "Assistant created task 'Check emails'", status: "success" as const, time: "10:01 AM" },
  { id: "3", message: "Assistant opened browser session...", status: "pending" as const, time: "Just now" },
];

export default function AssistantPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [ready, setReady] = useState(false);
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatus>('idle');
  const [toolActions, setToolActions] = useState(initialToolActions);

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

      {/* Mobile Action Panel Trigger */}
      <div className="absolute right-4 top-4 z-40 lg:hidden">
        <Sheet>
          <SheetTrigger render={
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg border-border/50 bg-card/80 backdrop-blur-md hover:bg-accent group relative overflow-hidden"
            />
          }>
            <Activity className="h-5 w-5" />
            {sandboxStatus === 'live' && (
              <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
            )}
          </SheetTrigger>
          <SheetContent side="right" className="w-[380px] sm:w-[480px] p-0">
            <ActionPanel 
              sandboxStatus={sandboxStatus} 
              setSandboxStatus={setSandboxStatus} 
              toolActions={toolActions}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Persistent Action Panel */}
      <div className="hidden lg:block">
        <ActionPanel 
          sandboxStatus={sandboxStatus} 
          setSandboxStatus={setSandboxStatus} 
          toolActions={toolActions}
        />
      </div>
    </div>
  );
}
