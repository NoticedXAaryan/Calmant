"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Flame, Target, X, Check } from "lucide-react";
import type { Habit } from "@/lib/types";
import { format, subDays, isSameDay } from "date-fns";

const HABIT_EMOJIS = ["📚", "🏃", "💧", "🧘", "✍️", "🎵", "💪", "🥗", "😴", "🧠"];

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("📚");

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchHabits = async () => {
    try {
      const res = await fetch("/api/habits");
      const data = await res.json();
      if (data.success) setHabits(data.data);
    } catch (error) {
      console.error("Failed to fetch habits:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHabits();
  }, []);

  const addHabit = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, emoji: newEmoji, frequency: "daily" }),
      });
      const data = await res.json();
      if (data.success) {
        setHabits((prev) => [...prev, data.data]);
        setNewName("");
        setNewEmoji("📚");
        setShowAdd(false);
      }
    } catch (error) {
      console.error("Failed to add habit:", error);
    }
  };

  const toggleHabit = async (habitId: string) => {
    try {
      const res = await fetch(`/api/habits/${habitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleDate: today }),
      });
      const data = await res.json();
      if (data.success) {
        setHabits((prev) => prev.map((h) => (h.id === habitId ? data.data : h)));
      }
    } catch (error) {
      console.error("Failed to toggle habit:", error);
    }
  };

  const deleteHabit = async (habitId: string) => {
    try {
      await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
    } catch (error) {
      console.error("Failed to delete habit:", error);
    }
  };

  // Build heatmap data (last 16 weeks = ~112 days)
  const heatmapDays = 112;
  const heatmapData = Array.from({ length: heatmapDays }, (_, i) => {
    const date = subDays(new Date(), heatmapDays - 1 - i);
    const dateKey = format(date, "yyyy-MM-dd");
    const completedCount = habits.filter((h) => h.completions[dateKey]).length;
    const totalHabits = habits.length || 1;
    return {
      date,
      dateKey,
      ratio: completedCount / totalHabits,
    };
  });

  const getHeatColor = (ratio: number) => {
    if (ratio === 0) return "var(--color-surface-3)";
    if (ratio < 0.25) return "rgba(16, 185, 129, 0.2)";
    if (ratio < 0.5) return "rgba(16, 185, 129, 0.4)";
    if (ratio < 0.75) return "rgba(16, 185, 129, 0.6)";
    return "rgba(16, 185, 129, 0.9)";
  };

  // Group heatmap by weeks
  const weeks: typeof heatmapData[] = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  return (
    <div style={{ maxWidth: "900px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>
            <span className="gradient-text">Habits</span>
          </h1>
          <p style={{ margin: "6px 0 0", color: "var(--color-text-muted)", fontSize: "14px" }}>
            Build consistency, track streaks, own your day
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowAdd(true)}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Plus size={16} /> Add Habit
        </button>
      </div>

      {/* Heatmap */}
      {habits.length > 0 && (
        <div className="glass-card-static" style={{ padding: "24px", marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "16px", color: "var(--color-text-secondary)" }}>
            Consistency Heatmap
          </div>
          <div style={{ display: "flex", gap: "3px", overflow: "auto", paddingBottom: "8px" }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {week.map((day) => (
                  <motion.div
                    key={day.dateKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: wi * 0.02 }}
                    title={`${day.dateKey}: ${Math.round(day.ratio * 100)}% complete`}
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "3px",
                      background: getHeatColor(day.ratio),
                      cursor: "pointer",
                      border: isSameDay(day.date, new Date()) ? "2px solid var(--color-agent-primary)" : "none",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "12px", fontSize: "11px", color: "var(--color-text-muted)" }}>
            <span>Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((r) => (
              <div
                key={r}
                style={{ width: "12px", height: "12px", borderRadius: "2px", background: getHeatColor(r) }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      )}

      {/* Today's Habits */}
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--color-text-secondary)" }}>
          Today — {format(new Date(), "EEEE, MMM d")}
        </h2>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: "72px" }} />)}
        </div>
      ) : habits.length === 0 ? (
        <div className="glass-card-static" style={{ padding: "60px 20px", textAlign: "center" }}>
          <Target size={48} color="var(--color-text-muted)" style={{ marginBottom: "16px", opacity: 0.3 }} />
          <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>No habits yet</h3>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: 0 }}>
            Start building consistency with your first daily habit
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <AnimatePresence>
            {habits.map((habit) => {
              const isDoneToday = habit.completions[today];
              return (
                <motion.div
                  key={habit.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`glass-card ${isDoneToday ? "entropy-glow-cool" : ""}`}
                  style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: "16px" }}
                >
                  {/* Toggle */}
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => toggleHabit(habit.id)}
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      border: isDoneToday ? "2px solid var(--color-entropy-cool)" : "2px solid var(--color-surface-4)",
                      background: isDoneToday ? "rgba(16, 185, 129, 0.1)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "20px",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {isDoneToday ? <Check size={20} color="var(--color-entropy-cool)" /> : habit.emoji}
                  </motion.button>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: 600, textDecoration: isDoneToday ? "none" : "none" }}>
                      {habit.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                      {habit.frequency} • Created {format(new Date(habit.createdAt), "MMM d")}
                    </div>
                  </div>

                  {/* Streak */}
                  {habit.streak > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 14px",
                        borderRadius: "999px",
                        background: "rgba(245, 158, 11, 0.1)",
                        border: "1px solid rgba(245, 158, 11, 0.2)",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--color-entropy-warm)",
                      }}
                    >
                      <Flame size={14} />
                      {habit.streak}
                    </div>
                  )}

                  {/* Delete */}
                  <button
                    className="btn-ghost"
                    onClick={() => deleteHabit(habit.id)}
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Habit Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>New Habit</h2>
                <button className="btn-ghost" onClick={() => setShowAdd(false)}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Habit Name
                </label>
                <input
                  className="input-field"
                  type="text"
                  placeholder='e.g., "Read 30 minutes"'
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addHabit()}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: "28px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Choose Emoji
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {HABIT_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setNewEmoji(emoji)}
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "10px",
                        border: newEmoji === emoji ? "2px solid var(--color-agent-primary)" : "2px solid transparent",
                        background: newEmoji === emoji ? "var(--color-agent-glow)" : "var(--color-surface-2)",
                        fontSize: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="btn-primary" onClick={addHabit} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Plus size={16} /> Add Habit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
