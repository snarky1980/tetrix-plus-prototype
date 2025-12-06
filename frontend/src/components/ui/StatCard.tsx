import React from 'react';
import { cn } from '../../lib/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  className?: string;
}

const variantClasses: Record<string, string> = {
  default: 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200',
  success: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200',
  warning: 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200',
  danger: 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200',
  info: 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200',
};

const iconBgVariants: Record<string, string> = {
  default: 'bg-slate-200 text-slate-700',
  success: 'bg-green-200 text-green-700',
  warning: 'bg-orange-200 text-orange-700',
  danger: 'bg-red-200 text-red-700',
  info: 'bg-blue-200 text-blue-700',
};

const trendColorClasses = {
  positive: 'text-green-600',
  negative: 'text-red-600',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  variant = 'default',
  trend,
  subtitle,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border-2 p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105',
        variantClasses[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span
                className={cn(
                  'text-sm font-semibold',
                  trend.isPositive ? trendColorClasses.positive : trendColorClasses.negative
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div
            className={cn(
              'rounded-lg p-3 text-xl',
              iconBgVariants[variant]
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
