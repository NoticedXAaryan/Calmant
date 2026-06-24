import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Last-Minute Life Saver | AI Productivity Companion",
  description: "An AI-powered productivity companion that proactively assists you in planning, prioritizing, and completing tasks before deadlines are missed.",
  keywords: ["productivity", "AI", "task management", "Gemini", "scheduling"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} gradient-bg`}>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Navigation />
          <main style={{ flex: 1, padding: '24px', marginLeft: '240px', maxWidth: 'calc(100vw - 240px)' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
