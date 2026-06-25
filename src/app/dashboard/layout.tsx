// Dashboard layout — includes sidebar navigation and notification banner.
// Only applies to authenticated app pages (/, /schedule, /habits, /integrations).

import Navigation from "@/components/Navigation";
import NotificationBanner from "@/components/NotificationBanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex min-h-screen flex-col bg-background md:flex-row">
        <Navigation />
        <main className="flex-1 p-6 pt-20 md:ml-64 md:pt-6">
          {children}
        </main>
      </div>
      <NotificationBanner />
    </>
  );
}
