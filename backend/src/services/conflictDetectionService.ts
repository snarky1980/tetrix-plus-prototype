/**
 * ═══════════════════════════════════════════════════════════════════════
 * SERVICE DE DÉTECTION ET SUGGESTION DE RÉATTRIBUTION
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * INVARIANT ABSOLU: Ce service NE MODIFIE JAMAIS les allocations automatiquement.
 * Il détecte, analyse et SUGGÈRE uniquement.
 * Le conseiller reste le seul acteur des changements.
 * 
 * CONTEXTE:
 * Lorsqu'un blocage est ajouté/modifié APRÈS la planification d'une tâche,
 * certaines allocations peuvent devenir invalides (chevauchement, dépassement
 * capacité, échéance impossible, etc.).
 * 
 * OBJECTIF:
 * - Détecter automatiquement les conflits
 * - Analyser les options possibles
 * - Présenter des suggestions structurées avec score d'impact
 * - Garder traçabilité sans automatisme
 * ═══════════════════════════════════════════════════════════════════════
 */

import prisma from '../config/database';
import {
  normalizeToOttawa,
  normalizeToOttawaWithTime,
  parseOttawaDateISO,
  parseHoraireTraducteur,
  capaciteNetteJour,
  formatOttawaISO,
  differenceInDaysOttawa,
  addDaysOttawa,
  OTTAWA_TIMEZONE
} from '../utils/dateTimeOttawa';
import { toZonedTime } from 'date-fns-tz';
import { capaciteDisponiblePlageHoraire } from './capaciteService';

// ═══════════════════════════════════════════════════════════════════════
// TYPES ET INTERFACES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Types de conflits détectables
 */
export enum TypeConflict {
  CHEVAUCHEMENT_BLOCAGE = 'CHEVAUCHEMENT_BLOCAGE',     // Allocation chevauche un blocage
  DEPASSEMENT_CAPACITE = 'DEPASSEMENT_CAPACITE',       // Total heures > capacité quotidienne
  HORS_HORAIRE = 'HORS_HORAIRE',                       // Heures hors horaire de travail
  EMPIETE_PAUSE = 'EMPIETE_PAUSE',                     // Heures durant pause (12h-13h)
  APRES_ECHEANCE = 'APRES_ECHEANCE'                    // Allocation après deadline
}

/**
 * Conflit détecté sur une allocation
 */
export interface Conflict {
  type: TypeConflict;
  allocationId: string;              // ID de l'ajustement temps concerné
  tacheId: string;
  traducteurId: string;
  date: string;                      // Format YYYY-MM-DD
  heuresAllouees: number;
  heureDebut?: string;               // Ex: "10h30"
  heureFin?: string;                 // Ex: "14h"
  blocageId?: string;                // Si applicable
  explication: string;               // Message lisible
  contexte: {
    capaciteJour?: number;
    heuresUtilisees?: number;
    horaire?: { heureDebut: number; heureFin: number };
    echeance?: Date;
  };
}

/**
 * Types de suggestions possibles
 */
export enum TypeSuggestion {
  REPARATION_LOCALE = 'REPARATION_LOCALE',       // Déplacer sur même traducteur
  REATTRIBUTION = 'REATTRIBUTION',               // Changer de traducteur
  IMPOSSIBLE = 'IMPOSSIBLE'                      // Aucun scénario viable
}

/**
 * Niveau d'impact d'une suggestion
 */
export enum NiveauImpact {
  FAIBLE = 'FAIBLE',       // 0-30 points
  MODERE = 'MODERE',       // 31-60 points
  ELEVE = 'ELEVE'          // 61-100 points
}

/**
 * Plage horaire disponible pour allocation
 */
export interface PlageDisponible {
  date: string;              // YYYY-MM-DD
  heureDebut: string;        // "10h" ou "10h30"
  heureFin: string;          // "17h" ou "17h30"
  heuresDisponibles: number; // Durée en heures décimales
}

/**
 * Candidat pour réattribution
 */
export interface CandidatReattribution {
  traducteurId: string;
  traducteurNom: string;
  plagesDisponibles: PlageDisponible[];
  heuresDisponiblesTotal: number;
  peutCompleterAvantEcheance: boolean;
  score: number;             // Score de pertinence (0-100)
}

