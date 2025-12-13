import React, { useState, useRef, useEffect } from 'react';
import { Settings, Calendar, Globe, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { DateFormatSettings } from './DateFormatSettings';
import { cn } from '../../lib/cn';

interface UserSettingsButtonProps {
  className?: string;
}

export const UserSettingsButton: React.FC<UserSettingsButtonProps> = ({ className }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDateFormatModalOpen, setIsDateFormatModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  const handleDateFormatClick = () => {
    setIsMenuOpen(false);
    setIsDateFormatModalOpen(true);
  };

  const handleFormatChange = () => {
    // Rafraîchir la page pour appliquer les changements de format
    window.location.reload();
  };

  return (
    <>
      <div className={cn('relative', className)} ref={menuRef}>
        <Button
          variant="outline"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Paramètres utilisateur"
          className="flex items-center gap-2 text-xs px-2 py-1"
          title="Paramètres"
        >
          <Settings className="h-4 w-4" />
          <ChevronDown className={cn('h-3 w-3 transition-transform', isMenuOpen && 'rotate-180')} />
        </Button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-background border border-border rounded-md shadow-lg z-50">
            <div className="py-1">
              {/* Section Format de date */}
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
                Affichage
              </div>
              
              <button
                onClick={handleDateFormatClick}
                className="w-full px-4 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-3 transition-colors"
              >
                <Calendar className="h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium">Format de date</div>
                  <div className="text-xs text-muted-foreground">JJ/MM/AAAA, MM/JJ/AAAA, etc.</div>
                </div>
              </button>

              <button
                onClick={handleDateFormatClick}
                className="w-full px-4 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-3 transition-colors"
              >
                <Globe className="h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium">Fuseau horaire</div>
                  <div className="text-xs text-muted-foreground">Ottawa, Local, UTC</div>
                </div>
              </button>

              {/* Séparateur */}
              <div className="border-t border-border my-1"></div>

              {/* Section Autres paramètres */}
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
                Autres paramètres
              </div>

              <button
                disabled
                className="w-full px-4 py-2 text-sm text-left text-muted-foreground flex items-center gap-3 opacity-50 cursor-not-allowed"
              >
                <Settings className="h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium">Préférences générales</div>
                  <div className="text-xs">Bientôt disponible</div>
                </div>
              </button>

              <button
                disabled
                className="w-full px-4 py-2 text-sm text-left text-muted-foreground flex items-center gap-3 opacity-50 cursor-not-allowed"
              >
                <Settings className="h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium">Notifications</div>
                  <div className="text-xs">Bientôt disponible</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de paramètres de format de date */}
      <DateFormatSettings
        isOpen={isDateFormatModalOpen}
        onClose={() => setIsDateFormatModalOpen(false)}
        onFormatChange={handleFormatChange}
      />
    </>
  );
};
