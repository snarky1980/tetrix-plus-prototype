/**
 * TETRIX MASTER OPTIMIZER
 * 
 * Module expert d'analyse et d'optimisation de la charge de travail
 * Respecte les règles métier BT, profils TR1/TR2/TR3, capacités, blocages,
 * domaines, paires linguistiques et modes de répartition.
 */

import prisma from '../config/database';
import { addDays, differenceInDays } from 'date-fns';
import { estWeekend } from './planificationService';
import { parseOttawaDateISO, formatOttawaISO } from '../utils/dateTimeOttawa';

// ============================================================================
// TYPES ET INTERFACES
// ============================================================================

export interface ResumeExecutif {
  problemePrincipal: string;
  niveauRisque: 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';
  objectif: string;
  metriquesClés: {
    traducteursSurcharges: number;
    tachesEnRisque: number;
    capaciteGaspillee: number;
    scoreEquilibre: number;
  };
}

export interface DiagnosticComplet {
  capacites: AnalyseCapacite[];
  echeances: AnalyseEcheance[];
  conflits: AnalyseConflit[];
  conformite: AnalyseConformite[];
  opportunites: AnalyseOpportunite[];
}

export interface AnalyseCapacite {
  traducteurId: string;
  traducteurNom: string;
  profil: 'TR1' | 'TR2' | 'TR3';
  type: 'SURCHARGE' | 'SOUS_UTILISATION' | 'BLOCAGE_PROBLEMATIQUE' | 'CUMUL_CRITIQUE';
  gravite: 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';
  description: string;
  metriques: {
    capaciteJournaliere: number;
    heuresAssignees: number;
    heuresBlocages: number;
    tauxUtilisation: number;
    joursProblematiques: number;
  };
  impact: string;
  datesConcernees?: string[];
}

export interface AnalyseEcheance {
  tacheId: string;
  numeroProjet: string;
  dateEcheance: string;
  type: 'RISQUE_RETARD' | 'SURCHARGE_VEILLE' | 'ABSENCE_MARGE';
  gravite: 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';
  description: string;
  traducteurConcerne: string;
  heuresRestantes: number;
  joursDisponibles: number;
  tauxRemplissageVeille: number;
  recommandation: string;
}

export interface AnalyseConflit {
  traducteurId: string;
  traducteurNom: string;
  type: 'MULTI_TACHES_MEME_JOUR' | 'FRAGMENTATION_EXCESSIVE' | 'PIC_JAT';
  gravite: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  description: string;
  tachesConcernees: string[];
  datesConcernees: string[];
  impact: string;
}

export interface AnalyseConformite {
  problemeId: string;
  type: 'PROFIL_INCOMPATIBLE' | 'DOMAINE_INADAPTE' | 'PAIRE_LINGUISTIQUE' | 'TR1_NON_REVISE';
  gravite: 'ELEVE' | 'CRITIQUE';
  description: string;
  tacheId?: string;
  traducteurId?: string;
  regleViolee: string;
  correction: string;
}

export interface AnalyseOpportunite {
  type: 'CHANGEMENT_MODE' | 'REASSIGNATION' | 'LIBERATION_TR3' | 'REDISTRIBUTION';
  description: string;
  beneficeAttendu: string;
  effortRequis: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  tacheConcernee?: string;
  traducteurSource?: string;
  traducteurCible?: string;
}

export interface Recommandation {
  id: string;
  priorite: 1 | 2 | 3;
  type: 'CORRECTION_IMMEDIATE' | 'AMELIORATION' | 'OPTIMISATION';
  titre: string;
  description: string;
  actionConcrete: string;
  impactAttendu: string;
  tachesAffectees?: string[];
  traducteursAffectes?: string[];
}

export interface ScenarioAlternatif {
  mode: 'JAT' | 'FIFO' | 'EQUILIBRE' | 'MANUEL';
  score: number;
  avantages: string[];
  inconvenients: string[];
  recommande: boolean;
  metriques: {
    tauxUtilisationMoyen: number;
    ecartType: number;
    joursDepassement: number;
  };
}

