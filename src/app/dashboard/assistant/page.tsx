"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import AssistantChat from "@/components/AssistantChat";
import { useSession } from "@/lib/auth-client";
import { LiveSandboxViewer } from "@/components/LiveSandboxViewer";

export default function AssistantPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [ready, setReady] = useState(false);

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
    <div className="flex h-[calc(100vh-56px)] flex-col md:h-screen lg:flex-row w-full overflow-hidden">
      <div className="flex-1 min-w-0 h-full">
        <AssistantChat userName={userName} />
      </div>
      <div className="w-full lg:w-[400px] xl:w-[480px] border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-6 hidden lg:flex flex-col gap-6 overflow-y-auto">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Live Browser</h3>
          <p className="text-sm text-muted-foreground mt-1">Watch the Browser Department execute web tasks autonomously in real-time.</p>
        </div>
        <LiveSandboxViewer />
      </div>
    </div>
  );
}
