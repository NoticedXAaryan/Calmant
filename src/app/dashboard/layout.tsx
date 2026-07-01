// Dashboard layout — includes new AppShell with sidebar navigation and global command palette.
// Only applies to authenticated app pages (/, /schedule, /habits, /integrations).

import { AppShell } from "@/components/app/AppShell";
import NotificationBanner from "@/components/NotificationBanner";
import SystemBootstrap from "@/components/SystemBootstrap";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SystemBootstrap />
      <AppShell>
        {children}
      </AppShell>
      <NotificationBanner />
    </>
  );
}