export interface ExempleRedistribution {
  jour: string;
  avant: { traducteur: string; heures: number }[];
  apres: { traducteur: string; heures: number }[];
  amelioration: string;
}

export interface TetrixMasterAnalyse {
  resumeExecutif: ResumeExecutif;
  diagnosticComplet: DiagnosticComplet;
  recommandations: Recommandation[];
  scenariosAlternatifs: ScenarioAlternatif[];
  exemplesRedistribution: ExempleRedistribution[];
  explicationPedagogique: string;
  horodatage: string;
}

// ============================================================================
// FONCTION PRINCIPALE D'ANALYSE
// ============================================================================

export async function analyserAvecTetrixMaster(
  dateDebut: Date,
  dateFin: Date
): Promise<TetrixMasterAnalyse> {
  
  // 1. Récupérer toutes les données nécessaires
  const donnees = await collecterDonnees(dateDebut, dateFin);
  
  // 2. Analyser les capacités
  const analysesCapacite = analyserCapacites(donnees, dateDebut, dateFin);
  
  // 3. Analyser les échéances
  const analysesEcheance = analyserEcheances(donnees, dateDebut, dateFin);
  
  // 4. Analyser les conflits multi-tâches
  const analysesConflit = analyserConflits(donnees, dateDebut, dateFin);
  
  // 5. Vérifier la conformité métier
  const analysesConformite = verifierConformite(donnees);
  
  // 6. Identifier les opportunités
  const opportunites = identifierOpportunites(donnees, analysesCapacite, analysesEcheance);
  
  // 7. Générer les recommandations priorisées
  const recommandations = genererRecommandations(
    analysesCapacite,
    analysesEcheance,
    analysesConflit,
    analysesConformite,
    opportunites
  );
  
  // 8. Simuler les scénarios alternatifs
  const scenarios = simulerScenarios(donnees, dateDebut, dateFin);
  
  // 9. Créer des exemples de redistribution
  const exemples = creerExemplesRedistribution(donnees, recommandations);
  
  // 10. Générer le résumé exécutif
  const resume = genererResumeExecutif(
    analysesCapacite,
    analysesEcheance,
    analysesConformite,
    recommandations
  );
  
  // 11. Explication pédagogique
  const explication = genererExplicationPedagogique(resume, recommandations);
  
  return {
    resumeExecutif: resume,
    diagnosticComplet: {
      capacites: analysesCapacite,
      echeances: analysesEcheance,
      conflits: analysesConflit,
      conformite: analysesConformite,
      opportunites,
    },
    recommandations,
    scenariosAlternatifs: scenarios,
    exemplesRedistribution: exemples,
    explicationPedagogique: explication,
    horodatage: new Date().toISOString(),
  };
}

// ============================================================================
// COLLECTE DE DONNÉES
// ============================================================================

interface DonneesAnalyse {
  traducteurs: any[];
  taches: any[];
  joursOuvrables: Date[];
  capaciteTotale: number;
  heuresAssignees: number;
}

