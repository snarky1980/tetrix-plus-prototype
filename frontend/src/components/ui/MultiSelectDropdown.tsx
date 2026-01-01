import React, { useState, useRef, useEffect } from 'react';

export interface MultiSelectDropdownProps {
  /** Libellé affiché au-dessus du dropdown (style simple) ou dans le bouton (style badge) */
  label?: string;
  /** Liste des options disponibles */
  options: string[];
  /** Options actuellement sélectionnées */
  selected: string[];
  /** Callback quand la sélection change */
  onChange: (selected: string[]) => void;
  /** Texte affiché quand aucune option n'est sélectionnée */
  placeholder?: string;
  /** Largeur minimale du dropdown */
  minWidth?: string;
  /** Classe CSS additionnelle pour le conteneur */
  className?: string;
  /** Désactiver le dropdown */
  disabled?: boolean;
  /** Afficher le compteur de sélection */
  showCount?: boolean;
  /** Taille du composant */
  size?: 'sm' | 'md';
  /** Style du dropdown: 'simple' (label au-dessus) ou 'badge' (label dans bouton avec compteur) */
  variant?: 'simple' | 'badge';
}

/**
 * Composant dropdown multi-sélection réutilisable
 * Utilisé dans: DemandesRessources, TraducteurManagement, PlanificationGlobale
 * 
 * Variantes:
 * - simple: label au-dessus, bouton blanc avec texte de sélection
 * - badge: label dans le bouton, compteur en badge, couleur quand actif
 */
export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ 
  label, 
  options, 
  selected, 
  onChange, 
  placeholder = "Tous", 
  minWidth = "120px",
  className = "",
  disabled = false,
  showCount = true,
  size = 'sm',
  variant = 'simple',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const selectAll = () => {
    onChange([...options]);
  };

  const clearAll = () => {
    onChange([]);
  };

  // Style Badge (TraducteurManagement)
  if (variant === 'badge') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors
            ${selected.length > 0 
              ? 'bg-primaire text-white border-primaire' 
              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <span>{label}</span>
          {selected.length > 0 && (
            <span className="bg-white/20 text-xs px-1.5 rounded">{selected.length}</span>
          )}
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isOpen && (
          <div className="absolute z-50 mt-1 w-48 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {options.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">Aucune option</div>
            ) : (
              <div className="p-2">
                {options.map(option => (
                  <label 
                    key={option} 
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(option)}
                      onChange={() => toggleOption(option)}
                      className="rounded border-gray-300 text-primaire focus:ring-primaire"
                    />
                    <span className="truncate">{option}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Style Simple (DemandesRessources, PlanificationGlobale)
  const displayText = selected.length === 0 
    ? placeholder 
    : selected.length === 1 
      ? selected[0] 
      : showCount 
        ? `${selected.length} sélectionnés`
        : selected.join(', ');

  const sizeClasses = size === 'sm' 
    ? 'text-xs py-1.5 px-2' 
    : 'text-sm py-2 px-3';

  return (
    <div className={`relative ${className}`} ref={dropdownRef} style={{ minWidth }}>
      {label && (
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full text-left ${sizeClasses} border border-gray-300 rounded bg-white hover:bg-gray-50 flex items-center justify-between gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`${selected.length === 0 ? 'text-gray-400' : 'text-gray-900'} truncate`}>
          {displayText}
        </span>
        <span className="text-gray-400 flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Actions rapides */}
          {options.length > 0 && (
            <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50 border-b text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="text-blue-600 hover:text-blue-800"
              >
                Tout sélectionner
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-gray-500 hover:text-gray-700"
              >
                Effacer
              </button>
            </div>
          )}
          
          {/* Liste des options */}
          <div className="max-h-48 overflow-y-auto">
            {options.length === 0 ? (
              <div className="px-2 py-2 text-xs text-gray-400 text-center">Aucune option</div>
            ) : (
              options.map(option => (
                <label
                  key={option}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggleOption(option)}
                    className="rounded text-primary border-gray-300 focus:ring-primary"
                  />
                  <span className="truncate">{option}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
