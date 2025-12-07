import React, { useState } from 'react';
import { cn } from '../../lib/cn';

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  label?: string;
}

/**
 * Simple multi-value input: type a valeur, valider avec Entrée / Tab / virgule.
 * Affiche des tags supprimables.
 */
export const TagInput: React.FC<TagInputProps> = ({ value, onChange, placeholder, label }) => {
  const [draft, setDraft] = useState('');

  const addValue = (val: string) => {
    const v = val.trim();
    if (!v) return;
    if (value.includes(v)) { setDraft(''); return; }
    onChange([...value, v]);
    setDraft('');
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (['Enter', 'Tab', ','].includes(e.key)) {
      e.preventDefault();
      addValue(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      // Supprime le dernier tag si input vide
      onChange(value.slice(0, -1));
    }
  };

  const handleBlur: React.FocusEventHandler<HTMLInputElement> = () => {
    addValue(draft);
  };

  const removeAt = (idx: number) => {
    const next = [...value];
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1 text-sm">
      {label && <label className="text-sm font-medium text-primary">{label}</label>}
      <div
        className={cn(
          'flex flex-wrap items-center gap-1 rounded-lg border-2 border-gray-300 bg-white px-2 py-2',
          'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1',
          'transition-colors duration-150'
        )}
      >
        {value.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary border border-primary/30"
          >
            {tag}
            <button
              type="button"
              className="text-primary hover:text-red-600 focus:outline-none"
              onClick={() => removeAt(idx)}
              aria-label={`Supprimer ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[120px] border-none outline-none text-sm text-primary placeholder:text-muted bg-transparent"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder || 'Entrer une valeur'}
        />
      </div>
      <span className="text-xs text-muted">Entrée/Tab/"," pour valider. Retour arrière supprime le dernier tag.</span>
    </div>
  );
};