async function collecterDonnees(dateDebut: Date, dateFin: Date): Promise<DonneesAnalyse> {
  // Récupérer tous les traducteurs actifs avec leurs données
  const traducteurs = await prisma.traducteur.findMany({
    where: { actif: true },
    include: {
      taches: {
        where: {
          statut: { in: ['PLANIFIEE', 'EN_COURS'] },
          OR: [
            {
              ajustementsTemps: {
                some: {
                  date: { gte: dateDebut, lte: dateFin },
                  type: 'TACHE',
                },
              },
            },
            {
              dateEcheance: { gte: dateDebut, lte: dateFin },
            },
          ],
        },
        include: {
          ajustementsTemps: {
            where: {
              date: { gte: dateDebut, lte: dateFin },
              type: 'TACHE',
            },
          },
        },
      },
      ajustementsTemps: {
        where: {
          date: { gte: dateDebut, lte: dateFin },
          type: 'BLOCAGE',
        },
      },
      pairesLinguistiques: true,
    },
  });

  // Calculer les jours ouvrables
  const joursOuvrables: Date[] = [];
  let currentDate = new Date(dateDebut);
  while (currentDate <= dateFin) {
    if (!estWeekend(currentDate)) {
      joursOuvrables.push(new Date(currentDate));
    }
    currentDate = addDays(currentDate, 1);
  }

  // Récupérer toutes les tâches de la période
  const taches = await prisma.tache.findMany({
    where: {
      statut: { in: ['PLANIFIEE', 'EN_COURS'] },
      dateEcheance: { gte: dateDebut, lte: dateFin },
    },
    include: {
      traducteur: true,
      ajustementsTemps: {
        where: {
          date: { gte: dateDebut, lte: dateFin },
          type: 'TACHE',
        },
      },
      client: true,
      sousDomaine: true,
      paireLinguistique: true,
    },
  });

  const capaciteTotale = traducteurs.reduce(
    (sum, t) => sum + t.capaciteHeuresParJour * joursOuvrables.length,
    0
  );

  const heuresAssignees = taches.reduce(
    (sum, t) => sum + t.heuresTotal,
    0
  );

  return {
    traducteurs,
    taches,
    joursOuvrables,
    capaciteTotale,
    heuresAssignees,
  };
}

// ============================================================================
// ANALYSE DES CAPACITÉS
// ============================================================================

function analyserCapacites(
  donnees: DonneesAnalyse,
  dateDebut: Date,
  dateFin: Date
): AnalyseCapacite[] {
  const analyses: AnalyseCapacite[] = [];

  donnees.traducteurs.forEach((trad) => {
    const capaciteJournaliere = trad.capaciteHeuresParJour;
    const joursDisponibles = donnees.joursOuvrables.length;
    const capaciteTotale = capaciteJournaliere * joursDisponibles;

    // Calculer les heures assignées
    const heuresAssignees = trad.taches.reduce((sum: number, tache: any) => {
      const heuresPeriode = tache.ajustementsTemps.reduce(
        (s: number, aj: any) => s + aj.heures,
        0
      );
      return sum + heuresPeriode;
    }, 0);

    // Calculer les heures de blocages
    const heuresBlocages = trad.ajustementsTemps.reduce(
      (sum: number, aj: any) => sum + aj.heures,
      0
    );

    const capaciteEffective = capaciteTotale - heuresBlocages;
    const tauxUtilisation = capaciteEffective > 0 
      ? (heuresAssignees / capaciteEffective) * 100 
      : 0;

    // Identifier les jours problématiques
    const joursProblematiques: Set<string> = new Set();
    
    // Vérifier jour par jour
    donnees.joursOuvrables.forEach((jour) => {
      const jourStr = formatOttawaISO(jour);
      let heuresJour = 0;
      
      trad.taches.forEach((tache: any) => {
        tache.ajustementsTemps.forEach((aj: any) => {
          if (formatOttawaISO(aj.date) === jourStr) {
            heuresJour += aj.heures;
          }
        });
      });
      
      const blocagesJour = trad.ajustementsTemps
        .filter((aj: any) => formatOttawaISO(aj.date) === jourStr)
        .reduce((sum: number, aj: any) => sum + aj.heures, 0);
      
      if (heuresJour + blocagesJour > capaciteJournaliere * 1.1) {
        joursProblematiques.add(jourStr);
      }
    });

    // Déterminer le type de problème
    let type: AnalyseCapacite['type'] | null = null;
    let gravite: AnalyseCapacite['gravite'] = 'FAIBLE';
    let description = '';
    let impact = '';

    if (tauxUtilisation > 100) {
      type = 'SURCHARGE';
      gravite = tauxUtilisation > 120 ? 'CRITIQUE' : tauxUtilisation > 110 ? 'ELEVE' : 'MOYEN';
      description = `${trad.nom} (${trad.classification || 'TR2'}) est surchargé à ${tauxUtilisation.toFixed(0)}%`;
      impact = `${(heuresAssignees - capaciteEffective).toFixed(1)}h de surcharge sur la période`;
    } else if (joursProblematiques.size > 0) {
      type = 'CUMUL_CRITIQUE';
      gravite = joursProblematiques.size > 3 ? 'ELEVE' : 'MOYEN';
      description = `${trad.nom} a ${joursProblematiques.size} jour(s) avec surcharge`;
      impact = `Risque de retard et qualité compromise`;
    } else if (heuresBlocages > capaciteTotale * 0.3) {
      type = 'BLOCAGE_PROBLEMATIQUE';
      gravite = 'MOYEN';
      description = `${trad.nom} a ${heuresBlocages.toFixed(1)}h de blocages (${((heuresBlocages/capaciteTotale)*100).toFixed(0)}%)`;
      impact = `Capacité effective réduite significativement`;
    } else if (tauxUtilisation < 50 && heuresAssignees > 0) {
      type = 'SOUS_UTILISATION';
      gravite = 'FAIBLE';
      description = `${trad.nom} (${trad.classification || 'TR2'}) est sous-utilisé à ${tauxUtilisation.toFixed(0)}%`;
      impact = `${(capaciteEffective - heuresAssignees).toFixed(1)}h de capacité disponible`;
    }

    if (type) {
      analyses.push({
        traducteurId: trad.id,
        traducteurNom: trad.nom,
        profil: (trad.classification || 'TR2') as 'TR1' | 'TR2' | 'TR3',
        type,
        gravite,
        description,
        metriques: {
          capaciteJournaliere,
          heuresAssignees,
          heuresBlocages,
          tauxUtilisation: Math.round(tauxUtilisation * 10) / 10,
          joursProblematiques: joursProblematiques.size,
        },
        impact,
        datesConcernees: Array.from(joursProblematiques),
      });
    }
  });

  return analyses.sort((a, b) => {
    const graviteOrdre = { CRITIQUE: 4, ELEVE: 3, MOYEN: 2, FAIBLE: 1 };
    return graviteOrdre[b.gravite] - graviteOrdre[a.gravite];
  });
}

