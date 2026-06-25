"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Zap, ListTodo, AlertTriangle, CheckCircle2, TrendingUp, Activity } from "lucide-react";
import TaskCard from "@/components/TaskCard";
import AddTaskModal from "@/components/AddTaskModal";
import AgentChat from "@/components/AgentChat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeshGradient } from "@/components/ui/mesh-gradient";
import type { Task, AgentAction } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [agentActions, setAgentActions] = useState<AgentAction[]>([]);
  const [decomposing, setDecomposing] = useState<string | null>(null);

  useEffect(() => {
    if (!document.cookie.includes("vibe2ship_onboarded=true")) {
      router.push("/onboarding");
    }
  }, [router]);

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

  useEffect(() => {
    fetchTasks();
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
        await fetchTasks();
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

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const urgentTasks = tasks.filter((t) => t.entropyScore > 0.7 && t.status !== "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;

  return (
    <>
      <MeshGradient />
      <div className="mx-auto max-w-5xl relative z-10 pt-6 pb-20">
        {/* Header / HUD */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="text-emerald-500 animate-pulse" size={20} />
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-emerald-500">System Online</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
              Command Center
            </h1>
            <p className="text-muted-foreground mt-2 font-medium tracking-wide">
              Your tasks, sorted by what matters most right now.
            </p>
          </div>
          <Button 
            onClick={() => setModalOpen(true)} 
            className="gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-6 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={18} strokeWidth={3} /> NEW DIRECTIVE
          </Button>
        </div>

        {/* NLP Command Bar */}
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("command") as HTMLInputElement;
            const command = input.value.trim();
            if (!command) return;
            
            input.value = "";
            input.placeholder = "Processing command...";
            input.disabled = true;

            try {
              const res = await fetch("/api/tasks/nlp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command }),
              });
              if (res.ok) {
                await fetchTasks();
              }
            } catch (err) {
              console.error(err);
            } finally {
              input.disabled = false;
              input.placeholder = "Type a command... (e.g., 'Remind me to call investor at 5 PM')";
              input.focus();
            }
          }}
          className="mb-10 relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-50" />
          <div className="relative flex items-center bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl focus-within:border-emerald-500/50 transition-colors">
            <div className="pl-4 pr-2 text-emerald-500">
              <Zap size={20} className="animate-pulse" />
            </div>
            <input
              name="command"
              type="text"
              placeholder="Type a command... (e.g., 'Remind me to call investor at 5 PM')"
              className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 placeholder:text-white/30 py-3 text-lg"
              autoComplete="off"
            />
            <Button type="submit" size="sm" className="rounded-xl bg-white/10 hover:bg-white/20 text-white px-6">
              EXECUTE
            </Button>
          </div>
        </form>

        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-10">
          {[
            { label: "Active Targets", value: totalTasks, icon: ListTodo, color: "text-white" },
            { label: "In Progress", value: inProgressTasks, icon: TrendingUp, color: "text-cyan-400" },
            { label: "Critical Priority", value: urgentTasks, icon: AlertTriangle, color: "text-red-500" },
            { label: "Neutralized", value: doneTasks, icon: CheckCircle2, color: "text-emerald-400" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden group hover:border-white/20 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-xs font-bold tracking-[0.1em] uppercase text-white/50 group-hover:text-white/80 transition-colors">
                    {stat.label}
                  </CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color} opacity-80`} />
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className={`text-4xl font-black tracking-tighter ${stat.color} drop-shadow-md`}>
                    {stat.value}
                  </div>
                </CardContent>
                {/* Subtle gradient flash on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tasks Section */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-white/5 border border-white/10" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-white/20 rounded-3xl bg-black/20 backdrop-blur-md"
            >
              <div className="rounded-full bg-white/5 p-6 mb-6">
                <ListTodo size={48} className="text-white/40" />
              </div>
              <h3 className="text-2xl font-bold mb-2 tracking-tight">All clear</h3>
              <p className="text-base text-muted-foreground mb-6 max-w-md">
                Your queue is empty. Await further directives or manually input a new target.
              </p>
              <Button 
                onClick={() => setModalOpen(true)} 
                variant="outline" 
                className="gap-2 border-white/20 hover:bg-white/10 rounded-full"
              >
                <Plus size={16} /> INITIALIZE TASK
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {tasks.map((task) => (
                  <div key={task.id} className="relative">
                    {decomposing === task.id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm border border-cyan-500/30"
                      >
                        <div className="flex items-center gap-3 font-bold text-sm text-cyan-400 tracking-widest uppercase bg-black/90 px-6 py-3 rounded-full shadow-[0_0_30px_rgba(6,182,212,0.3)] border border-cyan-500/20">
                          <Zap size={18} className="animate-pulse" /> NEURAL NETWORK DECOMPOSING...
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
        </div>

        <AddTaskModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAddTask} />
      </div>
    </>
  );
}
