import React from 'react';
import { cn } from '../../lib/cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select: React.FC<SelectProps> = ({ className, error, disabled, children, ...rest }) => (
  <select
    className={cn(
      'flex w-full rounded-lg border-2 bg-white px-3 py-2.5 text-sm text-primary',
      'transition-colors duration-200 cursor-pointer',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
      error
        ? 'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-400'
        : 'border-gray-300 focus-visible:border-primary focus-visible:ring-primary hover:border-gray-400',
      disabled && 'opacity-60 cursor-not-allowed bg-gray-50',
      className
    )}
    disabled={disabled}
    {...rest}
  >
    {children}
  </select>
);
