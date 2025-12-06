// Types pour l'authentification
export interface Utilisateur {
  id: string;
  email: string;
  role: 'ADMIN' | 'CONSEILLER' | 'TRADUCTEUR';
  traducteurId?: string;
}

export interface LoginResponse {
  token: string;
  utilisateur: Utilisateur;
}

// Types pour les traducteurs
export interface PaireLinguistique {
  id: string;
  langueSource: string;
  langueCible: string;
}

export interface Traducteur {
  id: string;
  nom: string;
  division: string; // Droit, Science et technologie, CISR, etc.
  classification: string; // TR1, TR2, TR3
  horaire?: string; // Optionnel: "9h-17h", "8h30-16h30"
  domaines: string[];
  clientsHabituels: string[];
  specialisations: string[]; // Immigration, juridique, médical, etc.
  notes?: string; // Notes diverses (ex: en congé le mercredi)
  capaciteHeuresParJour: number;
  actif: boolean;
  utilisateurId: string; // ID de l'utilisateur associé
  pairesLinguistiques: PaireLinguistique[];
}

// Types pour les clients et domaines
export interface Client {
  id: string;
  nom: string;
  sousDomaines: string[];
  actif: boolean;
}

export interface SousDomaine {
  id: string;
  nom: string;
  domaineParent?: string;
  actif: boolean;
}

// Types pour les tâches
export type StatutTache = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE';

export interface Tache {
  id: string;
  description: string;
  heuresTotal: number;
  dateEcheance: string;
  statut: StatutTache;
  traducteurId: string;
  traducteur?: {
    id: string;
    nom: string;
  };
  clientId?: string;
  client?: Client;
  sousDomaineId?: string;
  sousDomaine?: SousDomaine;
  paireLinguistiqueId: string;
  paireLinguistique?: PaireLinguistique;
  ajustementsTemps?: AjustementTemps[];
  creePar: string;
  creeLe: string;
}

// Types pour les ajustements de temps
export type TypeAjustement = 'TACHE' | 'BLOCAGE';

export interface AjustementTemps {
  id: string;
  date: string;
  heures: number;
  type: TypeAjustement;
  traducteurId: string;
  tacheId?: string;
  tache?: {
    id: string;
    description: string;
    statut: StatutTache;
    client?: { nom: string };
    sousDomaine?: { nom: string };
  };
  creePar: string;
  creeLe: string;
}

// Types pour le planning
export interface JourPlanning {
  date: string;
  capacite: number;
  heuresTaches: number;
  heuresBlocages: number;
  heuresTotal: number;
  disponible: number;
  couleur?: 'libre' | 'presque-plein' | 'plein';
  taches: {
    id: string;
    description: string;
    heures: number;
    client?: string;
    sousDomaine?: string;
    statut: StatutTache;
  }[];
  blocages: {
    id: string;
    heures: number;
  }[];
}

export interface Planning {
  traducteur: {
    id: string;
    nom: string;
    capaciteHeuresParJour: number;
  };
  periode: {
    debut: string;
    fin: string;
  };
  planning: JourPlanning[];
}

export interface PlanningGlobal {
  periode: {
    debut: string;
    fin: string;
  };
  planning: {
    traducteur: {
      id: string;
      nom: string;
      division: string;
      capaciteHeuresParJour: number;
    };
    dates: Record<string, {
      heures: number;
      couleur: 'libre' | 'presque-plein' | 'plein';
      capacite: number;
      disponible: number;
    }>;
  }[];
}

// Types pour les formulaires
export interface CreerTacheForm {
  traducteurId: string;
  clientId?: string;
  sousDomaineId?: string;
  paireLinguistiqueId: string;
  description: string;
  heuresTotal: number;
  dateEcheance: string;
  repartition?: { date: string; heures: number }[];
  repartitionAuto?: boolean;
}

export interface CreerBlocageForm {
  traducteurId: string;
  date: string;
  heures: number;
}
