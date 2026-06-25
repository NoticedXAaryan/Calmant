"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle2, Wand2, MoreHorizontal, AlarmClockOff, Trash2, Play, ChevronDown } from "lucide-react";
import EntropyIndicator from "./EntropyIndicator";
import { getEntropyLevel } from "@/lib/entropy";
import type { Task } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const level = getEntropyLevel(task.entropyScore);

  const deadlineDate = new Date(task.deadline);
  const isPast = deadlineDate < new Date();
  const timeStr = isPast
    ? `${formatDistanceToNow(deadlineDate)} overdue`
    : `${formatDistanceToNow(deadlineDate)} left`;

  // Dynamic glow borders based on urgency
  const glowStyles: Record<string, string> = {
    cool: "border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    warm: "border-amber-500/30 hover:border-amber-500/60 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]",
    hot: "border-red-500/50 hover:border-red-500/80 hover:shadow-[0_0_25px_rgba(239,68,68,0.25)]",
    critical: "border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)] animate-[pulse_2s_ease-in-out_infinite]",
  };

  const bgStyle = task.status === "done" 
    ? "bg-black/20 opacity-60 backdrop-blur-md" 
    : "bg-black/40 backdrop-blur-xl";

  return (
    <Card
      className={`relative cursor-pointer overflow-hidden transition-all duration-300 ${bgStyle} ${glowStyles[level] || "border-white/10 hover:border-white/30"} rounded-2xl`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start md:items-center gap-4 p-5 md:p-6">
        {/* Entropy Glow Ring */}
        <div className="mt-1 md:mt-0 shrink-0">
          <EntropyIndicator score={task.entropyScore} size="md" showLabel={false} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className={`text-lg font-bold tracking-tight ${task.status === "done" ? "line-through text-white/50" : "text-white"}`}>
              {task.title}
            </h3>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest border ${
              task.status === "in_progress" 
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]" 
                : task.status === "done"
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-white/5 text-white/60 border-white/10"
            }`}>
              {task.status.replace("_", " ")}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-white/50 tracking-wide">
            <span className={`flex items-center gap-1.5 ${isPast && task.status !== "done" ? "text-red-400 font-bold" : ""}`}>
              <Clock size={14} /> {timeStr}
            </span>
            <span className="flex items-center gap-1.5 border-l border-white/10 pl-4">
              {task.estimatedMins} min
            </span>
            {task.subtasks.length > 0 && (
              <span className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                {task.subtasks.filter((s) => s.status === "done").length}/{task.subtasks.length} subs
              </span>
            )}
            {task.snoozeCount > 0 && (
              <span className="text-amber-400/80 border-l border-white/10 pl-4">
                snoozed ×{task.snoozeCount}
              </span>
            )}
          </div>
        </div>

        {/* Actions Desktop & Mobile Menu */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {task.subtasks.length === 0 && task.status !== "done" && (
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex gap-2 rounded-full border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors"
              onClick={() => onDecompose(task.id)}
            >
              <Wand2 size={14} /> AI BREAKDOWN
            </Button>
          )}
          
          {task.status === "pending" && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-white/10 text-white/70 hover:text-white"
              onClick={() => onStatusChange(task.id, "in_progress")}
              title="Start Task"
            >
              <Play size={18} className="ml-1" />
            </Button>
          )}
          
          {task.status === "in_progress" && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 bg-emerald-500/10 transition-colors"
              onClick={() => onStatusChange(task.id, "done")}
              title="Mark Completed"
            >
              <CheckCircle2 size={18} />
            </Button>
          )}

          <DropdownMenu>
            {/* @ts-ignore */}
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-white/50 hover:text-white">
                <MoreHorizontal size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-black/90 backdrop-blur-xl border-white/10 rounded-xl">
              {task.subtasks.length === 0 && task.status !== "done" && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDecompose(task.id); }} className="md:hidden text-cyan-400 focus:text-cyan-300 focus:bg-cyan-500/10">
                  <Wand2 className="mr-2 h-4 w-4" />
                  <span>AI Breakdown</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSnooze(task.id); }} className="focus:bg-white/10">
                <AlarmClockOff className="mr-2 h-4 w-4" />
                <span>Snooze (+24h)</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-red-400 focus:text-red-300 focus:bg-red-500/10">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Abort Target</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {task.subtasks.length > 0 && (
            <div className="hidden md:block ml-2 text-white/30">
              <ChevronDown size={20} className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
            </div>
          )}
        </div>
      </div>

      {/* Expanded: Subtasks List */}
      <AnimatePresence>
        {expanded && task.subtasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/5 bg-white/[0.02] px-5 py-4 md:px-6"
          >
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              Sub-objectives
            </div>
            <div className="flex flex-col gap-2">
              {task.subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm bg-black/20 hover:bg-white/5 transition-colors border border-white/5"
                >
                  <CheckCircle2
                    size={18}
                    className={`shrink-0 cursor-pointer transition-colors ${
                      st.status === "done" ? "text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "text-white/20 hover:text-white/50"
                    }`}
                  />
                  <span className={`flex-1 font-medium tracking-wide ${st.status === "done" ? "line-through text-white/30" : "text-white/80"}`}>
                    {st.title}
                  </span>
                  <span className="shrink-0 text-xs font-bold text-white/30 bg-black/40 px-2 py-1 rounded-md border border-white/5">
                    {st.estimatedMins}m
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
