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
   * Analyser la planification avec Tetrix Master (version complète)
   */
  async analyserTetrixMaster(dateDebut: string, dateFin: string): Promise<any> {
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
};

export default optimisationService;