/**
 * Score d'impact détaillé d'une suggestion
 */
export interface ScoreImpact {
  total: number;             // 0-100
  niveau: NiveauImpact;
  decomposition: {
    heuresDeplacees: number;         // +1 à +20 selon heures
    nombreTachesAffectees: number;   // +5 par tâche supplémentaire
    changementTraducteur: number;    // +15 si réattribution
    risqueEcheance: number;          // +10 à +30 selon marge
    morcellement: number;            // +5 par plage supplémentaire
  };
  justification: string;     // Explication textuelle
}

/**
 * Suggestion de correction pour un conflit
 */
export interface Suggestion {
  id: string;                       // ID unique de la suggestion
  type: TypeSuggestion;
  conflitsResolus: string[];        // IDs des conflits
  tacheId: string;
  traducteurActuel: string;
  traducteurPropose?: string;       // Si réattribution
  candidatsAlternatifs?: CandidatReattribution[]; // Autres options de réattribution
  
  // Détails de la suggestion
  plagesProposees: PlageDisponible[];
  heuresManquantes?: number;        // Si impossible
  contraintesBloquantes?: string[]; // Explications si impossible
  
  // Score d'impact
  scoreImpact: ScoreImpact;
  
  // Métadonnées
  creeA: Date;
  description: string;              // Description lisible pour le conseiller
}

/**
 * Rapport complet de détection et suggestions
 */
export interface RapportConflits {
  declencheur: {
    type: 'BLOCAGE' | 'MODIFICATION_HORAIRE';
    blocageId?: string;
    traducteurId: string;
    dateDebut: Date;
    dateFin: Date;
  };
  conflitsDetectes: Conflict[];
  suggestions: Suggestion[];
  genereLe: Date;
}

// ═══════════════════════════════════════════════════════════════════════
// FONCTIONS DE DÉTECTION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Parse une heure au format "Xh" ou "Xh30" ou "HH:MM" en décimal
 * @example parseHeureString("10h") => 10
 * @example parseHeureString("10h30") => 10.5
 * @example parseHeureString("10:00") => 10
 */
function parseHeureString(heureStr: string): number {
  // Format "Xh" ou "XhYY"
  const matchH = heureStr.match(/^(\d+)h(\d+)?$/);
  if (matchH) {
    const heures = parseInt(matchH[1], 10);
    const minutes = matchH[2] ? parseInt(matchH[2], 10) : 0;
    return heures + minutes / 60;
  }
  
  // Format "HH:MM"
  const matchColon = heureStr.match(/^(\d+):(\d+)$/);
  if (matchColon) {
    const heures = parseInt(matchColon[1], 10);
    const minutes = parseInt(matchColon[2], 10);
    return heures + minutes / 60;
  }
  
  throw new Error(`Format d'heure invalide: ${heureStr}`);
}

/**
 * Formate une heure décimale en "Xh" ou "Xh30"
 */
function formatHeure(heure: number): string {
  const heureEntiere = Math.floor(heure);
  const minutes = Math.round((heure - heureEntiere) * 60);
  if (minutes === 0) {
    return `${heureEntiere}h`;
  }
  return `${heureEntiere}h${minutes.toString().padStart(2, '0')}`;
}

/**
 * Vérifie si deux plages horaires se chevauchent
 */
function chevauche(
  debut1: number,
  fin1: number,
  debut2: number,
  fin2: number
): boolean {
  return debut1 < fin2 && debut2 < fin1;
}

/**
 * Détecte si une allocation chevauche un blocage
 */
