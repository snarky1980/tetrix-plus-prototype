import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

/**
 * Composant de dialogue de confirmation uniforme
 * Remplace window.confirm() pour une meilleure UX
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'warning',
  isLoading = false,
}) => {
  const iconMap = {
    danger: '🗑️',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const colorMap = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
  };

  const bgColorMap = {
    danger: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <Modal ouvert={isOpen} onFermer={onClose} titre="">
      <div className="text-center py-4">
        {/* Icône */}
        <div className={`mx-auto w-16 h-16 rounded-full ${bgColorMap[variant]} border-2 flex items-center justify-center mb-4`}>
          <span className="text-3xl">{iconMap[variant]}</span>
        </div>

        {/* Titre */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

        {/* Message */}
        <div className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
          {message}
        </div>

        {/* Boutons */}
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            className={colorMap[variant]}
            onClick={() => {
              onConfirm();
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                En cours...
              </span>
            ) : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
