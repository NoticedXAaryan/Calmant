"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Bot, User, Loader2 } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.data.content }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error || "Something went wrong"}` }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Failed to connect to the agent. Is the API key set?" }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, var(--color-agent-primary), var(--color-accent-purple))",
          border: "none",
          color: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 30px rgba(99, 102, 241, 0.4)",
          zIndex: 30,
        }}
      >
        <Sparkles size={24} />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: "fixed",
              bottom: "92px",
              right: "24px",
              width: "400px",
              maxWidth: "calc(100vw - 48px)",
              height: "500px",
              maxHeight: "70vh",
              background: "var(--color-surface-1)",
              border: "1px solid var(--color-glass-border)",
              borderRadius: "20px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5)",
              zIndex: 30,
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "18px 20px",
                borderBottom: "1px solid var(--color-glass-border)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05), transparent)",
              }}
            >
              <Bot size={20} color="var(--color-agent-primary)" />
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>Life Saver Agent</div>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                  Ask me anything about your tasks
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflow: "auto",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--color-text-muted)", fontSize: "13px" }}>
                  <Sparkles size={32} style={{ marginBottom: "12px", opacity: 0.3 }} />
                  <p style={{ margin: 0 }}>Hi! I&apos;m your Life Saver agent.</p>
                  <p style={{ margin: "4px 0 0" }}>Ask me to help with your tasks, deadlines, or schedule.</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                    flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: msg.role === "user" ? "var(--color-surface-3)" : "var(--color-agent-glow)",
                      flexShrink: 0,
                    }}
                  >
                    {msg.role === "user" ? <User size={14} /> : <Bot size={14} color="var(--color-agent-primary)" />}
                  </div>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "14px",
                      fontSize: "13px",
                      lineHeight: 1.5,
                      maxWidth: "80%",
                      background: msg.role === "user" ? "var(--color-agent-primary)" : "var(--color-surface-2)",
                      color: msg.role === "user" ? "white" : "var(--color-text-primary)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-text-muted)", fontSize: "13px" }}>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Agent is thinking...
                </div>
              )}
            </div>

            {/* Input */}
            <div
              style={{
                padding: "14px 16px",
                borderTop: "1px solid var(--color-glass-border)",
                display: "flex",
                gap: "10px",
              }}
            >
              <input
                className="input-field"
                type="text"
                placeholder="Ask the agent..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                style={{ flex: 1 }}
              />
              <button
                className="btn-primary"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                style={{ padding: "10px 14px", opacity: loading || !input.trim() ? 0.5 : 1 }}
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
