"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Send,
  Network
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectionCard } from "@/components/app/premium/ConnectionCard";
import { StatusState } from "@/lib/design/status";

interface IntegrationStatus {
  email: { configured: boolean; unreadCount: number; status: string };
  telegram: { configured: boolean; running: boolean; startedAt: string | null; userLinked: boolean; label: string; status: string };
  googleCalendar: { configured: boolean; linked: boolean; label: string; status: string };
  whatsapp: { configured: boolean; label: string; status: string };
  inApp: { configured: boolean; unreadCount: number; queueSize: number; status: string };
}

export default function ConnectionsPage() {
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
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load connections");
      setStatus(data.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load connections");
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
      setMessage(data.success ? "Test email sent." : data.error || "Email is not connected.");
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

  // Helper to map backend status to our new design system states
  const getStatusState = (isConfigured: boolean, backendStatus?: string): StatusState => {
    if (backendStatus === 'degraded') return 'error';
    if (isConfigured) return 'success';
    return 'warning';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8 space-y-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-calmant-electric-blue)]">
            <Network className="h-4 w-4" />
            Connections
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Command Channels
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Connect the services that allow your AI assistant to read contexts, take actions, and reach you directly on your terms.
          </p>
        </div>
        <Button variant="outline" onClick={fetchStatus} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync Connections
        </Button>
      </header>

      {message && (
        <div className="rounded-lg border border-[var(--color-calmant-electric-blue)] bg-[var(--color-calmant-electric-blue)]/10 px-4 py-3 text-sm text-[var(--color-calmant-electric-blue)] font-medium">
          {message}
        </div>
      )}

      {loading && !status ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-calmant-electric-blue)]" />
        </div>
      ) : status ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <ConnectionCard
            title="Telegram Command Center"
            description="Allows you to capture tasks, send voice notes, and approve critical actions directly from Telegram."
            icon={MessageCircle}
            status={getStatusState(status.telegram.configured && status.telegram.running, status.telegram.status)}
            lastVerified={status.telegram.startedAt ? new Date(status.telegram.startedAt).toLocaleString() : undefined}
            blocker={!status.telegram.configured ? "Missing TELEGRAM_BOT_TOKEN in environment" : undefined}
            setupSteps={
              status.telegram.configured && !status.telegram.running
                ? ["Start the bot listener", "Generate a connection code", "Send the code to your Telegram bot"]
                : undefined
            }
            actionButton={
              status.telegram.configured ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={startTelegram} disabled={startingTelegram}>
                    {startingTelegram ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {status.telegram.running ? "Verify Listener" : "Start Listener"}
                  </Button>
                  {status.telegram.running && (
                    <Button size="sm" variant="secondary" onClick={generateTelegramCode} disabled={generatingCode}>
                      {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Get Connect Code
                    </Button>
                  )}
                  {telegramCode && (
                    <div className="w-full text-xs font-semibold text-[var(--color-calmant-electric-blue)] mt-2">
                      Send to bot: <code className="rounded bg-[var(--color-calmant-electric-blue)]/10 px-1.5 py-0.5">/connect {telegramCode}</code>
                    </div>
                  )}
                </div>
              ) : (
                <Button size="sm" variant="outline" disabled>Requires Token</Button>
              )
            }
          />

          <ConnectionCard
            title="Google Calendar Intelligence"
            description="Unlocks schedule awareness. The assistant can view your upcoming events and schedule focused work blocks."
            icon={CalendarDays}
            status={getStatusState(status.googleCalendar.configured && status.googleCalendar.linked, status.googleCalendar.status)}
            setupSteps={!status.googleCalendar.linked ? ["Sign out and sign back in using a Google account with Calendar permissions"] : undefined}
            actionButton={
              status.googleCalendar.linked ? (
                <Button size="sm" variant="outline" onClick={checkCalendarHealth} disabled={checkingCalendar}>
                  {checkingCalendar ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Verify Access
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled>Sign In Required</Button>
              )
            }
          />

          <ConnectionCard
            title="Email Outcomes"
            description="Allows the assistant to send critical alerts, reports, and approved notifications directly to your inbox."
            icon={Mail}
            status={getStatusState(status.email.configured, status.email.status)}
            blocker={!status.email.configured ? "Missing RESEND_API_KEY or email variables in environment" : undefined}
            actionButton={
              <Button size="sm" variant="outline" onClick={sendTestEmail} disabled={sendingEmail || !status.email.configured}>
                {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send Test Notification
              </Button>
            }
          />

          <ConnectionCard
            title="In-App Activity Alerts"
            description="Local dashboard notifications for runs, events, and required approvals while you are actively using the web app."
            icon={Bell}
            status="active" // Always on locally
            actionButton={
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-4">
                <span>Queue: {status.inApp.queueSize}</span>
                <span>Unread: {status.inApp.unreadCount}</span>
              </div>
            }
          />
        </div>
      ) : null}
    </div>
  );
}