async function detecterChevauchementBlocage(
  allocation: any,
  traducteurId: string
): Promise<Conflict | null> {
  // allocation.date vient de Prisma et est déjà une Date, pas besoin de normaliser
  
  
  // Récupérer tous les blocages du traducteur pour cette date
  const blocages = await prisma.ajustementTemps.findMany({
    where: {
      traducteurId,
      date: allocation.date,
      type: 'BLOCAGE'
    }
  });

  if (blocages.length === 0) return null;

  // Vérifier chevauchement
  if (!allocation.heureDebut || !allocation.heureFin) return null;

  const debutAlloc = parseHeureString(allocation.heureDebut);
  const finAlloc = parseHeureString(allocation.heureFin);

  for (const blocage of blocages) {
    if (!blocage.heureDebut || !blocage.heureFin) continue;

    const debutBlocage = parseHeureString(blocage.heureDebut);
    const finBlocage = parseHeureString(blocage.heureFin);

    if (chevauche(debutAlloc, finAlloc, debutBlocage, finBlocage)) {
      return {
        type: TypeConflict.CHEVAUCHEMENT_BLOCAGE,
        allocationId: allocation.id,
        tacheId: allocation.tacheId!,
        traducteurId,
        date: formatOttawaISO(allocation.date),
        heuresAllouees: allocation.heures,
        heureDebut: allocation.heureDebut,
        heureFin: allocation.heureFin,
        blocageId: blocage.id,
        explication: `L'allocation ${allocation.heureDebut}-${allocation.heureFin} chevauche le blocage ${blocage.heureDebut}-${blocage.heureFin}`,
        contexte: {}
      };
    }
  }

  return null;
}

/**
 * Détecte si le total des heures allouées dépasse la capacité quotidienne
 */
async function detecterDepassementCapacite(
  allocation: any,
  traducteurId: string
): Promise<Conflict | null> {
  // allocation.date vient de Prisma, pas besoin de normaliser
  
  // Récupérer le traducteur pour sa capacité
  const traducteur = await prisma.traducteur.findUnique({
    where: { id: traducteurId },
    select: { capaciteHeuresParJour: true, horaire: true }
  });

  if (!traducteur) return null;

  const horaire = parseHoraireTraducteur(traducteur.horaire || '');
  
  // Calculer capacité nette (horaire - pause)
  const capaciteNette = capaciteNetteJour(horaire, allocation.date);

  // Récupérer toutes les allocations pour cette date
  const allocations = await prisma.ajustementTemps.findMany({
    where: {
      traducteurId,
      date: allocation.date,
      type: 'TACHE'
    }
  });

  const totalHeures = allocations.reduce((sum, a) => sum + a.heures, 0);


  if (totalHeures > capaciteNette) {
    return {
      type: TypeConflict.DEPASSEMENT_CAPACITE,
      allocationId: allocation.id,
      tacheId: allocation.tacheId!,
      traducteurId,
      date: formatOttawaISO(allocation.date),
      heuresAllouees: allocation.heures,
      heureDebut: allocation.heureDebut,
      heureFin: allocation.heureFin,
      explication: `Total ${totalHeures.toFixed(2)}h dépasse la capacité de ${capaciteNette.toFixed(2)}h`,
      contexte: {
        capaciteJour: capaciteNette,
        heuresUtilisees: totalHeures,
        horaire
      }
    };
  }

  return null;
}

/**
 * Détecte si une allocation est hors horaire de travail
 */
async function detecterHorsHoraire(
  allocation: any,
  traducteurId: string
): Promise<Conflict | null> {
  if (!allocation.heureDebut || !allocation.heureFin) return null;

  const traducteur = await prisma.traducteur.findUnique({
    where: { id: traducteurId },
    select: { horaire: true }
  });

  if (!traducteur) return null;

  const horaire = parseHoraireTraducteur(traducteur.horaire || '');
  const debutAlloc = parseHeureString(allocation.heureDebut);
  const finAlloc = parseHeureString(allocation.heureFin);

  if (debutAlloc < horaire.heureDebut || finAlloc > horaire.heureFin) {
    return {
      type: TypeConflict.HORS_HORAIRE,
      allocationId: allocation.id,
      tacheId: allocation.tacheId!,
      traducteurId,
      date: formatOttawaISO(allocation.date),
      heuresAllouees: allocation.heures,
      heureDebut: allocation.heureDebut,
      heureFin: allocation.heureFin,
      explication: `L'allocation ${allocation.heureDebut}-${allocation.heureFin} est hors horaire ${formatHeure(horaire.heureDebut)}-${formatHeure(horaire.heureFin)}`,
      contexte: { horaire }
    };
  }

  return null;
}

/**
 * Détecte si une allocation empiète sur la pause (12h-13h)
 */
