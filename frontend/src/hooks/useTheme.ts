import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ColorVisionMode = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia';

const THEME_KEY = 'tetrix-theme';
const COLOR_VISION_KEY = 'tetrix-color-vision';

/**
 * Récupère le thème préféré du système
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Récupère le thème sauvegardé ou retourne 'light' par défaut
 */
function getSavedTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'light';
}

/**
 * Récupère le mode de vision des couleurs sauvegardé
 */
function getSavedColorVision(): ColorVisionMode {
  if (typeof window === 'undefined') return 'normal';
  const saved = localStorage.getItem(COLOR_VISION_KEY);
  if (saved === 'normal' || saved === 'protanopia' || saved === 'deuteranopia' || saved === 'tritanopia') {
    return saved;
  }
  return 'normal';
}

/**
 * Applique le thème au document
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
  
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

/**
 * Applique le mode de vision des couleurs au document
 */
function applyColorVision(mode: ColorVisionMode): void {
  const root = document.documentElement;
  // Retirer tous les modes existants
  root.classList.remove('cv-protanopia', 'cv-deuteranopia', 'cv-tritanopia');
  
  // Appliquer le nouveau mode si ce n'est pas normal
  if (mode !== 'normal') {
    root.classList.add(`cv-${mode}`);
  }
}

/**
 * Hook pour gérer le thème de l'application
 * Supporte: light, dark, system (auto)
 * Supporte aussi les modes daltoniens: protanopia, deuteranopia, tritanopia
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getSavedTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const saved = getSavedTheme();
    return saved === 'system' ? getSystemTheme() : saved;
  });
  const [colorVision, setColorVisionState] = useState<ColorVisionMode>(getSavedColorVision);

  // Appliquer le thème au changement
  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(THEME_KEY, newTheme);
    setThemeState(newTheme);
    applyTheme(newTheme);
    setResolvedTheme(newTheme === 'system' ? getSystemTheme() : newTheme);
  }, []);

  // Appliquer le mode de vision des couleurs
  const setColorVision = useCallback((mode: ColorVisionMode) => {
    localStorage.setItem(COLOR_VISION_KEY, mode);
    setColorVisionState(mode);
    applyColorVision(mode);
  }, []);

  // Initialiser et écouter les changements système
  useEffect(() => {
    // Appliquer le thème au montage
    applyTheme(theme);
    applyColorVision(colorVision);

    // Écouter les changements de préférence système
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyTheme('system');
        setResolvedTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, colorVision]);

  // Toggle rapide entre light et dark
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  return {
    theme,           // 'light' | 'dark' | 'system'
    resolvedTheme,   // 'light' | 'dark' (thème effectivement appliqué)
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
    colorVision,     // 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia'
    setColorVision,
  };
}

export default useTheme;