// ============================================================================
// ANALYSE DES ÉCHÉANCES
// ============================================================================

function analyserEcheances(
  donnees: DonneesAnalyse,
  dateDebut: Date,
  dateFin: Date
): AnalyseEcheance[] {
  const analyses: AnalyseEcheance[] = [];
  const maintenant = new Date();

  donnees.taches.forEach((tache) => {
    const dateEcheance = new Date(tache.dateEcheance);
    const joursRestants = differenceInDays(dateEcheance, maintenant);
    
    if (joursRestants < 0) return; // Tâche déjà échue

    const heuresRealisees = tache.ajustementsTemps.reduce(
      (sum: number, aj: any) => sum + aj.heures,
      0
    );
    const heuresRestantes = tache.heuresTotal - heuresRealisees;

    // Calculer la charge du traducteur la veille de l'échéance
    const veille = addDays(dateEcheance, -1);
    const veilleStr = formatOttawaISO(veille);
    
    let heuresVeille = 0;
    if (tache.traducteur) {
      tache.traducteur.taches.forEach((t: any) => {
        t.ajustementsTemps.forEach((aj: any) => {
          if (formatOttawaISO(aj.date) === veilleStr) {
            heuresVeille += aj.heures;
          }
        });
      });
    }

    const capaciteJournaliere = tache.traducteur?.capaciteHeuresParJour || 6;
    const tauxRemplissageVeille = (heuresVeille / capaciteJournaliere) * 100;

    // Déterminer les risques
    let type: AnalyseEcheance['type'] | null = null;
    let gravite: AnalyseEcheance['gravite'] = 'FAIBLE';
    let description = '';
    let recommandation = '';

    if (heuresRestantes > 0 && joursRestants === 0) {
      type = 'RISQUE_RETARD';
      gravite = 'CRITIQUE';
      description = `Tâche ${tache.numeroProjet} échue aujourd'hui avec ${heuresRestantes.toFixed(1)}h restantes`;
      recommandation = 'Action immédiate requise: réassigner ou négocier délai';
    } else if (heuresRestantes > capaciteJournaliere * joursRestants) {
      type = 'RISQUE_RETARD';
      gravite = joursRestants <= 1 ? 'ELEVE' : 'MOYEN';
      description = `Tâche ${tache.numeroProjet}: ${heuresRestantes.toFixed(1)}h restantes pour ${joursRestants} jour(s)`;
      recommandation = `Nécessite ${(heuresRestantes/joursRestants).toFixed(1)}h/jour (capacité: ${capaciteJournaliere}h)`;
    } else if (tauxRemplissageVeille > 80 && heuresRestantes > 0) {
      type = 'SURCHARGE_VEILLE';
      gravite = 'MOYEN';
      description = `Veille d'échéance chargée à ${tauxRemplissageVeille.toFixed(0)}% pour ${tache.numeroProjet}`;
      recommandation = 'Anticiper le travail sur les jours précédents';
    } else if (joursRestants <= 2 && heuresRestantes > 0) {
      type = 'ABSENCE_MARGE';
      gravite = 'FAIBLE';
      description = `Peu de marge pour ${tache.numeroProjet} (échéance dans ${joursRestants}j)`;
      recommandation = 'Surveiller l\'avancement quotidien';
    }

    if (type) {
      analyses.push({
        tacheId: tache.id,
        numeroProjet: tache.numeroProjet,
        dateEcheance: formatOttawaISO(dateEcheance),
        type,
        gravite,
        description,
        traducteurConcerne: tache.traducteur?.nom || 'Non assigné',
        heuresRestantes,
        joursDisponibles: joursRestants,
        tauxRemplissageVeille: Math.round(tauxRemplissageVeille),
        recommandation,
      });
    }
  });

  return analyses.sort((a, b) => {
    const graviteOrdre = { CRITIQUE: 4, ELEVE: 3, MOYEN: 2, FAIBLE: 1 };
    return graviteOrdre[b.gravite] - graviteOrdre[a.gravite];
  });
}

