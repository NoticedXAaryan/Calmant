import { CheckCircle2, AlertCircle, Clock, XCircle, ArrowRightCircle, LucideIcon } from 'lucide-react';

export type StatusState = 'active' | 'success' | 'warning' | 'error' | 'pending';

export interface StatusConfig {
  colorClass: string;
  bgColorClass: string;
  icon: LucideIcon;
  label: string;
}

export const STATUS_CONFIG: Record<StatusState, StatusConfig> = {
  active: {
    colorClass: 'text-[var(--color-calmant-electric-blue)]',
    bgColorClass: 'bg-[var(--color-calmant-electric-blue)]/10',
    icon: ArrowRightCircle,
    label: 'Active',
  },
  success: {
    colorClass: 'text-[var(--color-calmant-citrus-green)]',
    bgColorClass: 'bg-[var(--color-calmant-citrus-green)]/10',
    icon: CheckCircle2,
    label: 'Connected',
  },
  warning: {
    colorClass: 'text-[var(--color-calmant-amber)]',
    bgColorClass: 'bg-[var(--color-calmant-amber)]/10',
    icon: AlertCircle,
    label: 'Needs Attention',
  },
  error: {
    colorClass: 'text-[var(--color-calmant-coral)]',
    bgColorClass: 'bg-[var(--color-calmant-coral)]/10',
    icon: XCircle,
    label: 'Error',
  },
  pending: {
    colorClass: 'text-[var(--color-calmant-violet)]',
    bgColorClass: 'bg-[var(--color-calmant-violet)]/10',
    icon: Clock,
    label: 'Pending',
  },
};

export function getStatusConfig(state: StatusState): StatusConfig {
  return STATUS_CONFIG[state];
}
