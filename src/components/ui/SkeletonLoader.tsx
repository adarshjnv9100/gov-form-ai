import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'card' | 'table-row' | 'text' | 'avatar';
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
}) => {
  if (variant === 'card') {
    return (
      <div className={clsx('rounded-2xl p-6 bg-white border border-slate-200 animate-pulse', className)}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-3 bg-slate-200 rounded w-1/3" />
          </div>
        </div>
        <div className="h-16 bg-slate-100 rounded-xl mb-4" />
        <div className="h-4 bg-slate-200 rounded w-2/3" />
      </div>
    );
  }

  if (variant === 'table-row') {
    return (
      <div className={clsx('flex items-center justify-between p-4 bg-white border-b border-slate-100 animate-pulse', className)}>
        <div className="w-1/4 h-4 bg-slate-200 rounded" />
        <div className="w-1/4 h-4 bg-slate-200 rounded" />
        <div className="w-1/6 h-4 bg-slate-200 rounded" />
        <div className="w-1/8 h-6 bg-slate-200 rounded-full" />
      </div>
    );
  }

  return (
    <div className={clsx('bg-slate-200 animate-pulse rounded-md', className || 'h-4 w-full')} />
  );
};
