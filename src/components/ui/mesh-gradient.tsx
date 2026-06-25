"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function MeshGradient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#050505] pointer-events-none">
      <div className="absolute inset-0 opacity-30">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-900/40 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-cyan-900/30 blur-[150px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 50, 0],
            y: [0, 150, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -bottom-[20%] left-[20%] w-[70%] h-[70%] rounded-full bg-indigo-900/20 blur-[150px]"
        />
      </div>
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
    </div>
  );
}
