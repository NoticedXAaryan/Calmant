import { Loader2, Trash2, Edit2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Memory } from "@/app/dashboard/memory/types";
import { cn } from "@/lib/utils";

interface MemoryCardProps {
  memory: Memory;
  onDelete: (id: string) => void;
  onEdit: (memory: Memory) => void;
  isDeleting?: boolean;
}

export function MemoryCard({ memory, onDelete, onEdit, isDeleting }: MemoryCardProps) {
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary capitalize">
            {memory.category}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {new Date(memory.createdAt).toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-card-foreground">
          {memory.fact}
        </p>
      </div>
      
      <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-3 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <div className="flex items-center gap-2">
          {memory.confidence && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Confidence Score">
              <Info className="h-3 w-3" />
              {Math.round(memory.confidence * 100)}%
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            onClick={() => onEdit(memory)}
            disabled={isDeleting}
            title="Edit memory"
          >
            <Edit2 className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(memory.id)}
            disabled={isDeleting}
            title="Forget memory"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="sr-only">Forget</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
