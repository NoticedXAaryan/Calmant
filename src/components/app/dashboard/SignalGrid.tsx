interface SignalGridProps {
  stats: {
    label: string;
    value: number;
    className: string;
  }[];
}

export function SignalGrid({ stats }: SignalGridProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 text-sm font-medium">Signal</div>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((item) => (
          <div key={item.label} className="rounded-md border border-border bg-background p-3">
            <div className={`text-2xl font-semibold ${item.className}`}>{item.value}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
