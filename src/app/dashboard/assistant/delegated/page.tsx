"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, FolderGit2, CheckCircle2, PlayCircle, PauseCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DelegatedTask {
  id: string;
  title: string;
  status: string;
  context: {
    url?: string;
    deadline?: string;
    requirements?: string[];
    subtasks?: string[];
  } | null;
  createdAt: string;
}

export default function DelegatedTasksPage() {
  const [tasks, setTasks] = useState<DelegatedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchTasks() {
    try {
      const res = await fetch("/api/tasks/delegated");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Failed to load tasks", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  async function deleteTask(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tasks/delegated?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete task", error);
    } finally {
      setDeletingId(null);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "active":
        return <PlayCircle className="mr-1 h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />;
      case "paused":
        return <PauseCircle className="mr-1 h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="mr-1 h-4 w-4 text-muted-foreground" />;
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FolderGit2 className="h-6 w-6 text-primary" />
            Delegated Workflows
          </h1>
          <p className="text-muted-foreground">
            View complex opportunities the assistant is actively managing for you.
          </p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <FolderGit2 className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p>You haven't delegated any complex workflows to the assistant yet.</p>
          <p className="mt-2 text-sm opacity-70">
            Try pasting a hackathon or event link in the chat and asking the assistant to manage it.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md">
              <div className="border-b bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center text-sm font-medium">
                      {getStatusIcon(task.status)}
                      <span className="capitalize">{task.status}</span>
                    </div>
                    <h3 className="font-semibold">{task.title}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => deleteTask(task.id)}
                    disabled={deletingId === task.id}
                  >
                    {deletingId === task.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="p-4">
                {task.context?.url && (
                  <div className="mb-4 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Source: </span>
                    <a href={task.context.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {task.context.url}
                    </a>
                  </div>
                )}
                {task.context?.deadline && (
                  <div className="mb-4 text-sm">
                    <span className="font-medium">Deadline: </span>
                    {task.context.deadline}
                  </div>
                )}
                
                <div className="grid gap-6 md:grid-cols-2">
                  {task.context?.requirements && task.context.requirements.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Extracted Requirements</h4>
                      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                        {task.context.requirements.map((req, i) => (
                          <li key={i}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {task.context?.subtasks && task.context.subtasks.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Suggested Milestones</h4>
                      <div className="flex flex-col gap-2">
                        {task.context.subtasks.map((sub, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <Badge variant="outline" className="mt-0.5 shrink-0 bg-background/50">
                              Step {i + 1}
                            </Badge>
                            <span className="text-muted-foreground">{sub}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
