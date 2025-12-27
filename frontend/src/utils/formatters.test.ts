/**
 * Tests unitaires pour formatRelativeTime et autres fonctions de formatters.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  formatRelativeTime, 
  formatNumeroProjet, 
  isValidNumeroProjet, 
  unformatNumeroProjet 
} from './formatters';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    // Fixer le temps pour des tests déterministes
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-27T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('secondes (< 1 minute)', () => {
    it('retourne "À l\'instant" pour une date de maintenant', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe("À l'instant");
    });

    it('retourne "À l\'instant" pour une date de 30 secondes', () => {
      const date = new Date(Date.now() - 30 * 1000).toISOString();
      expect(formatRelativeTime(date)).toBe("À l'instant");
    });

    it('retourne "À l\'instant" pour une date de 59 secondes', () => {
      const date = new Date(Date.now() - 59 * 1000).toISOString();
      expect(formatRelativeTime(date)).toBe("À l'instant");
    });
  });

  describe('minutes (1-59 minutes)', () => {
    it('retourne "Il y a 1 min" pour une date d\'une minute', () => {
      const date = new Date(Date.now() - 60 * 1000).toISOString();
      expect(formatRelativeTime(date)).toBe('Il y a 1 min');
    });

    it('retourne "Il y a 5 min" pour une date de 5 minutes', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(date)).toBe('Il y a 5 min');
    });

    it('retourne "Il y a 59 min" pour une date de 59 minutes', () => {
      const date = new Date(Date.now() - 59 * 60 * 1000).toISOString();
      expect(formatRelativeTime(date)).toBe('Il y a 59 min');
    });
  });

  describe('heures (1-23 heures)', () => {
    it('retourne "Il y a 1h" pour une date d\'une heure', () => {
      const date = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(date)).toBe('Il y a 1h');
    });

    it('retourne "Il y a 5h" pour une date de 5 heures', () => {
      const date = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(date)).toBe('Il y a 5h');
    });

    it('retourne "Il y a 23h" pour une date de 23 heures', () => {
      const date = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(date)).toBe('Il y a 23h');
    });
  });

  describe('jours (1-6 jours)', () => {
    it('retourne "Il y a 1j" pour une date d\'un jour', () => {
      const date = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(date)).toBe('Il y a 1j');
    });

    it('retourne "Il y a 3j" pour une date de 3 jours', () => {
      const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(date)).toBe('Il y a 3j');
    });

    it('retourne "Il y a 6j" pour une date de 6 jours', () => {
      const date = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(date)).toBe('Il y a 6j');
    });
  });

  describe('semaines et plus (>= 7 jours)', () => {
    it('retourne la date locale pour une date de 7 jours', () => {
      const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(date);
      // Format fr-CA: YYYY-MM-DD
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('retourne la date locale pour une date de 30 jours', () => {
      const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('cas limites', () => {
    it('gère les dates futures (affiche À l\'instant)', () => {
      // Date dans le futur = diffMs négatif = diffMin négatif = < 1
      const future = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(future)).toBe("À l'instant");
    });

    it('gère une date invalide gracieusement', () => {
      // Date invalide => NaN, toLocaleDateString retourne "Invalid Date"
      const result = formatRelativeTime('invalid-date');
      expect(result).toBe('Invalid Date');
    });
  });
});

describe('formatNumeroProjet', () => {
  describe('formatage progressif', () => {
    it('retourne les chiffres seuls pour 1-3 caractères', () => {
      expect(formatNumeroProjet('1')).toBe('1');
      expect(formatNumeroProjet('12')).toBe('12');
      expect(formatNumeroProjet('123')).toBe('123');
    });

    it('ajoute le premier tiret après 3 chiffres', () => {
      expect(formatNumeroProjet('1234')).toBe('123-4');
      expect(formatNumeroProjet('123456789')).toBe('123-456789');
    });

    it('ajoute le deuxième tiret après 9 chiffres', () => {
      expect(formatNumeroProjet('1234567890')).toBe('123-456789-0');
      expect(formatNumeroProjet('123456789012')).toBe('123-456789-012');
    });
  });

  describe('nettoyage des caractères', () => {
    it('supprime les caractères non-numériques', () => {
      expect(formatNumeroProjet('12a3')).toBe('123');
      expect(formatNumeroProjet('123-456')).toBe('123-456');
      expect(formatNumeroProjet('abc123def456')).toBe('123-456');
    });

    it('limite à 12 chiffres maximum', () => {
      expect(formatNumeroProjet('12345678901234567890')).toBe('123-456789-012');
    });
  });

  describe('entrée déjà formatée', () => {
    it('reformate correctement une entrée avec tirets', () => {
      expect(formatNumeroProjet('123-456789-012')).toBe('123-456789-012');
    });
  });
});

describe('isValidNumeroProjet', () => {
  it('retourne true pour un format valide complet', () => {
    expect(isValidNumeroProjet('123-456789-012')).toBe(true);
    expect(isValidNumeroProjet('999-000000-001')).toBe(true);
  });

  it('retourne false pour un format incomplet', () => {
    expect(isValidNumeroProjet('123-456789-01')).toBe(false);
    expect(isValidNumeroProjet('123-456789')).toBe(false);
    expect(isValidNumeroProjet('123')).toBe(false);
    expect(isValidNumeroProjet('')).toBe(false);
  });

  it('retourne false pour un format invalide', () => {
    expect(isValidNumeroProjet('123456789012')).toBe(false);
    expect(isValidNumeroProjet('123-4567890-12')).toBe(false);
    expect(isValidNumeroProjet('12-456789-012')).toBe(false);
    expect(isValidNumeroProjet('abc-defghi-jkl')).toBe(false);
  });
});

describe('unformatNumeroProjet', () => {
  it('extrait les chiffres d\'un numéro formaté', () => {
    expect(unformatNumeroProjet('123-456789-012')).toBe('123456789012');
  });

  it('gère les entrées sans tirets', () => {
    expect(unformatNumeroProjet('123456789012')).toBe('123456789012');
  });

  it('supprime tous les caractères non-numériques', () => {
    expect(unformatNumeroProjet('12-34-56')).toBe('123456');
    expect(unformatNumeroProjet('abc123')).toBe('123');
  });
});
