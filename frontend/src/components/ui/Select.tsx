import React from 'react';
import { cn } from '../../lib/cn';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select: React.FC<SelectProps> = ({ className, children, ...rest }) => (
  <select
    className={cn('flex w-full rounded-md border border-border bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', className)}
    {...rest}
  >
    {children}
  </select>
);
