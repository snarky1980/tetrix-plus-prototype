import React from 'react';
import { cn } from '../../lib/cn';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  children,
  className
}) => {
  return (
    <div className={cn('mb-4', className)}>
      <label className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({ 
  className, 
  error,
  ...props 
}) => {
  return (
    <textarea
      className={cn(
        'w-full px-3 py-2 border rounded-md text-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary',
        error ? 'border-red-600' : 'border-border',
        className
      )}
      {...props}
    />
  );
};
