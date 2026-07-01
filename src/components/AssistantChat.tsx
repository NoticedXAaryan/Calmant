"use client";

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Sparkles, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import VoiceInput from "./VoiceInput";
import ReactMarkdown from "react-markdown";

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
  emoji: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "What's on my plate today?", message: "What does my day look like?", emoji: "📋" },
  { label: "Schedule a meeting", message: "I need to schedule a meeting", emoji: "📅" },
  { label: "Add a new task", message: "I need to add a new task", emoji: "➕" },
  { label: "Summarize a webpage", message: "Can you summarize a webpage for me?", emoji: "🔍" },
  { label: "Help me write something", message: "I need help writing a document", emoji: "✍️" },
  { label: "Check my calendar", message: "Check my calendar for the next few days", emoji: "🗓️" },
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

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ─── Component ──────────────────────────────────────────────────────── */

export default function AssistantChat({ userName }: { userName?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState("Working on it...");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
     
    setMounted(true);
    setMessages(loadHistory());
  }, []);

  // Auto-scroll
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
  }, [messages, mounted, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  // Dynamic loading phrases
  useEffect(() => {
    if (!loading) return;
    const phrases = [
      "Analyzing request...",
      "Routing to departments...",
      "Gathering context...",
      "Formulating plan...",
      "Generating response...",
      "Almost there..."
    ];
    let i = 0;
    setLoadingPhrase(phrases[0]);
    const interval = setInterval(() => {
      i = (i + 1) % phrases.length;
      setLoadingPhrase(phrases[i]);
    }, 4000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Maximum size is 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedFile({
        name: file.name,
        content: event.target?.result as string,
      });
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed && !attachedFile) return;

      let finalMessage = trimmed;
      if (attachedFile) {
        finalMessage = `[Attached File: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\`\n\n${trimmed}`;
      }

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: finalMessage,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setAttachedFile(null);
      setLoading(true);

      // Reset textarea height instantly
      if (inputRef.current) inputRef.current.style.height = "auto";

      try {
        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: finalMessage }),
        });

        if (!res.ok) {
          throw new Error("Failed to connect");
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        
        let receivedFinalMessage = false;

        if (reader) {
          let done = false;
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value) {
              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6).trim();
                  if (dataStr) {
                    try {
                      const data = JSON.parse(dataStr);
                      if (data.error || data.content) {
                        receivedFinalMessage = true;
                        setMessages((prev) => [...prev, {
                          id: generateId(),
                          role: "assistant",
                          content: data.content || data.error,
                          timestamp: Date.now(),
                        }]);
                      }
                    } catch (e) {}
                  }
                }
              }
            }
          }
        }

        if (!receivedFinalMessage) {
          throw new Error("No response received");
        }
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
      setTimeout(() => inputRef.current?.focus(), 10);
    },
    [attachedFile]
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

  const handleInterimTranscript = (text: string) => {
    setInput(text);
  };
  const handleVoiceTranscript = (text: string) => {
    setInput(text);
    if (text.trim()) {
      sendMessage(text);
    }
  };

  const greeting = getGreeting();

  return (
    <div className="flex h-full flex-col bg-background">
      {/* ── Messages area ────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center w-full max-w-2xl px-2"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-semibold mb-3 text-foreground tracking-tight">
                {greeting}, {userName || "there"}
              </h1>
              <p className="text-muted-foreground text-base mb-12">
                Your AI company is ready. What should we work on?
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl mx-auto">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.message)}
                    className="group rounded-xl border border-border/60 bg-card/50 p-4 text-left text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:shadow-sm hover:border-border"
                  >
                    <span className="mr-2">{action.emoji}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="mx-auto w-full max-w-3xl py-8">
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="mb-8"
              >
                {/* Role label + timestamp */}
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {msg.role === "user" ? (userName || "You") : "Calmant"}
                  </span>
                  <span className="text-xs text-muted-foreground/50">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                {/* Message text */}
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-3">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                    {msg.content}
                  </div>
                )}

                {/* Divider between messages (not after last unless loading) */}
                {(idx < messages.length - 1 || loading) && (
                  <div className="mt-8 border-b border-border/40" />
                )}
              </motion.div>
            ))}

            {/* Thinking indicator */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="mb-8 pt-4"
                >
                  <div className="mb-2 text-sm font-semibold text-foreground">
                    Calmant
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5 h-6">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="h-2 w-2 rounded-full bg-primary/60"
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                          transition={{
                            duration: 1.4,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground animate-pulse transition-all duration-300">
                      {loadingPhrase}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Input area ───────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-6 pt-2 bg-gradient-to-t from-background via-background to-transparent">
        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-3xl"
        >
          {/* File Attachment Preview */}
          <AnimatePresence>
            {attachedFile && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                className="mb-3 mx-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{attachedFile.name}</p>
                    <p className="text-xs text-muted-foreground">Text document attached</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex items-end gap-2 rounded-[24px] border border-border/80 bg-card/80 px-4 py-2.5 shadow-sm backdrop-blur-md focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-foreground/5 transition-all">
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".txt,.md,.json,.csv,.js,.ts,.tsx,.jsx,.html,.css"
            />
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="mb-1 h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <VoiceInput
              onInterimTranscript={handleInterimTranscript}
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
              className="flex-1 resize-none bg-transparent py-2.5 px-1 text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50"
              style={{ maxHeight: "200px" }}
            />

            <Button
              type="submit"
              size="icon"
              disabled={loading || (!input.trim() && !attachedFile)}
              className="mb-1 h-9 w-9 shrink-0 rounded-full transition-transform active:scale-95 disabled:opacity-30 disabled:hover:bg-primary"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground/70">
            Calmant can make mistakes. Consider verifying important information.
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
