"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Settings,
  LayoutDashboard,
  MessageSquare,
  Activity,
  LogOut,
  Target,
  Zap,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Suggestions">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Go to Today</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/assistant"))}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Ask Assistant</span>
            <CommandShortcut>⌘A</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/schedule"))}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Schedule</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/habits"))}>
            <Target className="mr-2 h-4 w-4" />
            <span>Habits & Focus</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/activity"))}>
            <Activity className="mr-2 h-4 w-4" />
            <span>Activity Log</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/automations"))}>
            <Zap className="mr-2 h-4 w-4" />
            <span>Automations</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Account">
          <CommandItem onSelect={() => runCommand(() => console.log("Logging out..."))}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
