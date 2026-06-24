"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Zap, ListTodo, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import TaskCard from "@/components/TaskCard";
import AddTaskModal from "@/components/AddTaskModal";
import AgentChat from "@/components/AgentChat";
import type { Task, AgentAction } from "@/lib/types";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [agentActions, setAgentActions] = useState<AgentAction[]>([]);
  const [decomposing, setDecomposing] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success) setTasks(data.data);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
    setLoading(false);
  }, []);

  // Initial fetch + proactive scan
  useEffect(() => {
    fetchTasks();
    // Run proactive scan
    fetch("/api/agent/scan", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.actions.length > 0) {
          setAgentActions(data.data.actions);
        }
      })
      .catch(() => {});
  }, [fetchTasks]);

  const handleAddTask = async (taskData: { title: string; description: string; deadline: string; estimatedMins: number }) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      const data = await res.json();
      if (data.success) {
        setTasks((prev) => [...prev, data.data]);
      }
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  const handleStatusChange = async (taskId: string, status: Task["status"]) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "done" ? { completedAt: new Date().toISOString() } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.data : t)));
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleDecompose = async (taskId: string) => {
    setDecomposing(taskId);
    try {
      const res = await fetch("/api/agent/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchTasks(); // Refresh to get updated task with subtasks
      }
    } catch (error) {
      console.error("Failed to decompose:", error);
    }
    setDecomposing(null);
  };

  const handleDelete = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleSnooze = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    try {
      const newDeadline = new Date(task.deadline);
      newDeadline.setHours(newDeadline.getHours() + 24);
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deadline: newDeadline.toISOString(),
          snoozeCount: task.snoozeCount + 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.data : t)));
      }
    } catch (error) {
      console.error("Failed to snooze:", error);
    }
  };

  // Stats
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const urgentTasks = tasks.filter((t) => t.entropyScore > 0.7 && t.status !== "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;

  return (
    <div style={{ maxWidth: "900px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>
          <span className="gradient-text">Dashboard</span>
        </h1>
        <p style={{ margin: "6px 0 0", color: "var(--color-text-muted)", fontSize: "14px" }}>
          Your tasks, sorted by what matters most right now
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "28px" }}>
        {[
          { label: "Total Tasks", value: totalTasks, icon: ListTodo, color: "var(--color-agent-primary)" },
          { label: "In Progress", value: inProgressTasks, icon: TrendingUp, color: "var(--color-accent-cyan)" },
          { label: "Urgent", value: urgentTasks, icon: AlertTriangle, color: "var(--color-entropy-hot)" },
          { label: "Completed", value: doneTasks, icon: CheckCircle2, color: "var(--color-entropy-cool)" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card-static" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <stat.icon size={18} color={stat.color} />
              <span style={{ fontSize: "12px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                {stat.label}
              </span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "8px", color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Agent Actions Toast */}
      <AnimatePresence>
        {agentActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card agent-glow"
            style={{ padding: "16px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}
          >
            <Zap size={18} color="var(--color-agent-primary)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>
                Agent detected {agentActions.length} action{agentActions.length > 1 ? "s" : ""} needed
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                {agentActions.map((a) => a.description).join(" • ")}
              </div>
            </div>
            <button className="btn-ghost" onClick={() => setAgentActions([])}>
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Task Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--color-text-secondary)" }}>
          Tasks ({tasks.filter((t) => t.status !== "done").length} active)
        </h2>
        <button
          className="btn-primary"
          onClick={() => setModalOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: "80px" }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass-card-static" style={{ padding: "60px 20px", textAlign: "center" }}>
          <ListTodo size={48} color="var(--color-text-muted)" style={{ marginBottom: "16px", opacity: 0.3 }} />
          <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>No tasks yet</h3>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: 0 }}>
            Add your first task and let the AI agent help you plan it
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <AnimatePresence>
            {tasks.map((task) => (
              <div key={task.id} style={{ position: "relative" }}>
                {decomposing === task.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(99, 102, 241, 0.1)",
                      borderRadius: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 10,
                      backdropFilter: "blur(2px)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", fontWeight: 600 }}>
                      <Zap size={18} color="var(--color-agent-primary)" className="animate-pulse" />
                      Agent is decomposing...
                    </div>
                  </motion.div>
                )}
                <TaskCard
                  task={task}
                  onStatusChange={handleStatusChange}
                  onDecompose={handleDecompose}
                  onDelete={handleDelete}
                  onSnooze={handleSnooze}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AddTaskModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAddTask} />
      <AgentChat />
    </div>
  );
}
