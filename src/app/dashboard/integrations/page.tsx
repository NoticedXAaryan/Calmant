"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Calendar,
  Bell,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
  ExternalLink,
  Shield,
  Clock,
  Cpu,
  MessageSquare,
} from "lucide-react";

interface NotificationStatus {
  emailConfigured: boolean;
  inAppQueueSize: number;
  unreadCount: number;
}

interface LLMStatus {
  gemini: { available: boolean; configured: boolean };
  hermes: { available: boolean; url: string };
}

export default function IntegrationsPage() {
  const [notifStatus, setNotifStatus] = useState<NotificationStatus | null>(null);
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [briefingResult, setBriefingResult] = useState<string | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/notifications/email?action=status");
      const data = await res.json();
      if (data.success) setNotifStatus(data.data);
    } catch (err) {
      console.error("Failed to fetch status:", err);
    }
  }

  async function sendTestEmail() {
    setSending(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/notifications/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "test" }),
      });
      const data = await res.json();
      setTestResult(
        data.data?.sent
          ? "✅ Test email sent successfully!"
          : `⚠️ ${data.data?.reason || "Failed to send"}`
      );
    } catch {
      setTestResult("❌ Failed to send test email");
    } finally {
      setSending(false);
    }
  }

  async function triggerBriefing(type: "morning" | "evening") {
    setLoadingBrief(true);
    setBriefingResult(null);
    try {
      const endpoint = type === "morning" ? "/api/agent/morning-brief" : "/api/agent/evening-review";
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      setBriefingResult(
        data.success
          ? `✅ ${type === "morning" ? "Morning briefing" : "Evening review"} generated!${data.data?.email?.sent ? " Email sent." : " (Email not configured)"}`
          : `⚠️ Failed to generate ${type} briefing`
      );
    } catch {
      setBriefingResult("❌ Failed to trigger briefing");
    } finally {
      setLoadingBrief(false);
    }
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: "32px" }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>
          Integrations
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
          Configure notification channels and connected services.
        </p>
      </motion.div>

      {/* Notification Channels */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Email (Resend) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card"
          style={{ padding: "24px" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "10px",
                background: "rgba(99, 102, 241, 0.1)", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <Mail size={20} color="var(--color-agent-primary)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "15px" }}>Email Notifications</div>
                <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>via Resend</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {notifStatus?.emailConfigured ? (
                <>
                  <CheckCircle2 size={16} color="var(--color-entropy-cool)" />
                  <span style={{ color: "var(--color-entropy-cool)", fontSize: "13px", fontWeight: 600 }}>Connected</span>
                </>
              ) : (
                <>
                  <XCircle size={16} color="var(--color-text-muted)" />
                  <span style={{ color: "var(--color-text-muted)", fontSize: "13px", fontWeight: 600 }}>Not configured</span>
                </>
              )}
            </div>
          </div>

          <div style={{
            padding: "12px 16px", background: "var(--color-surface-2)",
            borderRadius: "8px", marginBottom: "16px", fontSize: "13px", color: "var(--color-text-secondary)",
          }}>
            {notifStatus?.emailConfigured ? (
              <span>Emails will be sent for critical task alerts, morning briefings, and evening reviews.</span>
            ) : (
              <span>
                Set <code style={{ color: "var(--color-agent-primary)", background: "var(--color-surface-3)", padding: "2px 6px", borderRadius: "4px" }}>RESEND_API_KEY</code>
                {" and "}
                <code style={{ color: "var(--color-agent-primary)", background: "var(--color-surface-3)", padding: "2px 6px", borderRadius: "4px" }}>USER_EMAIL</code>
                {" environment variables to enable."}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button className="btn-secondary" onClick={sendTestEmail} disabled={sending} style={{ display: "flex", alignItems: "center", gap: "6px", opacity: sending ? 0.7 : 1 }}>
              {sending ? <Loader2 size={14} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
              Send test email
            </button>
            <button className="btn-ghost" onClick={() => triggerBriefing("morning")} disabled={loadingBrief} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={14} />
              Trigger morning brief
            </button>
            <button className="btn-ghost" onClick={() => triggerBriefing("evening")} disabled={loadingBrief} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={14} />
              Trigger evening review
            </button>
          </div>

          <AnimatePresence>
            {(testResult || briefingResult) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  marginTop: "12px", padding: "10px 14px", borderRadius: "8px",
                  background: "var(--color-surface-2)", fontSize: "13px",
                  color: "var(--color-text-secondary)",
                }}
              >
                {testResult || briefingResult}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Telegram Connection */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card"
          style={{ padding: "24px" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "10px",
                background: "rgba(0, 136, 204, 0.1)", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <MessageSquare size={20} color="#0088cc" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "15px" }}>Telegram Bot</div>
                <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Instant & Free External Bot</div>
              </div>
            </div>
          </div>

          <div style={{
            padding: "12px 16px", background: "var(--color-surface-2)",
            borderRadius: "8px", marginBottom: "16px", fontSize: "13px", color: "var(--color-text-secondary)",
          }}>
            <span>To use Telegram as your AI Assistant:</span>
            <ol style={{ marginTop: "8px", paddingLeft: "20px" }}>
              <li>Open Telegram and message <b>@BotFather</b></li>
              <li>Type <code>/newbot</code> and follow the prompts</li>
              <li>Copy the API Token and paste it into your <code>.env</code> file as <code>TELEGRAM_BOT_TOKEN=...</code></li>
              <li>Restart the server. The bot will automatically start polling!</li>
            </ol>
          </div>
        </motion.div>

        {/* WhatsApp Meta API Connection */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="glass-card"
          style={{ padding: "24px" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "10px",
                background: "rgba(34, 197, 94, 0.1)", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <MessageSquare size={20} color="#25D366" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "15px" }}>WhatsApp (Meta API)</div>
                <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Official WhatsApp Webhook</div>
              </div>
            </div>
          </div>

          <div style={{
            padding: "12px 16px", background: "var(--color-surface-2)",
            borderRadius: "8px", marginBottom: "16px", fontSize: "13px", color: "var(--color-text-secondary)",
          }}>
            <span>To use the official Meta WhatsApp API:</span>
            <ol style={{ marginTop: "8px", paddingLeft: "20px" }}>
              <li>Set up a Meta Developer account and create a WhatsApp App</li>
              <li>Set your webhook URL to <code>https://your-ngrok-url.com/api/whatsapp/meta/webhook</code></li>
              <li>Add the following to your <code>.env</code> file:
                <ul style={{ marginTop: "4px" }}>
                  <li><code>WHATSAPP_VERIFY_TOKEN</code> (Any random string you choose)</li>
                  <li><code>WHATSAPP_ACCESS_TOKEN</code> (Permanent or temporary token from Meta)</li>
                  <li><code>WHATSAPP_PHONE_ID</code> (Phone Number ID from Meta)</li>
                </ul>
              </li>
            </ol>
          </div>
        </motion.div>

        {/* In-App Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card"
          style={{ padding: "24px" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.1)", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <Bell size={20} color="var(--color-entropy-cool)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "15px" }}>In-App Notifications</div>
                <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Entropy alerts & toasts</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} color="var(--color-entropy-cool)" />
              <span style={{ color: "var(--color-entropy-cool)", fontSize: "13px", fontWeight: 600 }}>Active</span>
            </div>
          </div>
          <div style={{
            padding: "12px 16px", background: "var(--color-surface-2)",
            borderRadius: "8px", fontSize: "13px", color: "var(--color-text-secondary)",
          }}>
            {notifStatus ? (
              <span>Queue: {notifStatus.inAppQueueSize} notifications · {notifStatus.unreadCount} unread</span>
            ) : (
              <span>Loading status...</span>
            )}
          </div>
        </motion.div>

        {/* Google Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card"
          style={{ padding: "24px" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "10px",
                background: "rgba(66, 133, 244, 0.1)", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <Calendar size={20} color="#4285F4" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "15px" }}>Google Calendar</div>
                <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Sync schedule blocks</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} color="var(--color-entropy-cool)" />
              <span style={{ color: "var(--color-entropy-cool)", fontSize: "13px", fontWeight: 600 }}>Active</span>
            </div>
          </div>
          <div style={{
            padding: "12px 16px", background: "var(--color-surface-2)",
            borderRadius: "8px", fontSize: "13px", color: "var(--color-text-muted)",
          }}>
            Google Calendar integration is active. The AI will check your schedule before assigning deadlines.
          </div>
        </motion.div>

        {/* LLM Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card"
          style={{ padding: "24px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "10px",
              background: "rgba(168, 85, 247, 0.1)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Cpu size={20} color="var(--color-accent-purple)" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "15px" }}>AI Models</div>
              <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Groq (llama-3.3-70b-versatile)</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", background: "var(--color-surface-2)", borderRadius: "8px",
            }}>
              <span style={{ fontSize: "13px", fontWeight: 500 }}>Groq Fast Inference</span>
              <span style={{ fontSize: "12px", color: "var(--color-entropy-cool)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Shield size={12} /> Primary
              </span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", background: "var(--color-surface-2)", borderRadius: "8px",
            }}>
              <span style={{ fontSize: "13px", fontWeight: 500 }}>Whisper (Audio Transcription)</span>
              <span style={{ fontSize: "12px", color: "var(--color-entropy-cool)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Shield size={12} /> Primary
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ marginTop: "24px", display: "flex", gap: "16px", flexWrap: "wrap" }}
      >
        <a
          href="https://resend.com/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost"
          style={{ display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
        >
          <ExternalLink size={14} />
          Resend Docs
        </a>
      </motion.div>
    </div>
  );
}
