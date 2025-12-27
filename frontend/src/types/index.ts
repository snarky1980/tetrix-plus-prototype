// Types pour l'authentification
export interface Utilisateur {
  id: string;
  email: string;
  nom?: string;
  prenom?: string;
  role: 'ADMIN' | 'CONSEILLER' | 'GESTIONNAIRE' | 'TRADUCTEUR';
  actif: boolean;
  isPlayground?: boolean;
  playgroundNote?: string;
  traducteurId?: string;
  divisionAccess?: DivisionAccess[];
  traducteur?: {
    id: string;
    nom: string;
    divisions: string[];
  };
}

export interface Division {
  id: string;
  nom: string;
  code: string;
  description?: string;
  actif: boolean;
  creeLe: string;
  modifieLe: string;
  acces?: DivisionAccess[];
}

export interface DivisionAccess {
  id: string;
  utilisateurId: string;
  divisionId: string;
  peutLire: boolean;
  peutEcrire: boolean;
  peutGerer: boolean;
  division?: Division;
  utilisateur?: Utilisateur;
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
  divisions: string[]; // Droit, Science et technologie, CISR, etc. - Un traducteur peut appartenir à plusieurs divisions
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
  disponiblePourTravail: boolean; // Traducteur cherche activement du travail
  commentaireDisponibilite?: string; // Commentaire optionnel sur la disponibilité
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
export type StatutTache = 'PLANIFIEE' | 'EN_COURS' | 'EN_RETARD' | 'TERMINEE';
export type TypeTache = 'TRADUCTION' | 'REVISION' | 'RELECTURE' | 'ENCADREMENT' | 'AUTRE';
export type ModeDistribution = 'JAT' | 'PEPS' | 'EQUILIBRE' | 'MANUEL';
export type TypeRepartitionUI = 'JUSTE_TEMPS' | 'PEPS' | 'EQUILIBRE' | 'MANUEL';

export interface Tache {
  id: string;
  numeroProjet: string;
  description?: string;
  specialisation?: string;
  heuresTotal: number;
  compteMots?: number;
  dateEcheance: string;
  priorite?: string;
  statut: StatutTache;
  typeTache: TypeTache;
  modeDistribution: ModeDistribution;
  version: number;
  traducteurId: string;
  traducteur?: {
    id: string;
    nom: string;
    horaire?: string;
  };
  clientId?: string;
  client?: Client;
  sousDomaineId?: string;
  sousDomaine?: SousDomaine;
  paireLinguistiqueId?: string;
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

// Types pour la planification
export interface JourPlanification {
  date: string;
  capacite: number;
  heuresTaches: number;
  heuresBlocages: number;
  heuresTotal: number;
  disponible: number;
  couleur?: 'libre' | 'presque-plein' | 'plein';
  estWeekend?: boolean;
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

export interface Planification {
  traducteur: {
    id: string;
    nom: string;
    capaciteHeuresParJour: number;
  };
  periode: {
    debut: string;
    fin: string;
  };
  planification: JourPlanification[];
}

export interface PlanificationGlobale {
  periode: {
    debut: string;
    fin: string;
  };
  planification: {
    traducteur: {
      id: string;
      nom: string;
      divisions: string[];
      classification: string;
      capaciteHeuresParJour: number;
      clientsHabituels?: string[];
      domaines?: string[];
      pairesLinguistiques?: PaireLinguistique[];
    };
    dates: Record<string, {
      heures: number;
      couleur: 'libre' | 'presque-plein' | 'plein';
      capacite: number;
      disponible: number;
      estWeekend?: boolean;
      estFerie?: boolean;
      nomFerie?: string;
      estBloque?: boolean;
      motifBlocage?: string;
    }>;
  }[];
}

// Types pour les formulaires
export interface CreerTacheForm {
  numeroProjet: string;
  traducteurId: string;
  typeTache: TypeTache;
  clientId?: string;
  sousDomaineId?: string;
  paireLinguistiqueId?: string;
  specialisation?: string;
  description?: string;
  heuresTotal: number;
  compteMots?: number;
  dateEcheance: string;
  repartition?: { date: string; heures: number; heureDebut?: string; heureFin?: string }[];
  repartitionAuto?: boolean;
  modeDistribution?: ModeDistribution;
}

export interface CreerBlocageForm {
  traducteurId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  motif: string;
}

// Types pour les notifications système
export type TypeNotificationSysteme = 
  | 'TACHE_EN_COURS' 
  | 'TACHE_EN_RETARD' 
  | 'TACHE_TERMINEE' 
  | 'ESCALADE_GESTIONNAIRE' 
  | 'RAPPEL_FERMETURE';

export interface NotificationSysteme {
  id: string;
  type: TypeNotificationSysteme;
  titre: string;
  message: string;
  lue: boolean;
  creeLe: string;
  lueLe?: string;
  tache?: {
    id: string;
    numeroProjet: string;
    statut: StatutTache;
    dateEcheance: string;
    traducteur?: { nom: string };
  };
}