// ============================================================================
// ANALYSE DES CONFLITS (simplifié pour l'instant)
// ============================================================================

function analyserConflits(
  donnees: DonneesAnalyse,
  dateDebut: Date,
  dateFin: Date
): AnalyseConflit[] {
  const analyses: AnalyseConflit[] = [];
  
  // TODO: Implémenter analyse détaillée des conflits multi-tâches
  
  return analyses;
}

// ============================================================================
// VÉRIFICATION CONFORMITÉ MÉTIER
// ============================================================================

function verifierConformite(donnees: DonneesAnalyse): AnalyseConformite[] {
  const problemes: AnalyseConformite[] = [];

  donnees.taches.forEach((tache) => {
    const traducteur = tache.traducteur;
    if (!traducteur) return;

    const profil = traducteur.classification || 'TR2';

    // Règle 1: TR1/TR2 ne peuvent pas réviser
    if (tache.typeTache === 'REVISION' && (profil === 'TR1' || profil === 'TR2')) {
      problemes.push({
        problemeId: `conf-${tache.id}-profil`,
        type: 'PROFIL_INCOMPATIBLE',
        gravite: 'CRITIQUE',
        description: `Tâche ${tache.numeroProjet}: ${profil} assigné à une révision`,
        tacheId: tache.id,
        traducteurId: traducteur.id,
        regleViolee: `Seuls les TR3 peuvent réviser`,
        correction: `Réassigner à un TR3 disponible`,
      });
    }

    // Règle 2: Vérifier compatibilité domaine (simplifié - specialisations est un tableau de strings)
    // TODO: Améliorer cette vérification si le modèle évolue
    // Pour l'instant, on considère que les domaines du traducteur couvrent les spécialisations

    // Règle 3: Vérifier paire linguistique
    if (tache.paireLinguistique) {
      const paires = traducteur.pairesLinguistiques || [];
      const compatible = paires.some(
        (paire: any) => paire.id === tache.paireLinguistiqueId
      );
      
      if (!compatible && paires.length > 0) {
        problemes.push({
          problemeId: `conf-${tache.id}-langue`,
          type: 'PAIRE_LINGUISTIQUE',
          gravite: 'ELEVE',
          description: `${traducteur.nom} n'a pas la paire ${tache.paireLinguistique.langueSource}→${tache.paireLinguistique.langueCible}`,
          tacheId: tache.id,
          traducteurId: traducteur.id,
          regleViolee: 'Respect des paires linguistiques',
          correction: 'Réassigner à un traducteur avec cette paire',
        });
      }
    }
  });

  return problemes;
}

