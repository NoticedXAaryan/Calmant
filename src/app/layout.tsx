import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calmant | The Masterpiece Executive AI",
  description: "An elite AI-powered productivity companion crafted by time. Commands your schedule and execution.",
  keywords: ["calmant", "productivity", "AI", "executive", "assistant", "scheduling"],
};

import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
      <body className={cn("min-h-screen bg-background font-sans antialiased", geist.variable)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
