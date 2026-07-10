'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PendingApprovalProps {
  id: string;
  title: string;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeAgo: string;
  onReview: (id: string) => void;
}

export function PendingApprovalPanel({ approvals, onReviewAll }: { approvals: PendingApprovalProps[], onReviewAll?: () => void }) {
  if (!approvals || approvals.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="calmant-panel border-[var(--color-calmant-coral)]/30 bg-[var(--color-calmant-coral)]/5 overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-calmant-coral)]/20 bg-[var(--color-calmant-coral)]/10">
        <div className="flex items-center gap-2 text-[var(--color-calmant-coral)] font-semibold">
          <AlertTriangle className="h-4 w-4" />
          <span>Requires Approval ({approvals.length})</span>
        </div>
        {onReviewAll && approvals.length > 1 && (
          <Button variant="ghost" size="sm" onClick={onReviewAll} className="h-8 text-xs text-[var(--color-calmant-coral)] hover:bg-[var(--color-calmant-coral)]/10 hover:text-[var(--color-calmant-coral)]">
            Review All
          </Button>
        )}
      </div>
      <div className="divide-y divide-[var(--color-calmant-coral)]/10">
        {approvals.map((approval) => (
          <div key={approval.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-[var(--color-calmant-coral)]/5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-calmant-coral)]">
                  {approval.riskLevel} RISK
                </span>
                <span className="text-xs text-muted-foreground">{approval.timeAgo}</span>
              </div>
              <h4 className="text-sm font-semibold text-foreground">{approval.title}</h4>
              <p className="text-sm text-muted-foreground line-clamp-1">{approval.description}</p>
            </div>
            <Button 
              size="sm" 
              onClick={() => approval.onReview(approval.id)}
              className="shrink-0 bg-[var(--color-calmant-coral)] text-white hover:bg-[var(--color-calmant-coral)]/90"
            >
              Review Action
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