// ============================================================================
// IDENTIFICATION OPPORTUNITÉS (simplifié)
// ============================================================================

function identifierOpportunites(
  donnees: DonneesAnalyse,
  capacites: AnalyseCapacite[],
  echeances: AnalyseEcheance[]
): AnalyseOpportunite[] {
  const opportunites: AnalyseOpportunite[] = [];

  // Opportunité: libérer les TR3 surchargés en traduction
  capacites.forEach((cap) => {
    if (cap.profil === 'TR3' && cap.type === 'SURCHARGE') {
      const trad = donnees.traducteurs.find((t) => t.id === cap.traducteurId);
      if (trad) {
        const tachesTraduction = trad.taches.filter((t: any) => t.typeTache === 'TRADUCTION');
        if (tachesTraduction.length > 0) {
          opportunites.push({
            type: 'LIBERATION_TR3',
            description: `Libérer ${cap.traducteurNom} de traductions pour prioriser les révisions`,
            beneficeAttendu: 'Respect du rôle TR3 et amélioration qualité',
            effortRequis: 'MOYEN',
            traducteurSource: cap.traducteurId,
          });
        }
      }
    }
  });

  // Opportunité: réassignation pour sous-utilisation
  const surcharges = capacites.filter((c) => c.type === 'SURCHARGE');
  const sousUtilises = capacites.filter((c) => c.type === 'SOUS_UTILISATION');

  if (surcharges.length > 0 && sousUtilises.length > 0) {
    opportunites.push({
      type: 'REASSIGNATION',
      description: `${surcharges.length} traducteur(s) surchargé(s) et ${sousUtilises.length} sous-utilisé(s)`,
      beneficeAttendu: 'Meilleur équilibre de charge',
      effortRequis: 'FAIBLE',
    });
  }

  return opportunites;
}

// ============================================================================
// GÉNÉRATION RECOMMANDATIONS
// ============================================================================

