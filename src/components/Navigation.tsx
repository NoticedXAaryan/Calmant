"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  Target,
  Menu,
  X,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/habits", label: "Habits", icon: Target },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <nav
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: "240px",
          background: "var(--color-surface-1)",
          borderRight: "1px solid var(--color-glass-border)",
          display: "flex",
          flexDirection: "column",
          padding: "24px 16px",
          zIndex: 40,
        }}
        className="nav-desktop"
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "40px",
            padding: "0 8px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--color-agent-primary), var(--color-accent-purple))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
            }}
          >
            <Zap size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1.2 }}>
              Life Saver
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--color-text-muted)",
                fontWeight: 500,
              }}
            >
              AI Companion
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  background: isActive ? "var(--color-agent-glow)" : "transparent",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: isActive ? 600 : 500,
                  transition: "all 0.15s ease",
                  position: "relative",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "3px",
                      height: "24px",
                      borderRadius: "0 4px 4px 0",
                      background: "var(--color-agent-primary)",
                    }}
                  />
                )}
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Agent Status */}
        <div
          className="glass-card-static"
          style={{
            padding: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--color-entropy-cool)",
              boxShadow: "0 0 8px rgba(16, 185, 129, 0.5)",
              animation: "pulse-critical 3s ease-in-out infinite",
            }}
          />
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600 }}>Agent Active</div>
            <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
              Watching your tasks
            </div>
          </div>
          <Sparkles size={14} color="var(--color-agent-secondary)" style={{ marginLeft: "auto" }} />
        </div>
      </nav>

      {/* Mobile Toggle */}
      <button
        className="mobile-nav-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          position: "fixed",
          top: "16px",
          left: "16px",
          zIndex: 60,
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-glass-border)",
          color: "var(--color-text-primary)",
          display: "none",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 45,
            }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop {
            transform: translateX(${mobileOpen ? "0" : "-100%"}) !important;
            transition: transform 0.3s ease !important;
            z-index: 50 !important;
          }
          .mobile-nav-toggle {
            display: flex !important;
          }
          main {
            margin-left: 0 !important;
            max-width: 100vw !important;
            padding-top: 72px !important;
          }
        }
      `}</style>
    </>
  );
}
