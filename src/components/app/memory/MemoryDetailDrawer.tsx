import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Memory } from "@/app/dashboard/memory/types";
import { useState, useEffect } from "react";

interface MemoryDetailDrawerProps {
  memory: Memory | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, newFact: string, newCategory: string) => Promise<void>;
}

export function MemoryDetailDrawer({
  memory,
  isOpen,
  onOpenChange,
  onSave,
}: MemoryDetailDrawerProps) {
  const [fact, setFact] = useState("");
  const [category, setCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (memory) {
      setFact(memory.fact);
      setCategory(memory.category);
    }
  }, [memory]);

  const handleSave = async () => {
    if (!memory) return;
    setIsSaving(true);
    try {
      await onSave(memory.id, fact, category);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Memory</SheetTitle>
          <SheetDescription>
            Update what the assistant remembers about you.
          </SheetDescription>
        </SheetHeader>

        {memory && (
          <div className="flex flex-1 flex-col gap-6 py-6 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium">Category</label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., preferences, personal, work"
              />
              <p className="text-xs text-muted-foreground">
                Categories help the AI filter memories contextually.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium">Fact</label>
              <Textarea
                value={fact}
                onChange={(e) => setFact(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>

            <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-4 mt-auto">
              <div className="text-sm font-medium">Metadata</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Confidence:</div>
                <div className="font-mono text-right">{Math.round((memory.confidence || 0) * 100)}%</div>
                <div>Extracted:</div>
                <div className="font-mono text-right">{new Date(memory.createdAt).toLocaleDateString()}</div>
                <div>ID:</div>
                <div className="font-mono text-right truncate">{memory.id}</div>
              </div>
            </div>
          </div>
        )}

        <SheetFooter className="mt-auto">
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={isSaving || !fact.trim() || !category.trim()}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