function genererRecommandations(
  capacites: AnalyseCapacite[],
  echeances: AnalyseEcheance[],
  conflits: AnalyseConflit[],
  conformite: AnalyseConformite[],
  opportunites: AnalyseOpportunite[]
): Recommandation[] {
  const recommandations: Recommandation[] = [];
  let idCounter = 1;

  // PRIORITÉ 1: Corrections immédiates (conformité + risques critiques)
  conformite.forEach((conf) => {
    recommandations.push({
      id: `rec-${idCounter++}`,
      priorite: 1,
      type: 'CORRECTION_IMMEDIATE',
      titre: conf.type,
      description: conf.description,
      actionConcrete: conf.correction,
      impactAttendu: 'Respect des règles métier BT',
      tachesAffectees: conf.tacheId ? [conf.tacheId] : [],
      traducteursAffectes: conf.traducteurId ? [conf.traducteurId] : [],
    });
  });

  echeances
    .filter((e) => e.gravite === 'CRITIQUE' || e.gravite === 'ELEVE')
    .forEach((ech) => {
      recommandations.push({
        id: `rec-${idCounter++}`,
        priorite: 1,
        type: 'CORRECTION_IMMEDIATE',
        titre: 'Risque échéance',
        description: ech.description,
        actionConcrete: ech.recommandation,
        impactAttendu: 'Éviter retard de livraison',
        tachesAffectees: [ech.tacheId],
      });
    });

  capacites
    .filter((c) => c.gravite === 'CRITIQUE')
    .forEach((cap) => {
      recommandations.push({
        id: `rec-${idCounter++}`,
        priorite: 1,
        type: 'CORRECTION_IMMEDIATE',
        titre: 'Surcharge critique',
        description: cap.description,
        actionConcrete: `Réduire immédiatement la charge de ${cap.traducteurNom}`,
        impactAttendu: cap.impact,
        traducteursAffectes: [cap.traducteurId],
      });
    });

  // PRIORITÉ 2: Améliorations recommandées
  capacites
    .filter((c) => c.gravite === 'ELEVE' || c.gravite === 'MOYEN')
    .slice(0, 5)
    .forEach((cap) => {
      recommandations.push({
        id: `rec-${idCounter++}`,
        priorite: 2,
        type: 'AMELIORATION',
        titre: cap.type,
        description: cap.description,
        actionConcrete: `Rééquilibrer la charge de ${cap.traducteurNom}`,
        impactAttendu: cap.impact,
        traducteursAffectes: [cap.traducteurId],
      });
    });

  // PRIORITÉ 3: Optimisations optionnelles
  opportunites.forEach((opp) => {
    recommandations.push({
      id: `rec-${idCounter++}`,
      priorite: 3,
      type: 'OPTIMISATION',
      titre: opp.type,
      description: opp.description,
      actionConcrete: `Effort: ${opp.effortRequis}`,
      impactAttendu: opp.beneficeAttendu,
      traducteursAffectes: opp.traducteurSource ? [opp.traducteurSource] : [],
    });
  });

  return recommandations.sort((a, b) => a.priorite - b.priorite);
}

// ============================================================================
// SIMULATION SCÉNARIOS (simplifié)
// ============================================================================

function simulerScenarios(
  donnees: DonneesAnalyse,
  dateDebut: Date,
  dateFin: Date
): ScenarioAlternatif[] {
  // Pour l'instant, retourner une structure basique
  return [
    {
      mode: 'JAT',
      score: 75,
      avantages: ['Livraison au plus tard', 'Flexibilité maximale'],
      inconvenients: ['Risque de surcharge de dernière minute'],
      recommande: false,
      metriques: {
        tauxUtilisationMoyen: 85,
        ecartType: 25,
        joursDepassement: 3,
      },
    },
    {
      mode: 'EQUILIBRE',
      score: 90,
      avantages: ['Charge équilibrée', 'Moins de stress'],
      inconvenients: ['Moins de flexibilité'],
      recommande: true,
      metriques: {
        tauxUtilisationMoyen: 80,
        ecartType: 12,
        joursDepassement: 0,
      },
    },
  ];
}

// ============================================================================
// EXEMPLES REDISTRIBUTION (simplifié)
// ============================================================================

function creerExemplesRedistribution(
  donnees: DonneesAnalyse,
  recommandations: Recommandation[]
): ExempleRedistribution[] {
  // Pour l'instant, retourner une structure vide
  return [];
}

// ============================================================================
// RÉSUMÉ EXÉCUTIF
// ============================================================================

