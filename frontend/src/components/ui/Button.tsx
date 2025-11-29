import React from 'react';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primaire' | 'secondaire' | 'outline' | 'ghost' | 'danger';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  full?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primaire: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondaire: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
  outline: 'border border-border hover:bg-muted',
  ghost: 'hover:bg-muted',
  danger: 'bg-red-600 text-white hover:bg-red-700'
};

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primaire',
  full = false,
  disabled,
  children,
  ...rest
}) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none',
        variantClasses[variant],
        full && 'w-full',
        className
      )}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};
