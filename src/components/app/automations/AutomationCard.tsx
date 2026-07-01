"use client";

import { useState } from "react";
import { AlertPolicy } from "@prisma/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Zap, Clock, Send, MoreHorizontal, Settings, Play, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface AutomationCardProps {
  policy: AlertPolicy;
  onUpdate: (policy: AlertPolicy) => void;
  onDelete?: (id: string) => void;
}

export function AutomationCard({ policy, onUpdate, onDelete }: AutomationCardProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/automations/rules/${policy.id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdate(data.data);
        toast.success(enabled ? "Automation enabled" : "Automation disabled");
      } else {
        toast.error(data.error || "Failed to toggle automation");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getTriggerText = () => {
    if (policy.minEntropy !== null) return `Entropy drops below ${policy.minEntropy}`;
    return "Time-based or system event";
  };

  const getActionText = () => {
    return `Send alert via ${policy.channel}`;
  };

  const handleTest = () => {
    toast.info("Test triggered. Check your activity log.");
    // In a real app, hit a test endpoint here
  };

  return (
    <div className={`p-5 border rounded-lg transition-colors bg-card ${policy.enabled ? 'border-border' : 'border-dashed border-border/50 opacity-70'}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${policy.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">
              {policy.channel === "telegram" ? "Telegram Alert Rule" : "Email Alert Rule"}
            </h3>
            <p className="text-xs text-muted-foreground">ID: {policy.id}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2">
            <Switch 
              id={`switch-${policy.id}`} 
              checked={policy.enabled} 
              onCheckedChange={handleToggle}
              disabled={loading}
            />
            <Label htmlFor={`switch-${policy.id}`} className="sr-only">Toggle automation</Label>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" size="icon" className="-mr-2 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            } />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleTest}>
                <Play className="h-4 w-4 mr-2" /> Test run
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" /> Edit configuration
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete?.(policy.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete rule
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div className="bg-muted/30 rounded-md p-3 border border-border/50">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            <Clock className="h-3.5 w-3.5" /> When
          </div>
          <p className="text-sm font-medium text-foreground">{getTriggerText()}</p>
        </div>
        
        <div className="bg-muted/30 rounded-md p-3 border border-border/50">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            <Send className="h-3.5 w-3.5" /> Do This
          </div>
          <p className="text-sm font-medium text-foreground">{getActionText()}</p>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <div>
          Created {formatDistanceToNow(new Date(policy.createdAt), { addSuffix: true })}
        </div>
        <div>
          {policy.enabled ? "Active and waiting" : "Paused"}
        </div>
      </div>
    </div>
  );
}
