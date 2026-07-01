"use client";

import { useEffect, useState, useMemo } from "react";
import { Activity, Loader2, FileSpreadsheet, FileText, Download, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { ActivityEvent } from "@/app/api/activity/events/route";
import { ActivityEventRow } from "@/components/app/ActivityEventRow";
import { ActivityDetailSheet } from "@/components/app/ActivityDetailSheet";
import { DataToolbar } from "@/components/app/DataToolbar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Sheet state
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (typeFilter) params.set("type", typeFilter);
        if (statusFilter) params.set("status", statusFilter);
        
        const res = await fetch(`/api/activity/events?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setEvents(data.data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [typeFilter, statusFilter]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const lowerQ = searchQuery.toLowerCase();
    return events.filter(e => 
      e.title.toLowerCase().includes(lowerQ) || 
      e.summary.toLowerCase().includes(lowerQ) ||
      e.type.toLowerCase().includes(lowerQ)
    );
  }, [events, searchQuery]);

  const handleExportCSV = () => {
    if (!filteredEvents.length) return;
    const headers = ["ID", "Timestamp", "Type", "Status", "Actor", "Title", "Summary"];
    const rows = filteredEvents.map(evt => [
      evt.id,
      new Date(evt.occurredAt).toISOString(),
      evt.type,
      evt.status,
      evt.actor,
      `"${evt.title.replace(/"/g, '""')}"`,
      `"${evt.summary.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `calmant_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!filteredEvents.length) return;
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `calmant_audit_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEventClick = (event: ActivityEvent) => {
    setSelectedEvent(event);
    setSheetOpen(true);
  };

  const ExportActions = (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Filter className="h-4 w-4 mr-2" /> 
            {typeFilter ? `Type: ${typeFilter}` : "All Types"}
          </Button>
        } />
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Event Type</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setTypeFilter(null)}>All Types</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTypeFilter("ai")}>AI Runs</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTypeFilter("automation")}>Automations</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTypeFilter("notification")}>Notifications</DropdownMenuItem>
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setStatusFilter(null)}>Any Status</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setStatusFilter("completed")}>Completed</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setStatusFilter("failed")}>Failed</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        } />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-500" /> Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportJSON}>
            <FileText className="h-4 w-4 mr-2 text-amber-500" /> Export as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              Audit Center
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Activity Logs
            </h1>
          </div>
        </header>

        <DataToolbar
          searchPlaceholder="Search events..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          actions={ExportActions}
        />

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed rounded-lg bg-muted/20">
                <Activity className="h-8 w-8 text-muted-foreground mb-4 opacity-50" />
                <p className="font-medium text-foreground">No events found</p>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Adjust your search or filter criteria to see more activity.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredEvents.map((evt, idx) => (
                  <motion.div
                    key={evt.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <ActivityEventRow event={evt} onClick={handleEventClick} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        <ActivityDetailSheet
          event={selectedEvent}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      </div>
    </div>
  );
}
