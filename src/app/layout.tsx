import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calmant | Last-Minute Life Saver",
  description: "An AI execution companion that turns messy commitments into confirmed tasks, next actions, and focus blocks. Built for action, not passive reminders.",
  keywords: ["calmant", "productivity", "AI", "deadlines", "assistant", "scheduling", "task management", "adhd planner"],
  applicationName: "Calmant",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Calmant | Last-Minute Life Saver",
    description: "An AI execution companion that turns messy commitments into confirmed tasks, next actions, and focus blocks.",
    url: "https://calmant.app",
    siteName: "Calmant",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

import { ThemeProvider } from "@/components/theme-provider";
import { CookieConsent } from "@/components/CookieConsent";

// Initialize BullMQ workers
if (typeof window === "undefined") {
  import("@/lib/workers").catch((e) => console.error("Failed to load workers", e));
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
