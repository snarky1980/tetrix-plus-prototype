import api from './api';

export interface PaireLangue {
  id: string; // UUID réel de la paire linguistique
  langueSource: string;
  langueCible: string;
  actif: boolean;
  utilisationCount?: number;
}

export interface Specialisation {
  id: string;
  nom: string;
  description?: string;
  actif: boolean;
  utilisationCount?: number;
}

export interface Langue {
  code: string;
  nom: string;
  nativeName?: string;
  actif: boolean;
}

// Liste des langues standards
export const LANGUES_STANDARDS: Langue[] = [
  { code: 'FR', nom: 'Français', nativeName: 'Français', actif: true },
  { code: 'EN', nom: 'Anglais', nativeName: 'English', actif: true },
  { code: 'ES', nom: 'Espagnol', nativeName: 'Español', actif: true },
  { code: 'DE', nom: 'Allemand', nativeName: 'Deutsch', actif: true },
  { code: 'IT', nom: 'Italien', nativeName: 'Italiano', actif: true },
  { code: 'PT', nom: 'Portugais', nativeName: 'Português', actif: true },
  { code: 'ZH', nom: 'Chinois', nativeName: '中文', actif: true },
  { code: 'JA', nom: 'Japonais', nativeName: '日本語', actif: true },
  { code: 'KO', nom: 'Coréen', nativeName: '한국어', actif: true },
  { code: 'AR', nom: 'Arabe', nativeName: 'العربية', actif: true },
  { code: 'RU', nom: 'Russe', nativeName: 'Русский', actif: true },
  { code: 'NL', nom: 'Néerlandais', nativeName: 'Nederlands', actif: true },
  { code: 'PL', nom: 'Polonais', nativeName: 'Polski', actif: true },
];

export const referentielService = {
  // ====== PAIRES LINGUISTIQUES ======
  
  /**
   * Obtenir toutes les paires linguistiques utilisées dans le système
   * Retourne des UUIDs réels (une paire représentative par combinaison)
   */
  async obtenirPairesLinguistiques(): Promise<PaireLangue[]> {
    const { data } = await api.get<PaireLangue[]>('/referentiel/paires-linguistiques');
    return data;
  },

  /**
   * Créer une nouvelle paire linguistique globale
   */
  async creerPaireLinguistique(paire: { langueSource: string; langueCible: string }): Promise<PaireLangue> {
    const { data } = await api.post<PaireLangue>('/referentiel/paires-linguistiques', paire);
    return data;
  },

  /**
   * Supprimer une paire linguistique
   */
  async supprimerPaireLinguistique(id: string): Promise<void> {
    await api.delete(`/referentiel/paires-linguistiques/${id}`);
  },

  // ====== SPÉCIALISATIONS ======
  
  /**
   * Obtenir toutes les spécialisations
   */
  async obtenirSpecialisations(): Promise<Specialisation[]> {
    const { data } = await api.get<Specialisation[]>('/referentiel/specialisations');
    return data;
  },

  /**
   * Créer une nouvelle spécialisation
   */
  async creerSpecialisation(spec: { nom: string; description?: string }): Promise<Specialisation> {
    const { data } = await api.post<Specialisation>('/referentiel/specialisations', spec);
    return data;
  },

  /**
   * Mettre à jour une spécialisation
   */
  async mettreAJourSpecialisation(ancienNom: string, spec: { nom: string }): Promise<Specialisation> {
    const { data } = await api.put<Specialisation>(`/referentiel/specialisations/${ancienNom}`, spec);
    return data;
  },

  /**
   * Supprimer une spécialisation
   */
  async supprimerSpecialisation(nom: string): Promise<void> {
    await api.delete(`/referentiel/specialisations/${nom}`);
  },

  // ====== LANGUES ======
  
  /**
   * Obtenir toutes les langues disponibles
   */
  async obtenirLangues(): Promise<Langue[]> {
    const { data } = await api.get<Langue[]>('/referentiel/langues');
    return data;
  },

  /**
   * Créer une nouvelle langue
   */
  async creerLangue(langue: { code: string; nom: string; nativeName?: string }): Promise<Langue> {
    const { data } = await api.post<Langue>('/referentiel/langues', langue);
    return data;
  },

  /**
   * Mettre à jour une langue
   */
  async mettreAJourLangue(code: string, langue: Partial<Langue>): Promise<Langue> {
    const { data } = await api.put<Langue>(`/referentiel/langues/${code}`, langue);
    return data;
  },

  /**
   * Obtenir les langues par défaut (statiques)
   */
  obtenirLanguesStandards(): Langue[] {
    return LANGUES_STANDARDS;
  },

  // ====== STATISTIQUES ======
  
  /**
   * Obtenir les statistiques d'utilisation du référentiel
   */
  async obtenirStatistiques(): Promise<{
    totalClients: number;
    totalDomaines: number;
    totalSousDomaines: number;
    totalSpecialisations: number;
    totalPaires: number;
    totalDivisions: number;
  }> {
    const { data } = await api.get('/referentiel/statistiques');
    return data;
  },
};
