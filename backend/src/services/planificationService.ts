// Service planification: calcul couleur disponibilité + helpers

/**
 * Vérifie si une date est un weekend (samedi ou dimanche)
 */
export function estWeekend(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dayOfWeek = d.getUTCDay(); // 0 = dimanche, 6 = samedi
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function calculerCouleurDisponibilite(heuresUtilisees: number, capacite: number): 'libre' | 'presque-plein' | 'plein' {
  if (heuresUtilisees >= capacite - 1e-6) return 'plein';
  if (heuresUtilisees >= capacite * 0.8) return 'presque-plein';
  return 'libre';
}

export interface JourPlanification {
  date: string;
  capacite: number;
  heuresTaches: number;
  heuresBlocages: number;
  heuresTotal: number;
  disponible: number;
  couleur: 'libre' | 'presque-plein' | 'plein';
  estWeekend?: boolean;
}
