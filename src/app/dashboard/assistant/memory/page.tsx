"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Memory {
  id: string;
  fact: string;
  category: string;
  confidence: number;
  createdAt: string;
}

export default function MemoryEditorPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchMemories() {
    try {
      const res = await fetch("/api/agent/memory");
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (error) {
      console.error("Failed to load memories", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMemories();
  }, []);

  async function deleteMemory(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/agent/memory?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete memory", error);
    } finally {
      setDeletingId(null);
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
            <Brain className="h-6 w-6 text-primary" />
            Agent Memory
          </h1>
          <p className="text-muted-foreground">
            View and manage what the assistant remembers about you.
          </p>
        </div>
      </div>

      {memories.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Brain className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p>Your assistant hasn't memorized any facts about you yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {memory.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(memory.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-card-foreground">
                  {memory.fact}
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => deleteMemory(memory.id)}
                  disabled={deletingId === memory.id}
                >
                  {deletingId === memory.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Forget
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
