import React from 'react';
import { cn } from '../../lib/cn';

interface NotificationBadgeProps {
  count: number;
  variant?: 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showZero?: boolean;
  maxCount?: number;
  pulse?: boolean;
}

/**
 * Badge de notification avec compteur
 */
export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  variant = 'danger',
  size = 'sm',
  className,
  showZero = false,
  maxCount = 99,
  pulse = false,
}) => {
  if (count === 0 && !showZero) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count;

  const variantClasses = {
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-black',
    danger: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  const sizeClasses = {
    sm: 'min-w-[18px] h-[18px] text-[10px] px-1',
    md: 'min-w-[22px] h-[22px] text-xs px-1.5',
    lg: 'min-w-[26px] h-[26px] text-sm px-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-bold rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        pulse && 'animate-pulse',
        className
      )}
      aria-label={`${count} notifications`}
    >
      {displayCount}
    </span>
  );
};

interface NotificationDotProps {
  variant?: 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

/**
 * Simple point de notification (sans compteur)
 */
export const NotificationDot: React.FC<NotificationDotProps> = ({
  variant = 'danger',
  size = 'sm',
  pulse = true,
  className,
}) => {
  const variantClasses = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        pulse && 'animate-pulse',
        className
      )}
      aria-hidden="true"
    />
  );
};
