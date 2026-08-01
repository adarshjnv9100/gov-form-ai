import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hoverEffect = true,
  glow = false,
  onClick,
}) => {
  return (
    <motion.div
      whileHover={hoverEffect ? { y: -4, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={clsx(
        'rounded-2xl p-6 transition-all duration-300',
        'bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-sm',
        glow && 'shadow-glow border-blue-400/50',
        onClick && 'cursor-pointer hover:border-blue-500/50 hover:shadow-md',
        className
      )}
    >
      {children}
    </motion.div>
  );
};
