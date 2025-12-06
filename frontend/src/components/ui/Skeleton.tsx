import React from 'react';
import { cn } from '../../lib/cn';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width = '100%',
  height = '1rem',
}) => {
  return (
    <div
      className={cn(
        'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg',
        'animate-pulse',
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      aria-busy="true"
      aria-label="Chargement..."
    />
  );
};

interface SkeletonCardProps {
  className?: string;
  count?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className, count = 1 }) => {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-2 border-gray-200 rounded-xl p-6 space-y-4 bg-white animate-pulse"
        >
          <Skeleton height={20} width="40%" />
          <Skeleton height={32} width="60%" />
          <div className="space-y-2">
            <Skeleton height={12} />
            <Skeleton height={12} width="80%" />
          </div>
        </div>
      ))}
    </div>
  );
};

interface SkeletonStatGridProps {
  count?: number;
}

export const SkeletonStatGrid: React.FC<SkeletonStatGridProps> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border-2 border-gray-200 p-6 space-y-4 bg-gradient-to-br from-gray-50 to-gray-100 animate-pulse"
        >
          <Skeleton height={16} width="60%" />
          <Skeleton height={32} width="40%" />
          <Skeleton height={12} width="50%" />
        </div>
      ))}
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="space-y-2 animate-pulse">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={16} width="80%" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} height={20} width={Math.random() > 0.5 ? '100%' : '80%'} />
          ))}
        </div>
      ))}
    </div>
  );
};
