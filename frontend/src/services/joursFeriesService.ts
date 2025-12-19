import api from './api';

export interface JourFerie {
  date: string; // ISO format YYYY-MM-DD
  nom: string;
  description?: string;
}

export interface VerificationJourFerie {
  date: string;
  estFerie: boolean;
  nom: string | null;
}

export interface JoursOuvrablesResponse {
  dateDebut: string;
  dateFin: string;
  joursOuvrables: number;
  joursFeries: number;
  details: JourFerie[];
}

class JoursFeriesService {
  /**
   * Obtient tous les jours fériés configurés (2026-2027)
   */
  async obtenirTous(): Promise<JourFerie[]> {
    const response = await api.get<JourFerie[]>('/jours-feries');
    return response.data;
  }

  /**
   * Obtient les jours fériés pour une année spécifique
   */
  async obtenirParAnnee(annee: number): Promise<JourFerie[]> {
    const response = await api.get<JourFerie[]>(`/jours-feries/${annee}`);
    return response.data;
  }

  /**
   * Vérifie si une date est un jour férié
   */
  async verifierDate(date: string): Promise<VerificationJourFerie> {
    const response = await api.post<VerificationJourFerie>('/jours-feries/verifier', { date });
    return response.data;
  }

  /**
   * Compte les jours ouvrables entre deux dates (excluant week-ends et fériés)
   */
  async compterJoursOuvrables(dateDebut: string, dateFin: string): Promise<JoursOuvrablesResponse> {
    const response = await api.post<JoursOuvrablesResponse>('/jours-feries/jours-ouvrables', {
      dateDebut,
      dateFin,
    });
    return response.data;
  }

  /**
   * Vérifie si une date donnée est un jour férié (côté client, synchrone)
   * Note: Nécessite d'avoir chargé les jours fériés au préalable
   */
  estJourFerieLocal(date: Date, joursFeries: JourFerie[]): boolean {
    const dateStr = date.toISOString().split('T')[0];
    return joursFeries.some((jf) => jf.date === dateStr);
  }

  /**
   * Filtre les dates pour exclure les jours fériés
   */
  filtrerJoursFeries(dates: string[], joursFeries: JourFerie[]): string[] {
    const joursFeriesSet = new Set(joursFeries.map((jf) => jf.date));
    return dates.filter((date) => !joursFeriesSet.has(date));
  }
}

export const joursFeriesService = new JoursFeriesService();