function genererResumeExecutif(
  capacites: AnalyseCapacite[],
  echeances: AnalyseEcheance[],
  conformite: AnalyseConformite[],
  recommandations: Recommandation[]
): ResumeExecutif {
  const surcharges = capacites.filter((c) => c.type === 'SURCHARGE');
  const risquesCritiques = echeances.filter((e) => e.gravite === 'CRITIQUE' || e.gravite === 'ELEVE');
  const sousUtilises = capacites.filter((c) => c.type === 'SOUS_UTILISATION');
  
  let problemePrincipal = 'Planification équilibrée';
  let niveauRisque: ResumeExecutif['niveauRisque'] = 'FAIBLE';
  let objectif = 'Maintenir le niveau actuel';

  if (conformite.length > 0) {
    problemePrincipal = `${conformite.length} problème(s) de conformité métier détecté(s)`;
    niveauRisque = 'CRITIQUE';
    objectif = 'Corriger immédiatement les violations de règles';
  } else if (risquesCritiques.length > 0) {
    problemePrincipal = `${risquesCritiques.length} tâche(s) en risque d'échéance`;
    niveauRisque = 'ELEVE';
    objectif = 'Sécuriser les livraisons imminentes';
  } else if (surcharges.length > 0) {
    problemePrincipal = `${surcharges.length} traducteur(s) en surcharge`;
    niveauRisque = surcharges.some((s) => s.gravite === 'CRITIQUE') ? 'CRITIQUE' : 'MOYEN';
    objectif = 'Rééquilibrer la charge de travail';
  } else if (sousUtilises.length > 3) {
    problemePrincipal = 'Capacité sous-utilisée';
    niveauRisque = 'FAIBLE';
    objectif = 'Optimiser l\'utilisation des ressources';
  }

  const capaciteGaspillee = sousUtilises.reduce(
    (sum, s) => sum + (s.metriques.capaciteJournaliere * s.metriques.joursProblematiques - s.metriques.heuresAssignees),
    0
  );

  // Calculer score d'équilibre
  const tauxUtilisations = capacites.map((c) => c.metriques.tauxUtilisation);
  const moyenne = tauxUtilisations.reduce((a, b) => a + b, 0) / tauxUtilisations.length;
  const variance = tauxUtilisations.reduce((sum, val) => sum + Math.pow(val - moyenne, 2), 0) / tauxUtilisations.length;
  const ecartType = Math.sqrt(variance);
  const scoreEquilibre = Math.max(0, Math.min(100, 100 - ecartType));

  return {
    problemePrincipal,
    niveauRisque,
    objectif,
    metriquesClés: {
      traducteursSurcharges: surcharges.length,
      tachesEnRisque: risquesCritiques.length,
      capaciteGaspillee: Math.round(capaciteGaspillee * 10) / 10,
      scoreEquilibre: Math.round(scoreEquilibre),
    },
  };
}

// ============================================================================
// EXPLICATION PÉDAGOGIQUE
// ============================================================================

function genererExplicationPedagogique(
  resume: ResumeExecutif,
  recommandations: Recommandation[]
): string {
  let explication = `## Analyse de la planification\n\n`;
  
  explication += `**Situation actuelle :** ${resume.problemePrincipal}\n\n`;
  explication += `**Niveau de risque :** ${resume.niveauRisque}\n\n`;
  explication += `**Objectif prioritaire :** ${resume.objectif}\n\n`;

  explication += `### Métriques clés\n\n`;
  explication += `- **Score d'équilibre :** ${resume.metriquesClés.scoreEquilibre}/100\n`;
  explication += `- **Traducteurs en surcharge :** ${resume.metriquesClés.traducteursSurcharges}\n`;
  explication += `- **Tâches en risque d'échéance :** ${resume.metriquesClés.tachesEnRisque}\n`;
  explication += `- **Capacité non utilisée :** ${resume.metriquesClés.capaciteGaspillee}h\n\n`;

  const priorite1 = recommandations.filter((r) => r.priorite === 1);
  if (priorite1.length > 0) {
    explication += `### Actions immédiates requises (${priorite1.length})\n\n`;
    explication += `Ces corrections doivent être appliquées en priorité pour éviter des problèmes opérationnels.\n\n`;
  }

  const priorite2 = recommandations.filter((r) => r.priorite === 2);
  if (priorite2.length > 0) {
    explication += `### Améliorations recommandées (${priorite2.length})\n\n`;
    explication += `Ces ajustements amélioreront significativement l'équilibre de la charge.\n\n`;
  }

  explication += `\n**Tetrix Master** surveille en continu les règles métier BT, les profils TR1/TR2/TR3, `;
  explication += `les capacités, les échéances et les spécialisations pour vous aider à prendre les meilleures décisions.`;

  return explication;
}
