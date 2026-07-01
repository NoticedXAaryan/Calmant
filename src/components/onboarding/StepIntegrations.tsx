import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Smartphone, Calendar, Mail, Loader2, CheckCircle2 } from "lucide-react";

export function StepIntegrations({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [connected, setConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const generateTelegramCode = useCallback(async () => {
    setGeneratingCode(true);
    try {
      const res = await fetch("/api/integrations/telegram/connect-code", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setTelegramCode(data.data.code);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingCode(false);
    }
  }, []);

  useEffect(() => {
    if (!telegramCode && !connected) {
      generateTelegramCode();
    }
  }, [telegramCode, generateTelegramCode, connected]);

  useEffect(() => {
    if (connected) return;
    const interval = setInterval(async () => {
      setCheckingStatus(true);
      try {
        const res = await fetch("/api/integrations/status");
        const data = await res.json();
        if (data.success && data.data.telegram?.configured && data.data.telegram?.userLinked) {
          setConnected(true);
          clearInterval(interval);
        }
      } catch (e) {
        // ignore
      } finally {
        setCheckingStatus(false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [connected]);

  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect your platforms so Calmant can see your schedule and message you.
        </p>
      </div>

      <div className="space-y-4">
        {/* Telegram Integration */}
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#0088cc]/10 text-[#0088cc] rounded-lg">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Telegram</h3>
                <p className="text-xs text-muted-foreground">Receive instant notifications</p>
              </div>
            </div>
            {connected ? (
              <span className="flex items-center text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Connected
              </span>
            ) : null}
          </div>

          {!connected && (
            <div className="bg-muted/30 rounded-md p-4 text-center">
              {generatingCode ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating code...
                </div>
              ) : telegramCode ? (
                <div>
                  <p className="text-sm font-medium mb-2">Message this code to @CalmantBot</p>
                  <code className="px-3 py-1.5 bg-background border border-border rounded-md text-lg font-mono font-bold tracking-widest select-all">
                    {telegramCode}
                  </code>
                  <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
                    {checkingStatus && <Loader2 className="h-3 w-3 animate-spin" />}
                    Waiting for connection...
                  </p>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={generateTelegramCode}>
                  Retry Connection
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Google Calendar Mock */}
        <div className="p-4 rounded-lg border border-border bg-card opacity-50 pointer-events-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted text-muted-foreground rounded-lg">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Google Calendar</h3>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" disabled>Connect</Button>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button onClick={onNext}>
          {connected ? "Next" : "Skip"} <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
