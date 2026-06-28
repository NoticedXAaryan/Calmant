import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  title: "Calmant | Your Personal AI Company",
  description: "An autonomous AI company that lives on your phone. It captures tasks, manages deadlines, sends reminders, browses the web, and learns your patterns — so you never miss anything again.",
  keywords: ["calmant", "AI company", "autonomous", "productivity", "deadlines", "assistant", "task management"],
  applicationName: "Calmant",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Calmant | Your Personal AI Company",
    description: "An autonomous AI company that lives on your phone. It captures tasks, manages deadlines, sends reminders, browses the web, and learns your patterns.",
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
