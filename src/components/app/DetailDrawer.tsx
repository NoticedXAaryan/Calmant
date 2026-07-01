"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

type DetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "default" | "wide" | "full";
};

export function DetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = "default",
}: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={`flex flex-col gap-0 p-0 sm:max-w-md ${
          width === "wide" ? "md:max-w-2xl" : width === "full" ? "sm:max-w-full md:max-w-[90vw]" : ""
        }`}
      >
        <SheetHeader className="px-6 py-4 border-b border-border/40">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-6">
          {children}
        </ScrollArea>
        {footer && (
          <SheetFooter className="px-6 py-4 border-t border-border/40 bg-muted/30">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