function detecterEmpietePause(allocation: any, traducteurId: string): Conflict | null {
  if (!allocation.heureDebut || !allocation.heureFin) return null;

  const debutAlloc = parseHeureString(allocation.heureDebut);
  const finAlloc = parseHeureString(allocation.heureFin);
  const PAUSE_DEBUT = 12;
  const PAUSE_FIN = 13;

  if (chevauche(debutAlloc, finAlloc, PAUSE_DEBUT, PAUSE_FIN)) {
    return {
      type: TypeConflict.EMPIETE_PAUSE,
      allocationId: allocation.id,
      tacheId: allocation.tacheId!,
      traducteurId,
      date: formatOttawaISO(allocation.date),
      heuresAllouees: allocation.heures,
      heureDebut: allocation.heureDebut,
      heureFin: allocation.heureFin,
      explication: `L'allocation ${allocation.heureDebut}-${allocation.heureFin} empiète sur la pause 12h-13h`,
      contexte: {}
    };
  }

  return null;
}

/**
 * Détecte si une allocation dépasse l'échéance de la tâche
 * CRITIQUE: Doit tenir compte de la DATE **ET** de l'HEURE de l'échéance
 */
async function detecterApresEcheance(allocation: any): Promise<Conflict | null> {
  if (!allocation.tacheId) return null;

  const tache = await prisma.tache.findUnique({
    where: { id: allocation.tacheId },
    select: { dateEcheance: true }
  });

  if (!tache) return null;

  const dateAllocation = normalizeToOttawa(allocation.date).date;
  // CORRECTION: Utiliser normalizeToOttawaWithTime pour préserver l'heure de l'échéance
  const { date: dateEcheance, hasTime: echeanceHasTime } = normalizeToOttawaWithTime(
    tache.dateEcheance, 
    true, 
    'dateEcheance'
  );
  
  const dateAllocISO = formatOttawaISO(dateAllocation);
  const dateEcheanceISO = formatOttawaISO(dateEcheance);

  // 1. Comparer les DATES d'abord (sans heure)
  if (dateAllocISO > dateEcheanceISO) {
    return {
      type: TypeConflict.APRES_ECHEANCE,
      allocationId: allocation.id,
      tacheId: allocation.tacheId,
      traducteurId: allocation.traducteurId,
      date: formatOttawaISO(allocation.date),
      heuresAllouees: allocation.heures,
      heureDebut: allocation.heureDebut,
      heureFin: allocation.heureFin,
      explication: `L'allocation est planifiée après l'échéance ${dateEcheanceISO}`,
      contexte: { echeance: tache.dateEcheance }
    };
  }

  // 2. Si même JOUR, comparer les HEURES (timestamp complet)
  if (dateAllocISO === dateEcheanceISO) {
    // Si l'échéance a une heure précise ET l'allocation a des heures précises
    if (echeanceHasTime && allocation.heureFin) {
      // CRITIQUE: Utiliser toZonedTime pour extraire l'heure en timezone Ottawa
      const dateEcheanceZoned = toZonedTime(dateEcheance, OTTAWA_TIMEZONE);
      const heureEcheance = dateEcheanceZoned.getHours() + dateEcheanceZoned.getMinutes() / 60;
      const finAlloc = parseHeureString(allocation.heureFin);

      if (finAlloc > heureEcheance + 0.01) { // tolérance 0.01h
        return {
          type: TypeConflict.APRES_ECHEANCE,
          allocationId: allocation.id,
          tacheId: allocation.tacheId,
          traducteurId: allocation.traducteurId,
          date: formatOttawaISO(allocation.date),
          heuresAllouees: allocation.heures,
          heureDebut: allocation.heureDebut,
          heureFin: allocation.heureFin,
          explication: `L'allocation se termine à ${allocation.heureFin}, après l'échéance ${formatHeure(heureEcheance)}`,
          contexte: { echeance: tache.dateEcheance }
        };
      }
    }
    // Si l'échéance a une heure précise MAIS l'allocation n'a pas d'heures
    else if (echeanceHasTime && !allocation.heureFin) {
      // Warning: allocation sans heures précises le jour d'une deadline avec heure
      // On peut être plus strict ici si nécessaire
      console.warn(`[Conflit] Allocation sans heures précises le jour de deadline ${dateEcheanceISO}`);
    }
  }

  return null;
}

