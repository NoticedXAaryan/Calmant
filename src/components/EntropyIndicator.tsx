"use client";

import { motion } from "framer-motion";
import { getEntropyLevel, getEntropyColor } from "@/lib/entropy";

interface EntropyIndicatorProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function EntropyIndicator({
  score,
  size = "md",
  showLabel = true,
}: EntropyIndicatorProps) {
  const level = getEntropyLevel(score);
  const color = getEntropyColor(score);
  const percentage = Math.round(score * 100);

  const sizes = {
    sm: { ring: 32, stroke: 3, fontSize: 9 },
    md: { ring: 48, stroke: 4, fontSize: 12 },
    lg: { ring: 64, stroke: 5, fontSize: 16 },
  };

  const { ring, stroke, fontSize } = sizes[size];
  const radius = (ring - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - score * circumference;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: size === "sm" ? 6 : 10 }}>
      <div style={{ position: "relative", width: ring, height: ring }}>
        <svg width={ring} height={ring} style={{ transform: "rotate(-90deg)" }}>
          {/* Background ring */}
          <circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            fill="none"
            stroke="var(--color-surface-3)"
            strokeWidth={stroke}
          />
          {/* Score ring */}
          <motion.circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              filter: `drop-shadow(0 0 ${score > 0.7 ? '6px' : '3px'} ${color})`,
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize,
            fontWeight: 700,
            color,
          }}
        >
          {percentage}
        </div>
      </div>
      {showLabel && (
        <div>
          <div
            style={{
              fontSize: size === "sm" ? 10 : 11,
              fontWeight: 600,
              color,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {level}
          </div>
          {size !== "sm" && (
            <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
              entropy
            </div>
          )}
        </div>
      )}
    </div>
  );
}
