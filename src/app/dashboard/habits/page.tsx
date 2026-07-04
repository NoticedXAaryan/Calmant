"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Flame, Target, X, Check } from "lucide-react";
import type { Habit } from "@/lib/types";
import { format, subDays, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    if (ratio === 0) return "bg-muted"; 
    if (ratio < 0.25) return "bg-emerald-500/20";
    if (ratio < 0.5) return "bg-emerald-500/40";
    if (ratio < 0.75) return "bg-emerald-500/60";
    return "bg-emerald-500/90";
  };

  const weeks: typeof heatmapData[] = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-7">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Habits</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Build consistency, track streaks, own your day
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
          <Plus size={16} /> Add Habit
        </Button>
      </div>

      {/* Heatmap */}
      {habits.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm mb-6">
          <div className="text-sm font-semibold mb-4 text-muted-foreground">
            Consistency Heatmap
          </div>
          <div className="flex gap-[3px] overflow-x-auto pb-2">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <motion.div
                    key={day.dateKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: wi * 0.02 }}
                    title={`${day.dateKey}: ${Math.round(day.ratio * 100)}% complete`}
                    className={`w-[14px] h-[14px] rounded-[3px] cursor-pointer ${
                      isSameDay(day.date, new Date()) ? "border-2 border-primary" : ""
                    } ${getHeatColor(day.ratio)}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground">
            <span>Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((r) => (
              <div
                key={r}
                className={`w-3 h-3 rounded-[2px] ${getHeatColor(r)}`}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      )}

      {/* Today's Habits */}
      <div className="mb-4">
        <h2 className="text-base font-bold text-muted-foreground">
          Today — {format(new Date(), "EEEE, MMM d")}
        </h2>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
             <div key={i} className="animate-pulse bg-muted rounded-xl h-[72px]" />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <div className="rounded-xl border bg-card p-[60px_20px] text-center shadow-sm">
          <Target size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-lg font-bold mb-2">No habits yet</h3>
          <p className="text-sm text-muted-foreground">
            Start building consistency with your first daily habit
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
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
                  className={`rounded-xl border bg-card p-[18px_20px] flex items-center gap-4 shadow-sm ${
                    isDoneToday ? "border-emerald-500/20 bg-emerald-500/5" : ""
                  }`}
                >
                  {/* Toggle */}
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => toggleHabit(habit.id)}
                    className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center text-xl transition-all ${
                      isDoneToday
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                        : "border-border bg-transparent"
                    }`}
                  >
                    {isDoneToday ? <Check size={20} /> : habit.emoji}
                  </motion.button>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="text-[15px] font-semibold">{habit.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {habit.frequency} • Created {format(new Date(habit.createdAt), "MMM d")}
                    </div>
                  </div>

                  {/* Streak */}
                  {habit.streak > 0 && (
                    <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[13px] font-bold text-amber-500">
                      <Flame size={14} />
                      {habit.streak}
                    </div>
                  )}

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteHabit(habit.id)}
                    className="text-muted-foreground"
                  >
                    <X size={16} />
                  </Button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Habit Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Habit</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
                Habit Name
              </label>
              <Input
                placeholder='e.g., "Read 30 minutes"'
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addHabit()}
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
                Choose Emoji
              </label>
              <div className="flex gap-2 flex-wrap">
                {HABIT_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setNewEmoji(emoji)}
                    className={`w-11 h-11 rounded-lg border-2 text-xl flex items-center justify-center transition-all ${
                      newEmoji === emoji
                        ? "border-primary bg-primary/10"
                        : "border-transparent bg-muted"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button onClick={addHabit} className="flex items-center gap-2">
                <Plus size={16} /> Add Habit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
