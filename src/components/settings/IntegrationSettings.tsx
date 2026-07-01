"use client";

import { useState, useCallback, useEffect } from "react";
import { SectionCard } from "@/components/app/SectionCard";
import { Button } from "@/components/ui/button";
import { Smartphone, Calendar, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export function IntegrationSettings() {
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

  const checkStatus = useCallback(async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch("/api/integrations/status");
      const data = await res.json();
      if (data.success && data.data.telegram?.configured && data.data.telegram?.userLinked) {
        setConnected(true);
      } else {
        setConnected(false);
      }
    } catch (e) {
      // ignore
    } finally {
      setCheckingStatus(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return (
    <div className="space-y-6">
      <SectionCard title="Connected Apps" description="Link external services to Calmant to expand your cockpit's reach.">
        <div className="space-y-4">
          {/* Telegram */}
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0088cc]/10 text-[#0088cc] rounded-lg">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Telegram Bot</h3>
                  <p className="text-xs text-muted-foreground">Receive instant reminders and chat with AI</p>
                </div>
              </div>
              {connected ? (
                <span className="flex items-center text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Connected
                </span>
              ) : (
                <span className="flex items-center text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                  <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Not Connected
                </span>
              )}
            </div>

            {!connected ? (
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
                    Generate Connection Code
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex justify-end gap-2 border-t border-border/50 pt-3 mt-3">
                <Button variant="outline" size="sm">Test Message</Button>
                <Button variant="ghost" size="sm" className="text-destructive">Disconnect</Button>
              </div>
            )}
          </div>

          {/* Google Calendar */}
          <div className="p-4 rounded-lg border border-border bg-card opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted text-muted-foreground rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Google Calendar</h3>
                  <p className="text-xs text-muted-foreground">Sync events to your daily plan (Coming Soon)</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" disabled>Connect</Button>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
