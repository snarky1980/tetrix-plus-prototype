import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'tetrix-theme';

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
 * Hook pour gérer le thème de l'application
 * Supporte: light, dark, system (auto)
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getSavedTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const saved = getSavedTheme();
    return saved === 'system' ? getSystemTheme() : saved;
  });

  // Appliquer le thème au changement
  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(THEME_KEY, newTheme);
    setThemeState(newTheme);
    applyTheme(newTheme);
    setResolvedTheme(newTheme === 'system' ? getSystemTheme() : newTheme);
  }, []);

  // Initialiser et écouter les changements système
  useEffect(() => {
    // Appliquer le thème au montage
    applyTheme(theme);

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
  }, [theme]);

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
  };
}

export default useTheme;
