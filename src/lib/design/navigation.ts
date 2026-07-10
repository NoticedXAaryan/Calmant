import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  Network,
  Activity,
  Brain,
  Target,
  Settings,
  LucideIcon
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const PRIMARY_NAVIGATION: NavItem[] = [
  {
    name: 'Command Center',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview and next actions'
  },
  {
    name: 'Assistant',
    href: '/dashboard/assistant',
    icon: MessageSquare,
    description: 'Collaborate and execute'
  },
  {
    name: 'Approvals',
    href: '/dashboard/approvals',
    icon: CheckSquare,
    description: 'Review pending actions'
  },
  {
    name: 'Connections',
    href: '/dashboard/integrations',
    icon: Network,
    description: 'Manage external integrations'
  },
  {
    name: 'Activity',
    href: '/dashboard/activity',
    icon: Activity,
    description: 'Event timeline and logs'
  },
  {
    name: 'Memory',
    href: '/dashboard/memory',
    icon: Brain,
    description: 'Learned preferences'
  },
  {
    name: 'Goals',
    href: '/dashboard/goals',
    icon: Target,
    description: 'Long-term objectives'
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'App preferences'
  }
];
