import React, { useEffect, useRef } from 'react';
import { Button } from './Button';
import { cn } from '../../lib/cn';

interface ModalProps {
  titre: string;
  ouvert: boolean;
  onFermer: () => void;
  children: React.ReactNode;
  ariaDescription?: string;
  wide?: boolean;
  extraWide?: boolean;
  fullWidth?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ titre, ouvert, onFermer, children, ariaDescription, wide, extraWide, fullWidth }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (ouvert) {
      previouslyFocused.current = document.activeElement as HTMLElement;
      const focusable = containerRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.[0]?.focus();
    } else if (previouslyFocused.current) {
      previouslyFocused.current.focus();
    }
  }, [ouvert]);

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFermer();
      if (e.key === 'Tab' && containerRef.current) {
        const focusable = Array.from(containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    if (ouvert) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [ouvert, onFermer]);

  if (!ouvert) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titre}
      aria-describedby={ariaDescription ? titre + '-desc' : undefined}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onFermer} aria-hidden="true" />
      <div ref={containerRef} className={cn(
        'relative w-full max-h-[90vh] flex flex-col rounded-[14px] bg-card border border-border shadow-lg',
        fullWidth ? 'max-w-[95vw]' : extraWide ? 'max-w-6xl' : wide ? 'max-w-4xl' : 'max-w-lg'
      )}>
        <div className="flex items-start justify-between p-6 pb-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold">{titre}</h2>
          <Button variant="ghost" aria-label="Fermer le dialogue" onClick={onFermer}>✕</Button>
        </div>
        {ariaDescription && <p id={titre + '-desc'} className="text-sm text-muted px-6 pt-2">{ariaDescription}</p>}
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
};
