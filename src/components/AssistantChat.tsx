"use client";

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import VoiceInput from "./VoiceInput";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface QuickAction {
  label: string;
  message: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Schedule a meeting", message: "I need to schedule a meeting" },
  { label: "What's on my plate today?", message: "What does my day look like?" },
  { label: "Add a new task", message: "I need to add a new task" },
  { label: "Check my calendar", message: "Check my calendar for the next few days" },
];

const STORAGE_KEY = "calmant_chat_history";

/* ─── Helpers ──────────────────────────────────────────────────────── */

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
  } catch {
    /* quota exceeded */
  }
}

/* ─── Component ──────────────────────────────────────────────────────── */

export default function AssistantChat({ userName }: { userName?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setMessages(loadHistory());
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    if (mounted && messages.length > 0) {
      saveHistory(messages);
    }
  }, [messages, mounted]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });
        const data = await res.json();

        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content:
            data.success && data.data?.content
              ? data.data.content
              : data.error || "Something went wrong. Try again.",
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content: "I'm having trouble connecting. Please try again.",
            timestamp: Date.now(),
          },
        ]);
      }

      setLoading(false);
      inputRef.current?.focus();
    },
    [loading]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setInput(text);
    setTimeout(() => sendMessage(text), 300);
  };

  const greeting = getGreeting();

  return (
    <div className="flex h-full flex-col">
      {/* ── Messages area ────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center max-w-lg"
            >
              <h1 className="text-2xl font-semibold mb-2 text-foreground">
                {greeting}, {userName || "there"}
              </h1>
              <p className="text-muted-foreground text-[15px] mb-10">
                How can I help you today?
              </p>

              <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.message)}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="mx-auto max-w-[48rem] px-4 py-6">
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className={`mb-6 ${msg.role === "user" ? "" : ""}`}
              >
                {/* Role label */}
                <div className="mb-1.5 text-xs font-semibold text-foreground/70">
                  {msg.role === "user" ? (userName || "You") : "Calmant"}
                </div>

                {/* Message text */}
                <div
                  className={`text-[15px] leading-7 whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "text-foreground"
                      : "text-foreground/85"
                  }`}
                >
                  {msg.content}
                </div>

                {/* Divider between messages (not after last) */}
                {idx < messages.length - 1 && (
                  <div className="mt-6 border-b border-border/50" />
                )}
              </motion.div>
            ))}

            {/* Typing indicator */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-6"
                >
                  <div className="mb-1.5 text-xs font-semibold text-foreground/70">
                    Calmant
                  </div>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Input area ───────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-[48rem]"
        >
          <div className="relative flex items-end rounded-2xl border border-border bg-card px-3 py-2 shadow-sm focus-within:border-foreground/20 transition-colors">
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              disabled={loading}
            />

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Calmant..."
              disabled={loading}
              rows={1}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
              style={{ maxHeight: "200px" }}
            />

            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              className="h-8 w-8 shrink-0 rounded-lg"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>

          <p className="mt-2 text-center text-[11px] text-muted-foreground/50">
            Calmant can make mistakes. Check important info.
          </p>
        </form>
      </div>
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
