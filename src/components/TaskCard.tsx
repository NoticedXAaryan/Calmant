"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, Wand2, MoreHorizontal, AlarmClockOff, Trash2, Play } from "lucide-react";
import EntropyIndicator from "./EntropyIndicator";
import { getEntropyLevel } from "@/lib/entropy";
import type { Task } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
  onDecompose: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onSnooze: (taskId: string) => void;
}

export default function TaskCard({
  task,
  onStatusChange,
  onDecompose,
  onDelete,
  onSnooze,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const level = getEntropyLevel(task.entropyScore);

  const deadlineDate = new Date(task.deadline);
  const isPast = deadlineDate < new Date();
  const timeStr = isPast
    ? `${formatDistanceToNow(deadlineDate)} overdue`
    : `${formatDistanceToNow(deadlineDate)} left`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`glass-card entropy-glow-${level}`}
      style={{ padding: "20px", cursor: "pointer", position: "relative" }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Entropy */}
        <EntropyIndicator score={task.entropyScore} size="md" showLabel={false} />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 600,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {task.title}
            </h3>
            <span className={`badge badge-${task.status === "in_progress" ? "in-progress" : task.status}`}>
              {task.status.replace("_", " ")}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "12px", color: "var(--color-text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: isPast ? "var(--color-entropy-hot)" : undefined }}>
              <Clock size={12} /> {timeStr}
            </span>
            <span>{task.estimatedMins} min</span>
            {task.subtasks.length > 0 && (
              <span>
                {task.subtasks.filter((s) => s.status === "done").length}/{task.subtasks.length} subtasks
              </span>
            )}
            {task.snoozeCount > 0 && (
              <span style={{ color: "var(--color-entropy-warm)" }}>
                snoozed ×{task.snoozeCount}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
          {task.subtasks.length === 0 && task.status !== "done" && (
            <button
              className="btn-primary"
              style={{ padding: "8px 14px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
              onClick={() => onDecompose(task.id)}
            >
              <Wand2 size={14} /> Decompose
            </button>
          )}
          {task.status === "pending" && (
            <button
              className="btn-ghost"
              onClick={() => onStatusChange(task.id, "in_progress")}
              title="Start"
            >
              <Play size={16} />
            </button>
          )}
          {task.status === "in_progress" && (
            <button
              className="btn-ghost"
              onClick={() => onStatusChange(task.id, "done")}
              title="Complete"
            >
              <CheckCircle2 size={16} color="var(--color-entropy-cool)" />
            </button>
          )}
          <div style={{ position: "relative" }}>
            <button className="btn-ghost" onClick={() => setShowMenu(!showMenu)}>
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-glass-border)",
                  borderRadius: "12px",
                  padding: "6px",
                  zIndex: 20,
                  minWidth: "140px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                }}
              >
                <button
                  className="btn-ghost"
                  style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: "8px" }}
                  onClick={() => { onSnooze(task.id); setShowMenu(false); }}
                >
                  <AlarmClockOff size={14} /> Snooze
                </button>
                <button
                  className="btn-ghost"
                  style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: "8px", color: "var(--color-entropy-hot)" }}
                  onClick={() => { onDelete(task.id); setShowMenu(false); }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded: Subtasks */}
      {expanded && task.subtasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--color-glass-border)" }}
        >
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Subtasks
          </div>
          {task.subtasks.map((st) => (
            <div
              key={st.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 0",
                fontSize: "13px",
              }}
            >
              <CheckCircle2
                size={16}
                color={st.status === "done" ? "var(--color-entropy-cool)" : "var(--color-text-muted)"}
                style={{ cursor: "pointer", flexShrink: 0 }}
              />
              <span style={{ flex: 1, textDecoration: st.status === "done" ? "line-through" : "none", color: st.status === "done" ? "var(--color-text-muted)" : "var(--color-text-primary)" }}>
                {st.title}
              </span>
              <span style={{ fontSize: "11px", color: "var(--color-text-muted)", flexShrink: 0 }}>
                {st.estimatedMins}m
              </span>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
