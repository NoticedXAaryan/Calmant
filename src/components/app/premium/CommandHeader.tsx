'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export interface CommandHeaderProps {
  title: string;
  subtitle: string;
  commandInput: ReactNode;
  activeStatusBadge?: ReactNode;
}

export function CommandHeader({
  title,
  subtitle,
  commandInput,
  activeStatusBadge
}: CommandHeaderProps) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between pb-6 border-b border-border relative">
      <div className="flex flex-col gap-1.5 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {activeStatusBadge && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {activeStatusBadge}
            </motion.div>
          )}
        </div>
        <p className="text-muted-foreground text-sm max-w-lg">
          {subtitle}
        </p>
      </div>

      <div className="w-full md:w-96 shrink-0 z-10">
        {commandInput}
      </div>
      
      {/* Decorative background element for premium feel */}
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-[var(--color-calmant-electric-blue)]/5 blur-3xl rounded-full pointer-events-none -z-10" />
    </div>
  );
}
