import React from 'react';
import { cn } from '../../lib/cn';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = ({ className, ...rest }) => {
  return (
    <input
      className={cn(
        'flex w-full rounded-md border border-primary bg-white px-3 py-2 text-sm text-primary placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:opacity-50',
        className
      )}
      {...rest}
    />
  );
};