/**
 * FONCTION PRINCIPALE: Détecte tous les conflits pour un blocage ajouté/modifié
 * 
 * @param blocageId ID du blocage déclencheur
 * @returns Liste de tous les conflits détectés
 */
export async function detecterConflitsBlocage(blocageId: string): Promise<Conflict[]> {
  const conflits: Conflict[] = [];

  // 1. Récupérer le blocage
  const blocage = await prisma.ajustementTemps.findUnique({
    where: { id: blocageId },
    include: { traducteur: true }
  });

  if (!blocage || blocage.type !== 'BLOCAGE') {
    throw new Error(`Blocage ${blocageId} introuvable ou type invalide`);
  }

  // 2. Récupérer toutes les allocations du traducteur pour la même date
  const allocations = await prisma.ajustementTemps.findMany({
    where: {
      traducteurId: blocage.traducteurId,
      date: blocage.date,
      type: 'TACHE'
    }
  });

  // 3. Vérifier chaque allocation
  for (const allocation of allocations) {
    // Chevauchement avec blocage
    const conflitBlocage = await detecterChevauchementBlocage(allocation, blocage.traducteurId);
    if (conflitBlocage) conflits.push(conflitBlocage);

    // Dépassement capacité
    const conflitCapacite = await detecterDepassementCapacite(allocation, blocage.traducteurId);
    if (conflitCapacite) conflits.push(conflitCapacite);

    // Hors horaire
    const conflitHoraire = await detecterHorsHoraire(allocation, blocage.traducteurId);
    if (conflitHoraire) conflits.push(conflitHoraire);

    // Empiète pause
    const conflitPause = detecterEmpietePause(allocation, blocage.traducteurId);
    if (conflitPause) conflits.push(conflitPause);

    // Après échéance
    const conflitEcheance = await detecterApresEcheance(allocation);
    if (conflitEcheance) conflits.push(conflitEcheance);
  }

  return conflits;
}

/**
 * Détecte tous les conflits pour une allocation donnée
 * @param allocationId - ID de l'ajustement de type TACHE
 * @returns Liste des conflits détectés
 */
export async function detecterConflitsAllocation(allocationId: string): Promise<Conflict[]> {
  const conflits: Conflict[] = [];

  // 1. Récupérer l'allocation
  const allocation = await prisma.ajustementTemps.findUnique({
    where: { id: allocationId },
    include: { traducteur: true, tache: true }
  });

  if (!allocation || allocation.type !== 'TACHE') {
    throw new Error(`Allocation ${allocationId} introuvable ou type invalide`);
  }


  // 2. Détecter les différents types de conflits
  
  // Chevauchement avec blocage
  const conflitBlocage = await detecterChevauchementBlocage(allocation, allocation.traducteurId);
  if (conflitBlocage) conflits.push(conflitBlocage);

  // Dépassement capacité
  const conflitCapacite = await detecterDepassementCapacite(allocation, allocation.traducteurId);
  if (conflitCapacite) conflits.push(conflitCapacite);

  // Hors horaire
  const conflitHoraire = await detecterHorsHoraire(allocation, allocation.traducteurId);
  if (conflitHoraire) conflits.push(conflitHoraire);

  // Empiète pause
  const conflitPause = detecterEmpietePause(allocation, allocation.traducteurId);
  if (conflitPause) conflits.push(conflitPause);

  // Après échéance
  const conflitEcheance = await detecterApresEcheance(allocation);
  if (conflitEcheance) conflits.push(conflitEcheance);

  return conflits;
}

// ═══════════════════════════════════════════════════════════════════════
// FONCTIONS D'ANALYSE ET SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calcule le score d'impact d'une suggestion
 */
