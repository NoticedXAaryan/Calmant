// Dashboard layout — includes sidebar navigation and notification banner.
// Only applies to authenticated app pages (/, /schedule, /habits, /integrations).

import Navigation from "@/components/Navigation";
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
      <div className="flex min-h-screen min-h-[100dvh] flex-col bg-background md:flex-row">
        <Navigation />
        <main className="flex-1 flex flex-col pt-14 md:ml-[260px] md:pt-0" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {children}
        </main>
      </div>
      <NotificationBanner />
    </>
  );
}
