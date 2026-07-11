"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Camera,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  MonitorPlay,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SandboxViewerProps {
  /** If provided, auto-opens this session */
  sessionId?: string;
  /** Compact mode for side-panel usage */
  compact?: boolean;
}

export function SandboxViewer({ sessionId: initialSessionId, compact = false }: SandboxViewerProps) {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [navigating, setNavigating] = useState(false);
  const [pageTitle, setPageTitle] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Check sandbox health & active session
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sandbox?action=status");
      if (res.ok) {
        // Try the status endpoint
      }
      const statusRes = await fetch("/api/sandbox", { method: "GET" });
      if (!statusRes.ok) {
        // Try alternative path
      }
    } catch {}

    // Direct check
    try {
      const res = await fetch("/api/sandbox/status");
      if (res.ok) {
        const data = await res.json();
        setHealthy(data.healthy);
        if (data.active && data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }
      }
    } catch {
      // Sandbox not reachable — use the GET route
      try {
        const res = await fetch("/api/sandbox");
        if (res.ok) {
          const data = await res.json();
          setHealthy(data.healthy);
          if (data.active && data.sessionId && !sessionId) {
            setSessionId(data.sessionId);
          }
        }
      } catch {
        setHealthy(false);
      }
    }
  }, [sessionId]);

  // Take screenshot
  const takeScreenshot = useCallback(async () => {
    if (!sessionId) return;
    setScreenshotLoading(true);

    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "screenshot" }),
      });

      if (res.ok) {
        const data = await res.json();
        // Build the URL to the screenshot
        const imgUrl = data.url
          ? `${process.env.NEXT_PUBLIC_SANDBOX_URL || ""}${data.url}`
          : null;

        if (imgUrl) {
          // Add cache-busting param
          setScreenshotUrl(`${imgUrl}?t=${Date.now()}`);
        }
      }
    } catch (err) {
      console.error("[SandboxViewer] Screenshot error:", err);
    } finally {
      setScreenshotLoading(false);
    }
  }, [sessionId]);

  // Navigate to URL
  const navigateToUrl = useCallback(async (url: string) => {
    if (!sessionId || !url) return;
    setNavigating(true);

    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "navigate", url }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUrl(data.url || url);
        setPageTitle(data.title || "");
        // Auto-take screenshot after navigation
        setTimeout(takeScreenshot, 500);
      }
    } catch (err) {
      console.error("[SandboxViewer] Navigate error:", err);
    } finally {
      setNavigating(false);
    }
  }, [sessionId, takeScreenshot]);

  // Poll for health
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  // Auto-refresh screenshots
  useEffect(() => {
    if (autoRefresh && sessionId) {
      refreshInterval.current = setInterval(takeScreenshot, 3000);
    }
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
        refreshInterval.current = null;
      }
    };
  }, [autoRefresh, sessionId, takeScreenshot]);

  // Compact collapsed state
  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed right-4 bottom-4 z-50 p-3 rounded-full bg-card border border-border/50 shadow-lg hover:shadow-xl transition-all group"
      >
        <MonitorPlay className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        {healthy && sessionId && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
        )}
      </button>
    );
  }

  return (
    <Card className={`border-border/40 bg-card/60 backdrop-blur-xl overflow-hidden ${
      compact ? "fixed right-4 bottom-4 z-50 w-96 shadow-2xl" : ""
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Browser Sandbox</span>
            {healthy === true && (
              <Badge variant="outline" className="text-xs text-green-400 border-green-400/20">
                Online
              </Badge>
            )}
            {healthy === false && (
              <Badge variant="outline" className="text-xs text-red-400 border-red-400/20">
                Offline
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {sessionId && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setAutoRefresh(!autoRefresh)}
                title={autoRefresh ? "Stop auto-refresh" : "Auto-refresh screenshots"}
              >
                {autoRefresh ? (
                  <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            {compact && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setExpanded(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* URL Bar */}
        {sessionId && (
          <div className="flex items-center gap-1.5 mt-2">
            <form
              className="flex-1 flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                navigateToUrl(urlInput);
              }}
            >
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter URL..."
                className="h-7 text-xs bg-background/50"
              />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                disabled={navigating || !urlInput}
              >
                {navigating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </form>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={takeScreenshot}
              disabled={screenshotLoading}
              title="Take screenshot"
            >
              {screenshotLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {!healthy && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <MonitorPlay className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Sandbox is not running</p>
            <p className="text-xs mt-1 opacity-60">
              Start Docker to enable browser automation
            </p>
          </div>
        )}

        {healthy && !sessionId && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Globe className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No active browser session</p>
            <p className="text-xs mt-1 opacity-60">
              Sessions start when the agent needs to browse
            </p>
          </div>
        )}

        {healthy && sessionId && (
          <div className="space-y-2">
            {/* Page info */}
            {pageTitle && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate">{pageTitle}</span>
                {currentUrl && (
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Screenshot viewport */}
            <AnimatePresence mode="wait">
              {screenshotUrl ? (
                <motion.div
                  key={screenshotUrl}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative rounded-lg overflow-hidden border border-border/30 bg-black"
                >
                  <img
                    src={screenshotUrl}
                    alt="Browser screenshot"
                    className="w-full h-auto"
                    onError={() => setScreenshotUrl(null)}
                  />
                  {screenshotLoading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="rounded-lg border border-border/20 bg-black/30 aspect-video flex items-center justify-center">
                  <div className="text-center text-muted-foreground/50">
                    <Camera className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">Click 📷 to capture</p>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* Session info */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/50 pt-1">
              <span>Session: {sessionId.slice(-8)}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-1.5 text-[10px]"
                onClick={takeScreenshot}
              >
                <RefreshCw className="h-2.5 w-2.5 mr-0.5" />
                Refresh
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
