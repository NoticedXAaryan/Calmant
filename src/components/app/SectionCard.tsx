import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function SectionCard({
  title,
  description,
  children,
  footer,
  action,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <Card className={cn("overflow-hidden border-border/40 shadow-sm", className)}>
      {(title || description || action) && (
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div className="flex flex-col gap-1.5">
            {title && <CardTitle className="text-lg">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action && <div className="ml-auto shrink-0">{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn("pb-6", contentClassName)}>
        {children}
      </CardContent>
      {footer && (
        <CardFooter className="bg-muted/30 px-6 py-4 border-t border-border/40">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
