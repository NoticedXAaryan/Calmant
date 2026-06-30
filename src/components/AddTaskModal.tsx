"use client";

import { useState, useEffect } from "react";
import { Plus, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: { title: string; description: string; deadline: string; estimatedMins: number }) => void;
}

export default function AddTaskModal({ isOpen, onClose, onAdd }: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [estimatedMins, setEstimatedMins] = useState(60);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
       
      setTitle("");
      setDescription("");
      setDeadline("");
      setEstimatedMins(60);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;
    onAdd({ title, description, deadline: new Date(deadline).toISOString(), estimatedMins });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Task Title <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                placeholder='e.g., "Prepare for Chemistry exam"'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="What does this task involve?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Calendar size={14} /> Deadline <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Clock size={14} /> Estimated Time
                </Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={estimatedMins}
                  onChange={(e) => setEstimatedMins(Number(e.target.value))}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                  <option value={480}>8 hours</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Plus size={16} /> Add Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
