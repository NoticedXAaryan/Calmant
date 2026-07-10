'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { getStatusConfig, StatusState } from '@/lib/design/status';

export interface ConnectionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  status: StatusState;
  lastVerified?: string;
  actionButton: ReactNode;
  setupSteps?: string[];
  blocker?: string;
}

export function ConnectionCard({
  title,
  description,
  icon: Icon,
  status,
  lastVerified,
  actionButton,
  setupSteps,
  blocker
}: ConnectionCardProps) {
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="calmant-panel relative flex flex-col overflow-hidden p-6 gap-4"
    >
      {/* Top accent line based on status */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${statusConfig.bgColorClass} opacity-50`} />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-secondary p-3">
            <Icon className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full ${statusConfig.bgColorClass} ${statusConfig.colorClass}`}>
          <StatusIcon className="h-4 w-4" />
          {statusConfig.label}
        </div>
      </div>

      {(blocker || (setupSteps && setupSteps.length > 0)) && (
        <div className="mt-2 space-y-3 border-t border-border pt-4">
          {blocker && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <strong>Blocker:</strong> {blocker}
            </div>
          )}
          
          {setupSteps && setupSteps.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setup Steps</h4>
              <ul className="space-y-1">
                {setupSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                      {idx + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-auto pt-4 flex items-center justify-between border-t border-border">
        <div className="text-xs text-muted-foreground">
          {lastVerified ? `Last verified: ${lastVerified}` : 'Never verified'}
        </div>
        <div>
          {actionButton}
        </div>
      </div>
    </motion.div>
  );
}
