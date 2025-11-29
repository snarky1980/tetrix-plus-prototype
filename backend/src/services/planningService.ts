// Service planning: calcul couleur disponibilité + helpers

export function calculerCouleurDisponibilite(heuresUtilisees: number, capacite: number): 'libre' | 'presque-plein' | 'plein' {
  if (heuresUtilisees >= capacite - 1e-6) return 'plein';
  if (heuresUtilisees >= capacite * 0.8) return 'presque-plein';
  return 'libre';
}

export interface JourPlanning {
  date: string;
  capacite: number;
  heuresTaches: number;
  heuresBlocages: number;
  heuresTotal: number;
  disponible: number;
  couleur: 'libre' | 'presque-plein' | 'plein';
}
