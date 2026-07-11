"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Lightbulb,
  Search,
  FileText,
  Hammer,
  CheckCircle,
  PackageOpen,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ExecutionStatusPanelProps {
  projectCellId: string;
  onResume?: (projectCellId: string) => void;
}

const PHASE_CONFIG: Record<string, { icon: any; label: string; color: string; step: number }> = {
  ideate:   { icon: Lightbulb,    label: "Ideate",     color: "text-amber-400",   step: 1 },
  research: { icon: Search,       label: "Research",   color: "text-blue-400",    step: 2 },
  plan:     { icon: FileText,     label: "Plan",       color: "text-indigo-400",  step: 3 },
  build:    { icon: Hammer,       label: "Build",      color: "text-orange-400",  step: 4 },
  validate: { icon: CheckCircle,  label: "Validate",   color: "text-emerald-400", step: 5 },
  deliver:  { icon: PackageOpen,  label: "Deliver",    color: "text-green-400",   step: 6 },
  blocked:  { icon: AlertTriangle,label: "Blocked",    color: "text-red-400",     step: 0 },
  completed:{ icon: CheckCircle,  label: "Completed",  color: "text-green-500",   step: 7 },
  failed:   { icon: AlertTriangle,label: "Failed",     color: "text-red-500",     step: 0 },
};

const ALL_PHASES = ["ideate", "research", "plan", "build", "validate", "deliver"];

export function ExecutionStatusPanel({ projectCellId, onResume }: ExecutionStatusPanelProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/execution/status?projectCellId=${projectCellId}`);
      if (res.ok) {
        const json = await res.json();
        setStatus(json);
      }
    } catch (err) {
      console.error("[ExecutionStatusPanel] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [projectCellId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading || !status) {
    return (
      <Card className="border-border/40 bg-card/60 backdrop-blur-xl">
        <CardContent className="p-6">
          <div className="h-16 animate-pulse bg-muted/30 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const { state, summary, cell } = status;
  const currentPhase = state.phase;
  const phaseConfig = PHASE_CONFIG[currentPhase] || PHASE_CONFIG.blocked;
  const PhaseIcon = phaseConfig.icon;

  const progressPercent = currentPhase === "completed"
    ? 100
    : currentPhase === "blocked" || currentPhase === "failed"
    ? 0
    : ((phaseConfig.step - 1) / ALL_PHASES.length) * 100;

  const isTerminal = ["completed", "failed", "blocked"].includes(currentPhase);

  return (
    <Card className="border-border/40 bg-card/60 backdrop-blur-xl overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={!isTerminal ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className={`p-2 rounded-lg bg-background/50 ${phaseConfig.color}`}
            >
              <PhaseIcon className="h-5 w-5" />
            </motion.div>
            <div>
              <h3 className="font-medium text-sm text-foreground">
                {state.objective.length > 60
                  ? state.objective.substring(0, 60) + "..."
                  : state.objective}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={`text-xs ${phaseConfig.color} border-current/20`}>
                  {phaseConfig.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Iteration {state.iterationCount}/{state.maxIterations}
                </span>
              </div>
            </div>
          </div>

          {currentPhase === "blocked" && onResume && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={() => onResume(projectCellId)}
            >
              <Play className="h-3 w-3" />
              Resume
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Phase Progress Bar */}
        <div className="space-y-2">
          <Progress value={progressPercent} className="h-1.5" />
          <div className="flex justify-between">
            {ALL_PHASES.map((phase) => {
              const config = PHASE_CONFIG[phase];
              const isActive = phase === currentPhase;
              const isPast = config.step < phaseConfig.step;
              const isFuture = config.step > phaseConfig.step;
              const Icon = config.icon;

              return (
                <div
                  key={phase}
                  className={`flex flex-col items-center gap-1 ${
                    isActive
                      ? config.color
                      : isPast
                      ? "text-muted-foreground/60"
                      : "text-muted-foreground/30"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[10px] hidden sm:inline">
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Loop-back history */}
        {state.loopBackReasons && state.loopBackReasons.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RotateCcw className="h-3 w-3" />
              <span>Loop-backs: {state.loopBackReasons.length}</span>
            </div>
            <div className="text-xs text-muted-foreground/70 pl-5">
              {state.loopBackReasons.slice(-2).map((reason: string, i: number) => (
                <p key={i} className="truncate">• {reason}</p>
              ))}
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="flex gap-4 text-xs text-muted-foreground border-t border-border/30 pt-3">
          <span>📚 {state.researchCount} research items</span>
          <span>📦 {state.artifactCount} artifacts</span>
          {cell?._count && (
            <span>🏃 {cell._count.agentRuns} runs</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
