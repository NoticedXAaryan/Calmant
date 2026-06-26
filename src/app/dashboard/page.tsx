"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import AssistantChat from "@/components/AssistantChat";
import { useSession } from "@/lib/auth-client";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!document.cookie.includes("vibe2ship_onboarded=true")) {
      router.push("/dashboard/onboarding");
    } else {
      setReady(true);
    }
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
    <div className="flex h-[calc(100vh-56px)] flex-col md:h-screen">
      <AssistantChat userName={userName} />
    </div>
  );
}
