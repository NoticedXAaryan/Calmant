import * as React from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  tabs,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/40 pb-6 mb-8 mt-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {eyebrow && (
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-base text-muted-foreground max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {tabs && <div>{tabs}</div>}
    </div>
  );
}
