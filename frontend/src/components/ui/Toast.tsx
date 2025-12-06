import React, { useEffect } from 'react';
import { useToast, ToastType } from '../contexts/ToastContext';
import { cn } from '../lib/cn';

const toastStyles: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-orange-50 border-orange-200 text-orange-800',
};

const toastIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const ToastItem: React.FC<{
  id: string;
  type: ToastType;
  message: string;
  onClose: (id: string) => void;
}> = ({ id, type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), 3000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border-2 shadow-lg',
        'animate-slide-in',
        toastStyles[type]
      )}
      role="alert"
    >
      <span className="text-lg font-bold">{toastIcons[type]}</span>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="text-lg leading-none hover:opacity-70 transition-opacity"
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            id={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={removeToast}
          />
        </div>
      ))}
    </div>
  );
};
