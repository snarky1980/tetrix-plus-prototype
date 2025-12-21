import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface TraducteurUtilisation {
  id: string;
  nom: string;
  capaciteTotal: number;
  heuresAssignees: number;
  tauxUtilisation: number;
  joursDisponibles: number;
  taches: any[];
}

export interface ProblemeDetecte {
  type: 'SURCHARGE' | 'SOUS_UTILISATION' | 'PIC_CHARGE' | 'GOULOT';
  gravite: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  description: string;
  traducteurId?: string;
  date?: string;
  impact: string;
}

export interface Suggestion {
  id: string;
  type: 'REASSIGNER' | 'REDISTRIBUER' | 'OPTIMISER_COMPETENCES';
  tacheId: string;
  tacheNumero: string;
  heuresTotal: number;
  traducteurSourceId: string;
  traducteurSourceNom: string;
  traducteurCibleId?: string;
  traducteurCibleNom?: string;
  raison: string;
  impactSource: string;
  impactCible?: string;
  priorite: number;
  nouveauTauxSource?: number;
  nouveauTauxCible?: number;
}

export interface AnalyseOptimisation {
  periode: { dateDebut: string; dateFin: string };
  score: number;
  ecartType: number;
  problemes: ProblemeDetecte[];
  traducteurs: TraducteurUtilisation[];
  joursAuDessusSeuil: number;
  capaciteGaspillee: number;
}

const optimisationService = {
  /**
   * Analyser la planification avec Tetrix Max (version complète)
   */
  async analyserTetrixMax(dateDebut: string, dateFin: string): Promise<any> {
    const response = await axios.get(`${API_URL}/optimisation/tetrix-master`, {
      params: { dateDebut, dateFin },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.data;
  },

  /**
   * Analyser la planification actuelle (version simplifiée, legacy)
   */
  async analyser(dateDebut: string, dateFin: string): Promise<AnalyseOptimisation> {
    const response = await axios.get(`${API_URL}/optimisation/analyser`, {
      params: { dateDebut, dateFin },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.data;
  },

  /**
   * Générer des suggestions d'optimisation
   */
  async suggerer(dateDebut: string, dateFin: string): Promise<Suggestion[]> {
    const response = await axios.get(`${API_URL}/optimisation/suggerer`, {
      params: { dateDebut, dateFin },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.data;
  },

  /**
   * Appliquer une suggestion
   */
  async appliquer(tacheId: string, nouveauTraducteurId: string): Promise<void> {
    await axios.post(
      `${API_URL}/optimisation/appliquer`,
      { tacheId, nouveauTraducteurId },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    );
  },

  /**
   * Générer rapport Tetrix Orion (analyse statistique avancée)
   */
  async genererRapportOrion(dateDebut: string, dateFin: string): Promise<any> {
    const response = await axios.get(`${API_URL}/optimisation/orion`, {
      params: { dateDebut, dateFin },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.data;
  },

  /**
   * NOUVEAU: Générer rapport Tetrix Max Unifié
   * Combine les analyses Orion (statistiques) et Master (optimisation)
   * @param filtres - Filtres optionnels pour limiter l'analyse aux TR affichés
   */
  async genererRapportUnifie(
    dateDebut: string, 
    dateFin: string,
    filtres?: {
      divisions?: string[];
      clients?: string[];
      domaines?: string[];
      languesSource?: string[];
      languesCible?: string[];
    }
  ): Promise<any> {
    const response = await axios.get(`${API_URL}/optimisation/tetrix-master-unified`, {
      params: { 
        dateDebut, 
        dateFin,
        division: filtres?.divisions?.length ? filtres.divisions.join(',') : undefined,
        client: filtres?.clients?.length ? filtres.clients.join(',') : undefined,
        domaine: filtres?.domaines?.length ? filtres.domaines.join(',') : undefined,
        langueSource: filtres?.languesSource?.length ? filtres.languesSource.join(',') : undefined,
        langueCible: filtres?.languesCible?.length ? filtres.languesCible.join(',') : undefined,
      },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.data;
  },
};

export default optimisationService;
