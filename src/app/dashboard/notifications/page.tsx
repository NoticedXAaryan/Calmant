"use client";

import { useEffect, useState } from "react";
import { Loader2, History, CheckCircle2, XCircle, Mail, MessageCircle, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NotificationDelivery {
  id: string;
  channel: string;
  intent: string;
  status: string;
  createdAt: string;
  error: string | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchNotifications() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setNotifications(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  function getChannelIcon(channel: string) {
    switch (channel) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "telegram":
      case "whatsapp":
        return <MessageCircle className="h-4 w-4" />;
      case "in_app":
        return <Smartphone className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "delivered":
      case "sent":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
      case "bounced":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <History className="h-6 w-6 text-primary" />
            Notification History
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review alerts sent by the system across all configured channels.
          </p>
        </div>
        <Button variant="outline" onClick={fetchNotifications} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && notifications.length === 0 ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-sm text-muted-foreground italic p-12 border border-dashed rounded-lg text-center">
          No notifications have been sent yet.
        </div>
      ) : (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Intent</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(n.status)}
                      <span className="capitalize">{n.status}</span>
                    </div>
                    {n.error && (
                      <div className="mt-1 text-xs text-red-500 max-w-[200px] truncate" title={n.error}>
                        {n.error}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="capitalize flex w-fit items-center gap-1.5">
                      {getChannelIcon(n.channel)}
                      {n.channel.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 capitalize">{n.intent.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
