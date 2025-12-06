import React from 'react';
import { cn } from '../../lib/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className
      )}
    />
  );
};

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Chargement...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Spinner size="lg" />
      <p className="mt-4 text-sm text-muted">{message}</p>
    </div>
  );
};
