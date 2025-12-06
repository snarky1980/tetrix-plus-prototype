import React from 'react';
import { cn } from '../../lib/cn';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-primary border border-primary/20',
  success: 'bg-green-50 text-primary border border-green-200',
  warning: 'bg-orange-50 text-primary border border-orange-200',
  danger: 'bg-red-50 text-primary border border-red-200',
  info: 'bg-blue-50 text-primary border border-blue-200',
};

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default',
  className 
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold badge',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
