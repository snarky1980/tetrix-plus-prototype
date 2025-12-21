import api from './api';

export interface StatsProductivite {
  vueEnsemble: {
    motsTotaux: number;
    heuresTotales: number;
    productiviteMoyenne: number;
    traducteursActifs: number;
    tendanceMots: number;
    tendanceHeures: number;
    tendanceProductivite: number;
    // Statistiques par statut
    tachesTotal?: number;
    tachesTerminees?: number;
    tachesEnCours?: number;
    tachesPlanifiees?: number;
  };
  parTraducteur: Array<{
    id: string;
    nom: string;
    division: string;
    classification: string;
    specialisations: string[];
    mots: number;
    heures: number;
    taches: number;
    tachesTerminees?: number;
    productivite: number;
    tendance: number;
  }>;
  parDivision: Array<{
    division: string;
    productiviteMoyenne: number;
  }>;
  parTypeTexte: Array<{
    type: string;
    productiviteMoyenne: number;
  }>;
  alertes: Array<{
    type: 'warning' | 'success' | 'info';
    message: string;
    traducteurId?: string;
  }>;
}

export interface StatsQuery {
  dateDebut: string;
  dateFin: string;
  divisionId?: string;
  traducteurId?: string;
  // Filtres du planificateur
  division?: string;
  client?: string;
  domaine?: string;
  langueSource?: string;
  langueCible?: string;
}

const statistiquesService = {
  async obtenirProductivite(params: StatsQuery): Promise<StatsProductivite> {
    const response = await api.get('/statistiques/productivite', { params });
    return response.data;
  },
};

export default statistiquesService;
