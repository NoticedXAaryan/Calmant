import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calmant | Last-Minute Life Saver",
  description: "An AI execution companion that turns messy commitments into confirmed tasks, next actions, and focus blocks.",
  keywords: ["calmant", "productivity", "AI", "deadlines", "assistant", "scheduling"],
  applicationName: "Calmant",
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