function calculerScoreImpact(
  heuresDeplacees: number,
  nombreTachesAffectees: number,
  estReattribution: boolean,
  margeEcheanceHeures: number,
  nombrePlages: number
): ScoreImpact {
  const decomposition = {
    heuresDeplacees: Math.min(20, Math.round(heuresDeplacees * 2)),
    nombreTachesAffectees: (nombreTachesAffectees - 1) * 5,
    changementTraducteur: estReattribution ? 15 : 0,
    risqueEcheance: margeEcheanceHeures < 8 ? 30 : margeEcheanceHeures < 24 ? 15 : 5,
    morcellement: (nombrePlages - 1) * 5
  };

  const total = Math.min(100,
    decomposition.heuresDeplacees +
    decomposition.nombreTachesAffectees +
    decomposition.changementTraducteur +
    decomposition.risqueEcheance +
    decomposition.morcellement
  );

  let niveau: NiveauImpact;
  if (total <= 30) niveau = NiveauImpact.FAIBLE;
  else if (total <= 60) niveau = NiveauImpact.MODERE;
  else niveau = NiveauImpact.ELEVE;

  // Générer justification
  const justificationParts: string[] = [];
  if (decomposition.heuresDeplacees > 0) {
    justificationParts.push(`${heuresDeplacees.toFixed(1)}h déplacées`);
  }
  if (estReattribution) {
    justificationParts.push('réattribution à un autre traducteur');
  }
  if (margeEcheanceHeures < 8) {
    justificationParts.push('marge très faible avant échéance');
  }
  if (nombrePlages > 2) {
    justificationParts.push(`répartition sur ${nombrePlages} plages`);
  }

  const justification = `Impact ${niveau.toLowerCase()} : ${justificationParts.join(', ')}.`;

  return {
    total,
    niveau,
    decomposition,
    justification
  };
}

/**
 * Trouve les plages disponibles pour un traducteur
 */
async function trouverPlagesDisponibles(
  traducteurId: string,
  dateDebut: Date,
  dateFin: Date
): Promise<PlageDisponible[]> {
  const plages: PlageDisponible[] = [];
  
  const traducteur = await prisma.traducteur.findUnique({
    where: { id: traducteurId },
    select: { horaire: true, capaciteHeuresParJour: true }
  });

  if (!traducteur) return plages;

  const horaire = parseHoraireTraducteur(traducteur.horaire || '');
  let dateActuelle = new Date(dateDebut);

  while (dateActuelle <= dateFin) {
    // Calculer capacité nette du jour
    const capaciteNette = capaciteNetteJour(horaire, dateActuelle);
    
    // Récupérer les allocations existantes pour ce jour
    const allocationsJour = await prisma.ajustementTemps.findMany({
      where: {
        traducteurId,
        date: dateActuelle,
        type: 'TACHE'
      }
    });
    
    const heuresUtilisees = allocationsJour.reduce((sum, a) => sum + a.heures, 0);
    const capaciteDispo = capaciteNette - heuresUtilisees;

    if (capaciteDispo > 0) {
      plages.push({
        date: formatOttawaISO(dateActuelle),
        heureDebut: formatHeure(horaire.heureDebut),
        heureFin: formatHeure(horaire.heureFin),
        heuresDisponibles: capaciteDispo
      });
    }

    dateActuelle = addDaysOttawa(dateActuelle, 1);
  }

  return plages;
}

/**
 * Génère une suggestion de réparation locale (même traducteur)
 */
async function genererSuggestionReparationLocale(
  conflits: Conflict[],
  tacheId: string
): Promise<Suggestion | null> {
  // Récupérer la tâche
  const tache = await prisma.tache.findUnique({
    where: { id: tacheId },
    select: {
      traducteurId: true,
      heuresTotal: true,
      dateEcheance: true
    }
  });

  if (!tache) return null;

  // Calculer heures affectées par conflits
  const heuresEnConflit = conflits.reduce((sum, c) => sum + c.heuresAllouees, 0);

  // Chercher plages disponibles avant l'échéance
  const plagesDisponibles = await trouverPlagesDisponibles(
    tache.traducteurId,
    new Date(),
    tache.dateEcheance
  );

  const heuresDisponiblesTotal = plagesDisponibles.reduce((sum, p) => sum + p.heuresDisponibles, 0);

  if (heuresDisponiblesTotal < heuresEnConflit) {
    return null; // Impossible en local
  }

  // Calculer score d'impact
  const margeHeures = differenceInDaysOttawa(new Date(), tache.dateEcheance) * 7.5;
  const scoreImpact = calculerScoreImpact(
    heuresEnConflit,
    1,
    false,
    margeHeures,
    plagesDisponibles.length
  );

  return {
    id: `sugg-${Date.now()}-locale`,
    type: TypeSuggestion.REPARATION_LOCALE,
    conflitsResolus: conflits.map(c => c.allocationId),
    tacheId,
    traducteurActuel: tache.traducteurId,
    plagesProposees: plagesDisponibles,
    scoreImpact,
    creeA: new Date(),
    description: `Déplacer ${heuresEnConflit.toFixed(1)}h sur ${plagesDisponibles.length} plages disponibles (même traducteur)`
  };
}

