"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, Brain } from "lucide-react";
import { toast } from "sonner";
import { Memory } from "@/app/dashboard/memory/types";
import { MemoryCard } from "./MemoryCard";
import { MemoryFilters } from "./MemoryFilters";
import { MemoryDetailDrawer } from "./MemoryDetailDrawer";

export function MemoryOverview() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Drawer state
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  async function fetchMemories() {
    try {
      const res = await fetch("/api/agent/memory");
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (error) {
      console.error("Failed to load memories", error);
      toast.error("Failed to load memories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMemories();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(memories.map((m) => m.category));
    return Array.from(cats).sort();
  }, [memories]);

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchesSearch = m.fact.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            m.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || m.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [memories, searchQuery, selectedCategory]);

  async function deleteMemory(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/agent/memory?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        toast.success("Memory forgotten");
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      console.error("Failed to delete memory", error);
      toast.error("Failed to forget memory");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function updateMemory(id: string, newFact: string, newCategory: string) {
    try {
      const res = await fetch(`/api/agent/memory?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fact: newFact, category: newCategory }),
      });
      
      if (res.ok) {
        setMemories((prev) => 
          prev.map((m) => m.id === id ? { ...m, fact: newFact, category: newCategory } : m)
        );
        toast.success("Memory updated");
      } else {
        // If PATCH isn't supported, we fallback to creating a new one and deleting the old.
        // For this demo, let's assume the API supports PATCH, but we'll show an error if it doesn't.
        throw new Error("Failed to update");
      }
    } catch (error) {
      console.error("Failed to update memory", error);
      toast.error("Failed to update memory. The API might not support updates yet.");
    }
  }

  const handleEditClick = (memory: Memory) => {
    setSelectedMemory(memory);
    setIsDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {memories.length > 0 && (
        <MemoryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={categories}
        />
      )}

      {memories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center text-muted-foreground bg-card/50">
          <Brain className="mb-4 h-12 w-12 opacity-20" />
          <h3 className="font-medium text-foreground mb-1">No memories yet</h3>
          <p className="text-sm">Your assistant hasn't memorized any facts about you yet.</p>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center text-muted-foreground bg-card/50">
          <p className="text-sm">No memories match your search.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMemories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onDelete={deleteMemory}
              onEdit={handleEditClick}
              isDeleting={deletingIds.has(memory.id)}
            />
          ))}
        </div>
      )}

      <MemoryDetailDrawer
        memory={selectedMemory}
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onSave={updateMemory}
      />
    </div>
  );
}
