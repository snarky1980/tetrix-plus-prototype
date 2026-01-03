import api from './api';

export interface JourFerie {
  id: string;
  date: string;
  nom: string;
  description?: string | null;
  type: 'FEDERAL' | 'PROVINCIAL' | 'ORGANISATIONNEL';
  actif: boolean;
  creeLe: string;
  modifieLe: string;
}

export interface CreateJourFerieData {
  date: string;
  nom: string;
  description?: string;
  type?: 'FEDERAL' | 'PROVINCIAL' | 'ORGANISATIONNEL';
}

export interface UpdateJourFerieData {
  date?: string;
  nom?: string;
  description?: string;
  type?: 'FEDERAL' | 'PROVINCIAL' | 'ORGANISATIONNEL';
  actif?: boolean;
}

export interface ImportResult {
  crees: number;
  ignores: number;
  erreurs: string[];
}

export interface PreremplirResult {
  message: string;
  crees: number;
  ignores: number;
}

const joursFerieService = {
  /**
   * Obtenir tous les jours fériés
   */
  async obtenirTous(annee?: number, actif?: boolean): Promise<JourFerie[]> {
    const params = new URLSearchParams();
    if (annee !== undefined) params.append('annee', annee.toString());
    if (actif !== undefined) params.append('actif', actif.toString());
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<JourFerie[]>(`/admin/jours-feries${query}`);
    return response.data;
  },

  /**
   * Obtenir un jour férié par ID
   */
  async obtenirParId(id: string): Promise<JourFerie> {
    const response = await api.get<JourFerie>(`/admin/jours-feries/${id}`);
    return response.data;
  },

  /**
   * Créer un nouveau jour férié
   */
  async creer(data: CreateJourFerieData): Promise<JourFerie> {
    const response = await api.post<JourFerie>('/admin/jours-feries', data);
    return response.data;
  },

  /**
   * Mettre à jour un jour férié
   */
  async mettreAJour(id: string, data: UpdateJourFerieData): Promise<JourFerie> {
    const response = await api.put<JourFerie>(`/admin/jours-feries/${id}`, data);
    return response.data;
  },

  /**
   * Supprimer un jour férié
   */
  async supprimer(id: string): Promise<void> {
    await api.delete(`/admin/jours-feries/${id}`);
  },

  /**
   * Importer plusieurs jours fériés
   */
  async importer(joursFeries: CreateJourFerieData[]): Promise<ImportResult> {
    const response = await api.post<ImportResult>('/admin/jours-feries/import', { joursFeries });
    return response.data;
  },

  /**
   * Pré-remplir avec les jours fériés officiels d'une année
   */
  async preremplirAnnee(annee: number): Promise<PreremplirResult> {
    const response = await api.post<PreremplirResult>(`/admin/jours-feries/preremplir/${annee}`);
    return response.data;
  },

  /**
   * Vérifier si une date est un jour férié (API publique)
   */
  async verifierDate(date: string): Promise<{ date: string; estFerie: boolean; nom: string | null }> {
    const response = await api.post<{ date: string; estFerie: boolean; nom: string | null }>('/jours-feries/verifier', { date });
    return response.data;
  },

  /**
   * Obtenir les jours fériés pour l'affichage (API publique)
   */
  async obtenirPourAnnee(annee: number): Promise<Array<{ date: Date; nom: string; description?: string }>> {
    const response = await api.get<Array<{ date: string; nom: string; description?: string }>>(`/jours-feries/${annee}`);
    return response.data.map(jf => ({
      ...jf,
      date: new Date(jf.date),
    }));
  },
};

export default joursFerieService;
