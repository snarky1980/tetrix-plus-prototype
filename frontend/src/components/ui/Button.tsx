import React from 'react';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primaire' | 'secondaire' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'default' | 'lg';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primaire: 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 border-2 border-primary shadow-sm hover:shadow-md',
  secondaire: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 active:scale-95 border-2 border-primary shadow-sm hover:shadow-md',
  outline: 'border-2 border-primary hover:bg-primary/5 text-primary active:scale-95 shadow-sm hover:shadow-md',
  ghost: 'hover:bg-muted/50 text-primary active:scale-95',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-95 border-2 border-red-600 shadow-sm hover:shadow-md'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs rounded-lg',
  default: 'px-4 py-2.5 text-sm rounded-[12px]',
  lg: 'px-6 py-3 text-base rounded-[14px]',
};

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primaire',
  size = 'default',
  full = false,
  disabled,
  loading = false,
  children,
  ...rest
}) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold',
        'transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary',
        'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
        'hover:translate-y-[-1px]',
        sizeClasses[size],
        variantClasses[variant],
        full && 'w-full',
        loading && 'opacity-75',
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};
