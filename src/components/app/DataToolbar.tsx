"use client";

import * as React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type DataToolbarProps = {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (val: string) => void;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
};

export function DataToolbar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters,
  actions,
}: DataToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
      <div className="flex flex-1 items-center gap-2 max-w-sm w-full">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 bg-background"
          />
        </div>
        {filters && (
          <Button variant="outline" size="icon" className="shrink-0 h-9 w-9">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
      </div>
    </div>
  );
}
