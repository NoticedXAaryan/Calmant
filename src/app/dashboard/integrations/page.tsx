"use client";

import type { ElementType, ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Send,
  Smartphone,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface IntegrationStatus {
  email: { configured: boolean; unreadCount: number; status: string };
  telegram: { configured: boolean; running: boolean; startedAt: string | null; userLinked: boolean; label: string; status: string };
  googleCalendar: { configured: boolean; linked: boolean; label: string; status: string };
  whatsapp: { configured: boolean; label: string; status: string };
  inApp: { configured: boolean; unreadCount: number; queueSize: number; status: string };
}

interface ChannelCardProps {
  icon: ElementType;
  title: string;
  description: string;
  configured: boolean;
  statusText: string;
  backendStatus?: string;
  action?: ReactNode;
}

function ChannelCard({ icon: Icon, title, description, configured, statusText, backendStatus, action }: ChannelCardProps) {
  const isDegraded = backendStatus === 'degraded';
  
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        <Badge 
          variant={isDegraded ? "destructive" : "outline"} 
          className={cn(
            configured && !isDegraded ? "text-emerald-600 dark:text-emerald-400" : "",
            isDegraded ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20" : "",
            !configured && !isDegraded ? "text-muted-foreground" : ""
          )}
        >
          {!isDegraded && configured && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
          {isDegraded && <XCircle className="h-3.5 w-3.5 mr-1" />}
          {!isDegraded && !configured && <XCircle className="h-3.5 w-3.5 mr-1" />}
          {statusText}
        </Badge>
      </div>
      {action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export default function IntegrationsPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [startingTelegram, setStartingTelegram] = useState(false);
  const [checkingCalendar, setCheckingCalendar] = useState(false);
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/status", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load integrations");
      setStatus(data.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetchStatus();
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const sendTestEmail = async () => {
    setSendingEmail(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/email/test", { method: "POST" });
      const data = await res.json();
      setMessage(data.success ? "Test email sent." : data.error || "Email is not configured.");
    } catch {
      setMessage("Could not send test email.");
    } finally {
      setSendingEmail(false);
    }
  };

  const checkCalendarHealth = async () => {
    setCheckingCalendar(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/google-calendar/health", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage("Calendar health check passed! Live verification complete.");
      } else {
        setMessage(data.error || "Calendar health check failed.");
      }
      await fetchStatus();
    } catch {
      setMessage("Could not connect to Calendar.");
    } finally {
      setCheckingCalendar(false);
    }
  };

  const generateTelegramCode = async () => {
    setGeneratingCode(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/telegram/connect-code", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setTelegramCode(data.data.code);
        setMessage("Send this code to the bot.");
      } else {
        setMessage(data.error || "Failed to generate connect code.");
      }
    } catch {
      setMessage("Could not generate connect code.");
    } finally {
      setGeneratingCode(false);
    }
  };

  const startTelegram = async () => {
    setStartingTelegram(true);
    setMessage(null);
    try {
      const res = await fetch("/api/telegram/init");
      const data = await res.json();
      setMessage(data.message || (data.success ? "Telegram is running." : "Telegram is not ready."));
      await fetchStatus();
    } catch {
      setMessage("Could not start Telegram.");
    } finally {
      setStartingTelegram(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8 space-y-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" />
              Channels
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Integrations
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Connect the places where Calmant should reach you. The app works without external channels, but email and messaging make deadlines harder to miss.
            </p>
          </div>
          <Button variant="outline" onClick={fetchStatus} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </header>

        {message && (
          <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            {message}
          </div>
        )}

        {loading && !status ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : status ? (
          <div className="grid gap-4">
            <ChannelCard
              icon={Bell}
              title="In-app alerts"
              description={`Always on. Current queue: ${status.inApp.queueSize} alerts, ${status.inApp.unreadCount} unread.`}
              configured={status.inApp.configured}
              statusText="Active"
              backendStatus={status.inApp.status}
            />
            <ChannelCard
              icon={Mail}
              title="Email"
              description="Critical alerts and test notifications go to the configured recipient email."
              configured={status.email.configured}
              statusText={status.email.configured ? "Connected" : "Not configured"}
              backendStatus={status.email.status}
              action={
                <Button variant="outline" onClick={sendTestEmail} disabled={sendingEmail}>
                  {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send test
                </Button>
              }
            />
            <ChannelCard
              icon={CalendarDays}
              title="Google Calendar"
              description="Reads upcoming events and can place focused work blocks when the signed-in account has Calendar access."
              configured={status.googleCalendar.configured && status.googleCalendar.linked}
              statusText={status.googleCalendar.label}
              backendStatus={status.googleCalendar.status}
              action={
                <div className="flex flex-col gap-2 items-start">
                  <div className="text-sm text-muted-foreground">
                    Calendar uses Google sign-in with Calendar scopes. Sign out and sign back in with Google if this is not connected.
                  </div>
                  {status.googleCalendar.linked && (
                    <Button variant="outline" onClick={checkCalendarHealth} disabled={checkingCalendar}>
                      {checkingCalendar ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Run health check
                    </Button>
                  )}
                </div>
              }
            />
            <ChannelCard
              icon={MessageCircle}
              title="Telegram"
              description="Use Telegram for task capture and voice-note processing when the bot token is configured by the app owner."
              configured={status.telegram.configured && status.telegram.running}
              statusText={status.telegram.label}
              backendStatus={status.telegram.status}
              action={
                status.telegram.configured ? (
                  <div className="flex flex-col gap-3 items-start">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={startTelegram} disabled={startingTelegram}>
                        {startingTelegram ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                        {status.telegram.running ? "Check listener" : "Start bot listener"}
                      </Button>
                      {status.telegram.running && (
                        <Button variant="secondary" onClick={generateTelegramCode} disabled={generatingCode}>
                          {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          Get Connect Code
                        </Button>
                      )}
                    </div>
                    {telegramCode && (
                      <div className="mt-2 w-full text-sm font-semibold text-primary">
                        Send this exact message to the bot: <code className="rounded bg-muted px-2 py-1">/connect {telegramCode}</code>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Add TELEGRAM_BOT_TOKEN in the environment, then restart the app.
                  </div>
                )
              }
            />
            <ChannelCard
              icon={MessageCircle}
              title="WhatsApp"
              description="WhatsApp requires an official Meta webhook setup. When configured, incoming messages can route into the assistant."
              configured={status.whatsapp.configured}
              statusText={status.whatsapp.label}
              backendStatus={status.whatsapp.status}
              action={
                <div className="text-sm text-muted-foreground">
                  This channel is not user-self-serve yet; keep it hidden in production unless configured.
                </div>
              }
            />
          </div>
        ) : null}
    </div>
  );
}