/**
 * Recherche des traducteurs alternatifs disponibles
 */
async function rechercherTraducteursAlternatifs(
  tacheId: string,
  heuresNecessaires: number,
  dateEcheance: Date
): Promise<CandidatReattribution[]> {
  const candidats: CandidatReattribution[] = [];

  // Récupérer la tâche pour connaître le traducteur actuel
  const tache = await prisma.tache.findUnique({
    where: { id: tacheId },
    select: { traducteurId: true }
  });

  if (!tache) return candidats;

  // Récupérer tous les traducteurs actifs sauf le traducteur actuel (limiter à 5 pour performance)
  const traducteurs = await prisma.traducteur.findMany({
    where: {
      actif: true,
      id: { not: tache.traducteurId }
    },
    select: {
      id: true,
      nom: true,
      horaire: true,
      capaciteHeuresParJour: true
    },
    take: 5
  });

  // Évaluer chaque traducteur
  for (const traducteur of traducteurs) {
    const plagesDisponibles = await trouverPlagesDisponibles(
      traducteur.id,
      new Date(),
      dateEcheance
    );

    const heuresDisponiblesTotal = plagesDisponibles.reduce((sum, p) => sum + p.heuresDisponibles, 0);

    if (heuresDisponiblesTotal >= heuresNecessaires) {
      candidats.push({
        traducteurId: traducteur.id,
        traducteurNom: traducteur.nom,
        heuresDisponiblesTotal,
        plagesDisponibles,
        peutCompleterAvantEcheance: true,
        score: Math.min(100, (heuresDisponiblesTotal / heuresNecessaires) * 100)
      });
    }
  }

  // Trier par score décroissant
  candidats.sort((a, b) => b.score - a.score);

  return candidats;
}

/**
 * Génère une suggestion de réattribution (autre traducteur)
 */
async function genererSuggestionReattribution(
  conflits: Conflict[],
  tacheId: string
): Promise<Suggestion | null> {
  // Récupérer la tâche
  const tache = await prisma.tache.findUnique({
    where: { id: tacheId },
    select: {
      traducteurId: true,
      heuresTotal: true,
      dateEcheance: true
    }
  });

  if (!tache) return null;

  const heuresEnConflit = conflits.reduce((sum, c) => sum + c.heuresAllouees, 0);

  // Rechercher traducteurs alternatifs
  const candidats = await rechercherTraducteursAlternatifs(
    tacheId,
    heuresEnConflit,
    tache.dateEcheance
  );

  if (candidats.length === 0) {
    return null; // Aucun traducteur disponible
  }

  const meilleurCandidat = candidats[0];

  // Calculer score d'impact (plus élevé car changement de traducteur)
  const margeHeures = differenceInDaysOttawa(new Date(), tache.dateEcheance) * 7.5;
  const scoreImpact = calculerScoreImpact(
    heuresEnConflit,
    1,
    true, // Réattribution = impact plus élevé
    margeHeures,
    meilleurCandidat.plagesDisponibles.length
  );

  return {
    id: `sugg-${Date.now()}-reattr`,
    type: TypeSuggestion.REATTRIBUTION,
    conflitsResolus: conflits.map(c => c.allocationId),
    tacheId,
    traducteurActuel: tache.traducteurId,
    traducteurPropose: meilleurCandidat.traducteurId,
    plagesProposees: meilleurCandidat.plagesDisponibles,
    candidatsAlternatifs: candidats.slice(0, 3), // Top 3 candidats
    scoreImpact,
    creeA: new Date(),
    description: `Réattribuer ${heuresEnConflit.toFixed(1)}h à ${meilleurCandidat.traducteurNom} (${meilleurCandidat.heuresDisponiblesTotal.toFixed(1)}h disponibles)`
  };
}

/**
 * Génère une suggestion IMPOSSIBLE (aucune solution)
 */
