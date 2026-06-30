"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Bell } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  taskId?: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/email?action=unread");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
      }
      
      const healthRes = await fetch("/api/integrations/status");
      const healthData = await healthRes.json();
      
      if (healthData.success && healthData.data) {
        const degraded: Notification[] = [];
        for (const [key, val] of Object.entries(healthData.data)) {
          const integration = val as any;
          if (integration.status === 'degraded') {
            degraded.push({
              id: `degraded-${key}`,
              type: 'critical',
              title: `${key.charAt(0).toUpperCase() + key.slice(1)} Connection Issue`,
              message: integration.lastError || "Action required: Please reconnect to restore service.",
              timestamp: new Date().toISOString(),
              read: false,
            });
          }
        }
        
        if (degraded.length > 0) {
          setNotifications(prev => {
            const map = new Map(prev.map(p => [p.id, p]));
            degraded.forEach(d => map.set(d.id, d));
            return Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          });
        }
      }
    } catch {
      // Silently fail — notifications are non-critical
    }
  }, []);

  useEffect(() => {
     
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function dismiss(id: string) {
    setDismissed(prev => new Set(prev).add(id));
    try {
      await fetch("/api/notifications/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "mark-read", notificationId: id }),
      });
    } catch {
      // Silently fail
    }
  }

  const visible = notifications.filter(n => !dismissed.has(n.id)).slice(0, 3);

  if (visible.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      top: "16px",
      right: "16px",
      zIndex: 80,
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      maxWidth: "380px",
      width: "100%",
    }}>
      <AnimatePresence>
        {visible.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            style={{
              background: "var(--color-surface-2)",
              border: `1px solid ${notif.type === "critical" ? "rgba(239, 68, 68, 0.3)" : "var(--color-glass-border)"}`,
              borderRadius: "12px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              boxShadow: notif.type === "critical"
                ? "0 4px 20px rgba(239, 68, 68, 0.15)"
                : "0 4px 20px rgba(0, 0, 0, 0.3)",
              cursor: notif.id.startsWith("degraded-") ? "pointer" : "default"
            }}
            onClick={() => {
              if (notif.id.startsWith("degraded-")) {
                window.location.href = "/dashboard/integrations";
              }
            }}
          >
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: notif.type === "critical"
                ? "rgba(239, 68, 68, 0.1)"
                : "rgba(99, 102, 241, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              {notif.type === "critical" ? (
                <AlertTriangle size={16} color="var(--color-entropy-hot)" />
              ) : (
                <Bell size={16} color="var(--color-agent-primary)" />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                marginBottom: "2px",
              }}>
                {notif.title}
              </div>
              <div style={{
                fontSize: "12px",
                color: "var(--color-text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {notif.message}
              </div>
            </div>
            <button
              onClick={() => dismiss(notif.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "6px",
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
