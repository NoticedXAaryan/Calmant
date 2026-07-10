'use client';

import { motion } from 'framer-motion';
import { PlayCircle, Target, ArrowRight } from 'lucide-react';

export interface Mission {
  id: string;
  title: string;
  progress: number;
  statusText: string;
}

export function ActiveMissionRail({ missions }: { missions: Mission[] }) {
  if (!missions || missions.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto pb-4 hide-scrollbar">
      <div className="flex gap-4 min-w-max">
        {missions.map((mission) => (
          <motion.div
            key={mission.id}
            whileHover={{ scale: 1.02 }}
            className="calmant-panel flex-shrink-0 w-72 p-4 relative overflow-hidden"
          >
            {/* Progress background glow */}
            <div 
              className="absolute bottom-0 left-0 h-1 bg-[var(--color-calmant-electric-blue)] transition-all duration-500" 
              style={{ width: `${mission.progress}%` }} 
            />
            
            <div className="flex items-start gap-3 mb-3">
              <div className="rounded bg-[var(--color-calmant-electric-blue)]/10 p-2 text-[var(--color-calmant-electric-blue)]">
                <Target className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold truncate">{mission.title}</h4>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <PlayCircle className="h-3 w-3 text-[var(--color-calmant-electric-blue)] animate-pulse" />
                  <span className="truncate">{mission.statusText}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs font-medium text-muted-foreground">
                {mission.progress}% Complete
              </div>
              <button className="text-xs font-medium text-[var(--color-calmant-electric-blue)] flex items-center hover:underline">
                View Mission <ArrowRight className="h-3 w-3 ml-1" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
