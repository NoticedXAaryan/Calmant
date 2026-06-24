"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import type { ScheduleBlock } from "@/lib/types";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am to 9pm

export default function SchedulePage() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlocks = async () => {
      setLoading(true);
      try {
        const startDate = weekStart.toISOString();
        const endDate = addDays(weekStart, 7).toISOString();
        const res = await fetch(`/api/schedule?start=${startDate}&end=${endDate}`);
        const data = await res.json();
        if (data.success) setBlocks(data.data);
      } catch (error) {
        console.error("Failed to fetch schedule:", error);
      }
      setLoading(false);
    };
    fetchBlocks();
  }, [weekStart]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const getBlocksForDayHour = (day: Date, hour: number) => {
    return blocks.filter((b) => {
      const start = new Date(b.startTime);
      const startHour = start.getHours();
      return isSameDay(start, day) && startHour === hour;
    });
  };

  const getBlockHeight = (block: ScheduleBlock) => {
    const start = new Date(block.startTime);
    const end = new Date(block.endTime);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.max(durationHours * 60, 30); // min 30px
  };

  const blockColors = [
    "rgba(99, 102, 241, 0.3)",
    "rgba(6, 182, 212, 0.3)",
    "rgba(168, 85, 247, 0.3)",
    "rgba(236, 72, 153, 0.3)",
    "rgba(16, 185, 129, 0.3)",
  ];

  return (
    <div style={{ maxWidth: "1100px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>
            <span className="gradient-text">Schedule</span>
          </h1>
          <p style={{ margin: "6px 0 0", color: "var(--color-text-muted)", fontSize: "14px" }}>
            Your week at a glance — blocks booked by the agent
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button className="btn-ghost" onClick={() => setWeekStart((prev) => addDays(prev, -7))}>
            <ChevronLeft size={18} />
          </button>
          <button className="btn-secondary" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Today
          </button>
          <button className="btn-ghost" onClick={() => setWeekStart((prev) => addDays(prev, 7))}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="glass-card-static" style={{ overflow: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", minWidth: "800px" }}>
          {/* Header Row */}
          <div style={{ padding: "16px 8px", borderBottom: "1px solid var(--color-glass-border)" }} />
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={day.toISOString()}
                style={{
                  padding: "12px 8px",
                  textAlign: "center",
                  borderBottom: "1px solid var(--color-glass-border)",
                  borderLeft: "1px solid var(--color-glass-border)",
                  background: isToday ? "rgba(99, 102, 241, 0.05)" : "transparent",
                }}
              >
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                  {format(day, "EEE")}
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    marginTop: "2px",
                    color: isToday ? "var(--color-agent-primary)" : "var(--color-text-primary)",
                  }}
                >
                  {format(day, "d")}
                </div>
              </div>
            );
          })}

          {/* Time Grid */}
          {HOURS.map((hour) => (
            <>
              {/* Hour Label */}
              <div
                key={`label-${hour}`}
                style={{
                  padding: "0 8px",
                  height: "60px",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  fontSize: "11px",
                  color: "var(--color-text-muted)",
                  fontWeight: 500,
                  paddingTop: "2px",
                }}
              >
                {hour > 12 ? `${hour - 12}pm` : hour === 12 ? "12pm" : `${hour}am`}
              </div>

              {/* Day Cells */}
              {days.map((day, dayIdx) => {
                const cellBlocks = getBlocksForDayHour(day, hour);
                const isToday = isSameDay(day, today);
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    style={{
                      height: "60px",
                      borderLeft: "1px solid var(--color-glass-border)",
                      borderTop: "1px solid rgba(255,255,255,0.03)",
                      position: "relative",
                      background: isToday ? "rgba(99, 102, 241, 0.02)" : "transparent",
                    }}
                  >
                    {cellBlocks.map((block, blockIdx) => (
                      <motion.div
                        key={block.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                          position: "absolute",
                          top: 2,
                          left: 2,
                          right: 2,
                          height: `${getBlockHeight(block) - 4}px`,
                          background: blockColors[(dayIdx + blockIdx) % blockColors.length],
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          padding: "6px 8px",
                          fontSize: "11px",
                          fontWeight: 600,
                          overflow: "hidden",
                          cursor: "pointer",
                          zIndex: 5,
                        }}
                        title={`${block.title} (${format(new Date(block.startTime), "h:mm a")} - ${format(new Date(block.endTime), "h:mm a")})`}
                      >
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {block.title}
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                          {format(new Date(block.startTime), "h:mm")} - {format(new Date(block.endTime), "h:mm a")}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "16px", fontSize: "12px", color: "var(--color-text-muted)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Calendar size={14} /> {blocks.length} blocks scheduled
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Clock size={14} /> {Math.round(blocks.reduce((acc, b) => acc + (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000, 0))} min total
        </div>
      </div>
    </div>
  );
}
