"use client";

import { useEffect } from "react";

export default function SystemBootstrap() {
  useEffect(() => {
    // Fire-and-forget: ensure background systems are running
    // This allows the Telegram bot and background worker to start 
    // automatically when any user loads the dashboard.
    fetch('/api/telegram/init').catch(() => {});
    fetch('/api/worker/start', { method: 'POST' }).catch(() => {});
  }, []);
  
  return null; // Renders nothing, just triggers side effects
}
