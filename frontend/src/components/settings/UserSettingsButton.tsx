import React, { useState, useRef, useEffect } from 'react';
import { Settings, Calendar, Globe, ChevronDown, Sun, Moon, Monitor, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { DateFormatSettings } from './DateFormatSettings';
import { cn } from '../../lib/cn';
import { useTheme, Theme, ColorVisionMode } from '../../hooks/useTheme';

interface UserSettingsButtonProps {
  className?: string;
}

export const UserSettingsButton: React.FC<UserSettingsButtonProps> = ({ className }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDateFormatModalOpen, setIsDateFormatModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, isDark, colorVision, setColorVision } = useTheme();

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

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'light', label: 'Clair', icon: <Sun className="h-4 w-4" />, description: 'Thème lumineux' },
    { value: 'dark', label: 'Sombre', icon: <Moon className="h-4 w-4" />, description: 'Thème foncé' },
    { value: 'system', label: 'Système', icon: <Monitor className="h-4 w-4" />, description: 'Selon votre appareil' },
  ];

  const colorVisionOptions: { value: ColorVisionMode; label: string; description: string }[] = [
    { value: 'normal', label: 'Standard', description: 'Couleurs par défaut' },
    { value: 'protanopia', label: 'Protanopie', description: 'Difficulté rouge' },
    { value: 'deuteranopia', label: 'Deutéranopie', description: 'Difficulté vert' },
    { value: 'tritanopia', label: 'Tritanopie', description: 'Difficulté bleu' },
  ];

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
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Format de date</div>
                  <div className="text-xs text-muted-foreground">JJ/MM/AAAA, MM/JJ/AAAA, etc.</div>
                </div>
              </button>

              <button
                onClick={handleDateFormatClick}
                className="w-full px-4 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-3 transition-colors"
              >
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Fuseau horaire</div>
                  <div className="text-xs text-muted-foreground">Ottawa, Local, UTC</div>
                </div>
              </button>

              {/* Séparateur */}
              <div className="border-t border-border my-1"></div>

              {/* Section Thème */}
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
                Apparence
              </div>

              <div className="px-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  {isDark ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm font-medium text-foreground">Mode d'affichage</span>
                </div>
                <div className="flex gap-1 bg-muted/20 p-1 rounded-lg">
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleThemeChange(option.value)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                        theme === option.value
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                      title={option.description}
                    >
                      {option.icon}
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {theme === 'system' ? 'S\'adapte à votre système' : theme === 'dark' ? 'Mode sombre activé' : 'Mode clair activé'}
                </p>
              </div>

              {/* Séparateur */}
              <div className="border-t border-border my-1"></div>

              {/* Section Accessibilité - Daltonisme */}
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
                Accessibilité
              </div>

              <div className="px-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Vision des couleurs</span>
                </div>
                <select
                  value={colorVision}
                  onChange={(e) => setColorVision(e.target.value as ColorVisionMode)}
                  className="w-full px-3 py-2 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  {colorVisionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} {option.value !== 'normal' ? `(${option.description})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {colorVision === 'normal' 
                    ? 'Palette de couleurs standard' 
                    : 'Palette optimisée pour votre vision'}
                </p>
                
                {/* Aperçu des couleurs */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Aperçu :</span>
                  <div className="flex gap-1">
                    <span 
                      className="w-5 h-5 rounded-full" 
                      style={{ backgroundColor: 'var(--etat-libre-bg)' }}
                      title="Disponible"
                    />
                    <span 
                      className="w-5 h-5 rounded-full" 
                      style={{ backgroundColor: 'var(--etat-presque-bg)' }}
                      title="Presque plein"
                    />
                    <span 
                      className="w-5 h-5 rounded-full" 
                      style={{ backgroundColor: 'var(--etat-plein-bg)' }}
                      title="Plein"
                    />
                  </div>
                </div>
              </div>

              {/* Séparateur */}
              <div className="border-t border-border my-1"></div>

              {/* Section Autres paramètres */}
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
                Autres paramètres
              </div>

              <button
                disabled
                className="w-full px-4 py-2 text-sm text-left flex items-center gap-3 opacity-50 cursor-not-allowed"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium text-muted-foreground">Préférences générales</div>
                  <div className="text-xs text-muted-foreground">Bientôt disponible</div>
                </div>
              </button>

              <button
                disabled
                className="w-full px-4 py-2 text-sm text-left flex items-center gap-3 opacity-50 cursor-not-allowed"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium text-muted-foreground">Notifications</div>
                  <div className="text-xs text-muted-foreground">Bientôt disponible</div>
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
