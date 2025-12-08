import { describe, it, expect } from 'vitest';
import { calculerCouleurDisponibilite } from '../src/services/planificationService';

describe('planificationService.calculerCouleurDisponibilite', () => {
  it('retourne plein quand heures == capacite', () => {
    expect(calculerCouleurDisponibilite(7.5, 7.5)).toBe('plein');
  });
  it('retourne presque-plein quand >=80% et <100%', () => {
    expect(calculerCouleurDisponibilite(6.0, 7.5)).toBe('presque-plein');
  });
  it('retourne libre en dessous du seuil 80%', () => {
    expect(calculerCouleurDisponibilite(3.0, 7.5)).toBe('libre');
  });
});