async function genererSuggestionImpossible(
  conflits: Conflict[],
  tacheId: string
): Promise<Suggestion> {
  const tache = await prisma.tache.findUnique({
    where: { id: tacheId },
    select: {
      traducteurId: true,
      heuresTotal: true,
      dateEcheance: true
    }
  });

  const heuresEnConflit = conflits.reduce((sum, c) => sum + c.heuresAllouees, 0);

  // Impact maximum pour une situation impossible
  const scoreImpact = calculerScoreImpact(
    heuresEnConflit,
    1,
    false,
    0, // Aucune marge
    0  // Aucune plage
  );
  scoreImpact.total = 100;
  scoreImpact.niveau = NiveauImpact.ELEVE;
  scoreImpact.justification = `IMPOSSIBLE : Aucune solution trouvée pour ${heuresEnConflit.toFixed(1)}h avant l'échéance.`;

  return {
    id: `sugg-${Date.now()}-impossible`,
    type: TypeSuggestion.IMPOSSIBLE,
    conflitsResolus: conflits.map(c => c.allocationId),
    tacheId,
    traducteurActuel: tache?.traducteurId || '',
    plagesProposees: [],
    scoreImpact,
    creeA: new Date(),
    description: `IMPOSSIBLE : ${heuresEnConflit.toFixed(1)}h en conflit, aucune plage disponible avant l'échéance. Action manuelle requise.`
  };
}

/**
 * FONCTION PRINCIPALE: Génère des suggestions pour résoudre les conflits
 * 
 * @param conflits Liste des conflits détectés
 * @returns Liste des suggestions possibles
 */
export async function genererSuggestions(conflits: Conflict[]): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];

  if (conflits.length === 0) return suggestions;

  // Grouper les conflits par tâche (ignorer ceux sans tâche)
  const conflitsParTache = new Map<string, Conflict[]>();
  for (const conflit of conflits) {
    if (!conflit.tacheId) continue; // Ignorer les conflits sans tâche associée
    if (!conflitsParTache.has(conflit.tacheId)) {
      conflitsParTache.set(conflit.tacheId, []);
    }
    conflitsParTache.get(conflit.tacheId)!.push(conflit);
  }

  // Générer suggestions pour chaque tâche
  for (const [tacheId, conflitsTache] of conflitsParTache) {
    const suggestionsPourTache: Suggestion[] = [];

    // 1. Tenter réparation locale
    const suggestionLocale = await genererSuggestionReparationLocale(conflitsTache, tacheId);
    if (suggestionLocale) {
      suggestionsPourTache.push(suggestionLocale);
    }

    // 2. Tenter réattribution (même si réparation locale possible, donner le choix)
    const suggestionReattribution = await genererSuggestionReattribution(conflitsTache, tacheId);
    if (suggestionReattribution) {
      suggestionsPourTache.push(suggestionReattribution);
    }

    // 3. Si aucune solution trouvée, marquer comme IMPOSSIBLE
    if (suggestionsPourTache.length === 0) {
      const suggestionImpossible = await genererSuggestionImpossible(conflitsTache, tacheId);
      suggestionsPourTache.push(suggestionImpossible);
    }

    suggestions.push(...suggestionsPourTache);
  }

  return suggestions;
}

/**
 * FONCTION PRINCIPALE: Génère un rapport complet de détection et suggestions
 * 
 * @param blocageId ID du blocage déclencheur
 * @returns Rapport complet avec conflits et suggestions
 */
export async function genererRapportConflits(blocageId: string): Promise<RapportConflits> {
  const blocage = await prisma.ajustementTemps.findUnique({
    where: { id: blocageId }
  });

  if (!blocage || blocage.type !== 'BLOCAGE') {
    throw new Error(`Blocage ${blocageId} introuvable`);
  }

  // Détection
  const conflitsDetectes = await detecterConflitsBlocage(blocageId);

  // Suggestions
  const suggestions = await genererSuggestions(conflitsDetectes);

  return {
    declencheur: {
      type: 'BLOCAGE',
      blocageId: blocage.id,
      traducteurId: blocage.traducteurId,
      dateDebut: blocage.date,
      dateFin: blocage.date
    },
    conflitsDetectes,
    suggestions,
    genereLe: new Date()
  };
}
