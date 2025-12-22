/**
 * TETRIX MAX UNIFIED SERVICE
 * 
 * Service unifié combinant l'analyse statistique avancée (ex-Orion)
 * et l'optimisation de charge (ex-Master) en une seule API cohérente.
 * 
 * Ce service fournit un tableau de bord complet avec:
 * - Score de santé global
 * - Métriques clés (KPIs)
 * - Diagnostic complet
 * - Recommandations priorisées
 * - Projections
 * - Alertes
 */

import prisma from '../config/database';
import { addDays, differenceInDays, startOfDay, subDays } from 'date-fns';
import { estWeekend } from './planificationService';
import { formatOttawaISO, parseOttawaDateISO } from '../utils/dateTimeOttawa';

// ============================================================================
// TYPES ET INTERFACES
// ============================================================================

// Résumé exécutif unifié
export interface ResumeExecutifUnifie {
  scoreGlobal: number; // 0-100
  etatGeneral: 'EXCELLENT' | 'BON' | 'ACCEPTABLE' | 'PREOCCUPANT' | 'CRITIQUE';
  visionEnsemble: string;
  problemePrincipal: string;
  objectif: string;
  principauxRisques: string[];
  principalesForces: string[];
  recommandationCle: string;
  metriquesClés: {
    scoreEquilibre: number;
    traducteursSurcharges: number;
    tachesEnRisque: number;
    capaciteGaspillee: number;
  };
}

// Indicateurs clés (KPIs)
export interface IndicateursCles {
  tauxUtilisationMoyen: number;
  pourcentageJoursSurcharge: number;
  ratioChargeTR1CapaciteTR3: number;
  chargeParDomaine: { [domaine: string]: number };
  evolutionVsPeriodePrecedente: {
    tauxUtilisation: number;
    volumeTaches: number;
    tendance: 'HAUSSE' | 'BAISSE' | 'STABLE';
  };
}

// Diagnostic capacité
export interface DiagnosticCapacite {
  tauxUtilisationParJour: { date: string; taux: number; statut: 'CRITIQUE' | 'ELEVE' | 'NORMAL' | 'FAIBLE' }[];
  joursCritiques: number;
  joursVides: number;
  tendanceSaturation: 'CROISSANTE' | 'DECROISSANTE' | 'STABLE';
  observations: string[];
}

// Diagnostic profils TR
export interface DiagnosticProfils {
  repartitionVolume: { TR1: number; TR2: number; TR3: number };
  tauxUtilisation: { TR1: number; TR2: number; TR3: number };
  chargeTR1VsCapaciteRevisionTR3: {
    heuresTraductionTR1: number;
    heuresRevisionDisponiblesTR3: number;
    ratio: number;
    statut: 'EQUILIBRE' | 'TENSION' | 'SATURE' | 'CRITIQUE';
  };
  tr3SurchargesTraduction: string[];
  tr2SousUtilises: string[];
  observations: string[];
}

// Diagnostic domaines
export interface DiagnosticDomaines {
  volumeParDomaine: { domaine: string; heures: number; pourcentage: number }[];
  capaciteParDomaine: { domaine: string; capaciteDisponible: number }[];
  goulots: { domaine: string; surcharge: number; traducteursConcernes: string[] }[];
  observations: string[];
}

// Diagnostic tâches
export interface DiagnosticTaches {
  volumeTraductionVsRevision: { traduction: number; revision: number; ratio: number };
  distributionModes: { JAT: number; FIFO: number; EQUILIBRE: number; MANUEL: number };
  modesDominants: string[];
  // Répartition par priorité
  repartitionPriorite: {
    urgentes: { nombre: number; heures: number; pourcentage: number };
    regulieres: { nombre: number; heures: number; pourcentage: number };
  };
  observations: string[];
}

// Analyse capacité traducteur
export interface AnalyseCapaciteTraducteur {
  traducteurId: string;
  traducteurNom: string;
  profil: 'TR1' | 'TR2' | 'TR3';
  type: 'SURCHARGE' | 'SOUS_UTILISATION' | 'BLOCAGE_PROBLEMATIQUE' | 'CUMUL_CRITIQUE' | 'OPTIMAL';
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

// Analyse échéance
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

// Analyse conformité
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

// Analyse risques
export interface AnalyseRisques {
  risquesEcheances: {
    tachesEnRetard: number;
    tachesRisque: number;
    impactTotal: string;
  };
  risquesStructurels: {
    type: string;
    description: string;
    gravite: 'CRITIQUE' | 'ELEVE' | 'MOYEN';
  }[];
  risquesRecurrents: string[];
  scoreRisqueGlobal: number;
}

// Recommandation unifiée
export interface RecommandationUnifiee {
  id: string;
  priorite: 1 | 2 | 3;
  type: 'CORRECTION_IMMEDIATE' | 'AMELIORATION' | 'OPTIMISATION';
  categorie: 'REDISTRIBUTION' | 'PROFIL' | 'DOMAINE' | 'MODE' | 'CAPACITE' | 'PREVISION' | 'CONFORMITE';
  titre: string;
  description: string;
  justification: string;
  actionConcrete: string;
  impactAttendu: string;
  effort: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  tachesAffectees?: string[];
  traducteursAffectes?: string[];
}

// Projections
export interface ProjectionCharge {
  heuresPrevues: number;
  capaciteDisponible: number;
  tauxUtilisationPrevu: number;
  statut: 'NORMAL' | 'TENDU' | 'SATURE';
  joursOuvrables: number;
}

export interface ProjectionsUnifiees {
  charge7Jours: ProjectionCharge;
  charge14Jours: ProjectionCharge;
  charge30Jours: ProjectionCharge;
  chargePersonnalisee?: ProjectionCharge & { dateDebut: string; dateFin: string };
  risquesAnticipes: string[];
  impactTR1TR3: string;
}

// Observations
export interface ObservationsUnifiees {
  anomalies: string[];
  gainsEfficacite: string[];
  notesGestion: string[];
}

// Rapport unifié complet
export interface RapportTetrixMaxUnifie {
  resumeExecutif: ResumeExecutifUnifie;
  indicateursCles: IndicateursCles;
  diagnosticComplet: {
    capacite: DiagnosticCapacite;
    capacites: AnalyseCapaciteTraducteur[];
    profils: DiagnosticProfils;
    domaines: DiagnosticDomaines;
    taches: DiagnosticTaches;
    echeances: AnalyseEcheance[];
    conformite: AnalyseConformite[];
    risques: AnalyseRisques;
  };
  recommandations: RecommandationUnifiee[];
  projections: ProjectionsUnifiees;
  observations: ObservationsUnifiees;
  horodatage: string;
  periodeCouverture: { debut: string; fin: string };
  portrait?: {
    estFiltre: boolean;
    filtresActifs: string[];
    nombreTraducteurs: number;
    nombreTaches: number;
  };
}

// Données internes
interface DonneesAnalyse {
  traducteurs: any[];
  taches: any[];
  joursOuvrables: Date[];
  capaciteTotale: number;
  heuresAssignees: number;
}

// Interface pour les filtres du portrait
export interface FiltresPortrait {
  divisions?: string[];
  clients?: string[];
  domaines?: string[];
  languesSource?: string[];
  languesCible?: string[];
}

// ============================================================================
// FONCTION PRINCIPALE
// ============================================================================

export async function genererRapportUnifie(
  dateDebut: Date,
  dateFin: Date,
  filtres?: FiltresPortrait
): Promise<RapportTetrixMaxUnifie> {
  
  // 1. Collecter les données (avec filtres du portrait en cours)
  const donnees = await collecterDonnees(dateDebut, dateFin, filtres);
  
  // 2. Analyses de capacité
  const capaciteGlobale = analyserCapaciteGlobale(donnees, dateDebut, dateFin);
  const capacitesParTraducteur = analyserCapacitesParTraducteur(donnees, dateDebut, dateFin);
  
  // 3. Analyse des profils TR
  const profils = analyserProfilsTR(donnees, dateDebut, dateFin);
  
  // 4. Analyse des domaines
  const domaines = analyserDomaines(donnees);
  
  // 5. Analyse des tâches
  const taches = analyserTaches(donnees);
  
  // 6. Analyse des échéances
  const echeances = analyserEcheances(donnees, dateDebut, dateFin);
  
  // 7. Vérification conformité
  const conformite = verifierConformite(donnees);
  
  // 8. Analyse des risques
  const risques = analyserRisques(donnees, capaciteGlobale, profils, echeances, conformite);
  
  // 9. Indicateurs clés
  const indicateurs = calculerIndicateursCles(donnees, capaciteGlobale, profils, domaines);
  
  // 10. Générer recommandations
  const recommandations = genererRecommandations(
    capacitesParTraducteur,
    echeances,
    conformite,
    profils,
    domaines,
    risques
  );
  
  // 11. Projections
  const projections = calculerProjections(donnees, dateFin);
  
  // 12. Observations
  const observations = genererObservations(donnees, capaciteGlobale, profils, domaines);
  
  // 13. Résumé exécutif
  const resume = genererResumeExecutif(
    indicateurs,
    capaciteGlobale,
    capacitesParTraducteur,
    profils,
    risques,
    recommandations
  );
  
  // Construire info sur les filtres actifs pour l'affichage
  const filtresActifs: string[] = [];
  if (filtres?.divisions?.length) filtresActifs.push(`Division${filtres.divisions.length > 1 ? 's' : ''}: ${filtres.divisions.join(', ')}`);
  if (filtres?.clients?.length) filtresActifs.push(`Client${filtres.clients.length > 1 ? 's' : ''}: ${filtres.clients.join(', ')}`);
  if (filtres?.domaines?.length) filtresActifs.push(`Domaine${filtres.domaines.length > 1 ? 's' : ''}: ${filtres.domaines.join(', ')}`);
  if (filtres?.languesSource?.length) filtresActifs.push(`Source: ${filtres.languesSource.join(', ')}`);
  if (filtres?.languesCible?.length) filtresActifs.push(`Cible: ${filtres.languesCible.join(', ')}`);
  
  return {
    resumeExecutif: resume,
    indicateursCles: indicateurs,
    diagnosticComplet: {
      capacite: capaciteGlobale,
      capacites: capacitesParTraducteur,
      profils,
      domaines,
      taches,
      echeances,
      conformite,
      risques,
    },
    recommandations,
    projections,
    observations,
    horodatage: new Date().toISOString(),
    periodeCouverture: {
      debut: formatOttawaISO(dateDebut),
      fin: formatOttawaISO(dateFin),
    },
    // Infos sur le portrait analysé
    portrait: {
      estFiltre: filtresActifs.length > 0,
      filtresActifs,
      nombreTraducteurs: donnees.traducteurs.length,
      nombreTaches: donnees.taches.length,
    },
  };
}

// ============================================================================
// COLLECTE DE DONNÉES
// ============================================================================

async function collecterDonnees(
  dateDebut: Date, 
  dateFin: Date,
  filtres?: FiltresPortrait
): Promise<DonneesAnalyse> {
  // Construire les conditions de filtre pour traducteurs
  const whereTraducteur: any = { actif: true };
  
  // Filtre par division - divisions est maintenant un tableau
  if (filtres?.divisions && filtres.divisions.length > 0) {
    whereTraducteur.divisions = { hasSome: filtres.divisions };
  }
  
  // Traducteurs actifs avec leurs données
  let traducteurs = await prisma.traducteur.findMany({
    where: whereTraducteur,
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
        select: {
          id: true,
          numeroProjet: true,
          description: true,
          specialisation: true,
          heuresTotal: true,
          dateEcheance: true,
          statut: true,
          typeTache: true,
          traducteurId: true,
          clientId: true,
          sousDomaineId: true,
          paireLinguistiqueId: true,
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

  // Filtrer par paires linguistiques si spécifié
  if (filtres?.languesSource?.length || filtres?.languesCible?.length) {
    traducteurs = traducteurs.filter(t => {
      const paires = t.pairesLinguistiques || [];
      if (paires.length === 0) return false;
      
      // Vérifier si au moins une paire correspond aux filtres
      return paires.some(p => {
        const matchSource = !filtres.languesSource?.length || filtres.languesSource.includes(p.langueSource);
        const matchCible = !filtres.languesCible?.length || filtres.languesCible.includes(p.langueCible);
        return matchSource && matchCible;
      });
    });
  }

  // Jours ouvrables
  const joursOuvrables: Date[] = [];
  let currentDate = new Date(dateDebut);
  while (currentDate <= dateFin) {
    if (!estWeekend(currentDate)) {
      joursOuvrables.push(new Date(currentDate));
    }
    currentDate = addDays(currentDate, 1);
  }

  // IDs des traducteurs filtrés
  const traducteurIds = traducteurs.map(t => t.id);

  // Construire les conditions de filtre pour tâches
  const whereTache: any = {
    statut: { in: ['PLANIFIEE', 'EN_COURS'] },
    dateEcheance: { gte: dateDebut, lte: dateFin },
    traducteurId: { in: traducteurIds }, // Seulement les tâches des TR filtrés
  };
  
  // Filtre par client
  if (filtres?.clients && filtres.clients.length > 0) {
    // Trouver les IDs des clients par nom
    const clients = await prisma.client.findMany({
      where: { nom: { in: filtres.clients } },
      select: { id: true },
    });
    whereTache.clientId = { in: clients.map(c => c.id) };
  }
  
  // Filtre par domaine (utilise domaineParent qui est une string dans SousDomaine)
  if (filtres?.domaines && filtres.domaines.length > 0) {
    const sousDomaines = await prisma.sousDomaine.findMany({
      where: {
        domaineParent: { in: filtres.domaines },
      },
      select: { id: true },
    });
    whereTache.sousDomaineId = { in: sousDomaines.map(sd => sd.id) };
  }

  // Toutes les tâches (filtrées)
  const taches = await prisma.tache.findMany({
    where: whereTache,
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

  const heuresAssignees = taches.reduce((sum, t) => sum + t.heuresTotal, 0);

  return {
    traducteurs,
    taches,
    joursOuvrables,
    capaciteTotale,
    heuresAssignees,
  };
}

// ============================================================================
// ANALYSE CAPACITÉ GLOBALE
// ============================================================================

function analyserCapaciteGlobale(
  donnees: DonneesAnalyse,
  dateDebut: Date,
  dateFin: Date
): DiagnosticCapacite {
  const tauxUtilisationParJour: DiagnosticCapacite['tauxUtilisationParJour'] = [];
  let joursCritiques = 0;
  let joursVides = 0;

  donnees.joursOuvrables.forEach((jour) => {
    const jourStr = formatOttawaISO(jour);
    let heuresJour = 0;
    let capaciteJour = 0;

    donnees.traducteurs.forEach((trad) => {
      capaciteJour += trad.capaciteHeuresParJour;
      
      const taches = Array.isArray(trad.taches) ? trad.taches : [];
      taches.forEach((tache: any) => {
        const ajustements = Array.isArray(tache.ajustementsTemps) ? tache.ajustementsTemps : [];
        ajustements.forEach((aj: any) => {
          if (formatOttawaISO(aj.date) === jourStr) {
            heuresJour += aj.heures;
          }
        });
      });
    });

    const taux = capaciteJour > 0 ? (heuresJour / capaciteJour) * 100 : 0;
    let statut: 'CRITIQUE' | 'ELEVE' | 'NORMAL' | 'FAIBLE' = 'NORMAL';
    
    if (taux > 90) {
      statut = 'CRITIQUE';
      joursCritiques++;
    } else if (taux > 80) {
      statut = 'ELEVE';
    } else if (taux < 30) {
      statut = 'FAIBLE';
      joursVides++;
    }

    tauxUtilisationParJour.push({ date: jourStr, taux: Math.round(taux), statut });
  });

  // Tendance
  const premiereMotie = tauxUtilisationParJour.slice(0, Math.floor(tauxUtilisationParJour.length / 2));
  const secondeMotie = tauxUtilisationParJour.slice(Math.floor(tauxUtilisationParJour.length / 2));
  const moyennePremiere = premiereMotie.reduce((s, t) => s + t.taux, 0) / premiereMotie.length || 0;
  const moyenneSeconde = secondeMotie.reduce((s, t) => s + t.taux, 0) / secondeMotie.length || 0;

  let tendanceSaturation: DiagnosticCapacite['tendanceSaturation'] = 'STABLE';
  if (moyenneSeconde > moyennePremiere + 10) tendanceSaturation = 'CROISSANTE';
  else if (moyenneSeconde < moyennePremiere - 10) tendanceSaturation = 'DECROISSANTE';

  const observations: string[] = [];
  if (joursCritiques > 0) {
    observations.push(`${joursCritiques} jour(s) en surcharge critique (>90%)`);
  }
  if (joursVides > donnees.joursOuvrables.length * 0.3) {
    observations.push('Période avec beaucoup de jours sous-utilisés');
  }

  return {
    tauxUtilisationParJour,
    joursCritiques,
    joursVides,
    tendanceSaturation,
    observations,
  };
}

// ============================================================================
// ANALYSE CAPACITÉS PAR TRADUCTEUR
// ============================================================================

function analyserCapacitesParTraducteur(
  donnees: DonneesAnalyse,
  dateDebut: Date,
  dateFin: Date
): AnalyseCapaciteTraducteur[] {
  const analyses: AnalyseCapaciteTraducteur[] = [];

  if (!donnees.traducteurs || !Array.isArray(donnees.traducteurs)) {
    return analyses;
  }

  donnees.traducteurs.forEach((trad) => {
    const capaciteJournaliere = trad.capaciteHeuresParJour;
    const joursDisponibles = donnees.joursOuvrables.length;
    const capaciteTotale = capaciteJournaliere * joursDisponibles;

    const taches = Array.isArray(trad.taches) ? trad.taches : [];
    const ajustementsTemps = Array.isArray(trad.ajustementsTemps) ? trad.ajustementsTemps : [];

    // Heures assignées
    const heuresAssignees = taches.reduce((sum: number, tache: any) => {
      const ajustements = Array.isArray(tache.ajustementsTemps) ? tache.ajustementsTemps : [];
      const heuresPeriode = ajustements.reduce((s: number, aj: any) => s + aj.heures, 0);
      return sum + heuresPeriode;
    }, 0);

    // Heures blocages
    const heuresBlocages = ajustementsTemps.reduce((sum: number, aj: any) => sum + aj.heures, 0);

    const capaciteEffective = capaciteTotale - heuresBlocages;
    const tauxUtilisation = capaciteEffective > 0 
      ? (heuresAssignees / capaciteEffective) * 100 
      : 0;

    // Jours problématiques
    const joursProblematiques: Set<string> = new Set();
    
    donnees.joursOuvrables.forEach((jour) => {
      const jourStr = formatOttawaISO(jour);
      let heuresJour = 0;
      
      taches.forEach((tache: any) => {
        const ajustements = Array.isArray(tache.ajustementsTemps) ? tache.ajustementsTemps : [];
        ajustements.forEach((aj: any) => {
          if (formatOttawaISO(aj.date) === jourStr) {
            heuresJour += aj.heures;
          }
        });
      });
      
      const blocagesJour = ajustementsTemps
        .filter((aj: any) => formatOttawaISO(aj.date) === jourStr)
        .reduce((sum: number, aj: any) => sum + aj.heures, 0);
      
      if (heuresJour + blocagesJour > capaciteJournaliere * 1.1) {
        joursProblematiques.add(jourStr);
      }
    });

    // Déterminer type et gravité
    let type: AnalyseCapaciteTraducteur['type'] = 'OPTIMAL';
    let gravite: AnalyseCapaciteTraducteur['gravite'] = 'FAIBLE';
    let description = `${trad.nom} (${trad.classification || 'TR2'}) - utilisation ${tauxUtilisation.toFixed(0)}%`;
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
      description = `${trad.nom} a ${heuresBlocages.toFixed(1)}h de blocages`;
      impact = `Capacité effective réduite significativement`;
    } else if (tauxUtilisation < 50 && heuresAssignees > 0) {
      type = 'SOUS_UTILISATION';
      gravite = 'FAIBLE';
      description = `${trad.nom} (${trad.classification || 'TR2'}) est sous-utilisé à ${tauxUtilisation.toFixed(0)}%`;
      impact = `${(capaciteEffective - heuresAssignees).toFixed(1)}h de capacité disponible`;
    }

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
  });

  // Trier par gravité
  return analyses.sort((a, b) => {
    const graviteOrdre = { CRITIQUE: 4, ELEVE: 3, MOYEN: 2, FAIBLE: 1 };
    return graviteOrdre[b.gravite] - graviteOrdre[a.gravite];
  });
}

// ============================================================================
// ANALYSE PROFILS TR
// ============================================================================

function analyserProfilsTR(
  donnees: DonneesAnalyse,
  dateDebut: Date,
  dateFin: Date
): DiagnosticProfils {
  
  let volumeTR1 = 0, volumeTR2 = 0, volumeTR3 = 0;
  let heuresTR1 = 0, heuresTR2 = 0, heuresTR3 = 0;
  let capaciteTR1 = 0, capaciteTR2 = 0, capaciteTR3 = 0;
  let heuresTraductionTR1 = 0;
  let heuresRevisionDisponiblesTR3 = 0;
  const tr3SurchargesTraduction: string[] = [];
  const tr2SousUtilises: string[] = [];

  donnees.traducteurs.forEach((trad) => {
    const profil = trad.classification || 'TR2';
    const capacite = trad.capaciteHeuresParJour * donnees.joursOuvrables.length;
    const taches = Array.isArray(trad.taches) ? trad.taches : [];
    
    const heuresAssignees = taches.reduce((sum: number, tache: any) => {
      const ajustements = Array.isArray(tache.ajustementsTemps) ? tache.ajustementsTemps : [];
      return sum + ajustements.reduce((s: number, aj: any) => s + aj.heures, 0);
    }, 0);

    // Par profil
    if (profil === 'TR1') {
      volumeTR1++;
      heuresTR1 += heuresAssignees;
      capaciteTR1 += capacite;
      
      // TR1 = traduction
      const heuresTraduction = taches
        .filter((t: any) => t.typeTache === 'TRADUCTION')
        .reduce((sum: number, tache: any) => {
          const ajustements = Array.isArray(tache.ajustementsTemps) ? tache.ajustementsTemps : [];
          return sum + ajustements.reduce((s: number, aj: any) => s + aj.heures, 0);
        }, 0);
      heuresTraductionTR1 += heuresTraduction;
    } else if (profil === 'TR2') {
      volumeTR2++;
      heuresTR2 += heuresAssignees;
      capaciteTR2 += capacite;
      
      const tauxUtil = capacite > 0 ? (heuresAssignees / capacite) * 100 : 0;
      if (tauxUtil < 50) {
        tr2SousUtilises.push(trad.nom);
      }
    } else if (profil === 'TR3') {
      volumeTR3++;
      heuresTR3 += heuresAssignees;
      capaciteTR3 += capacite;
      
      // TR3 peut réviser - estimer capacité révision (40% du temps)
      heuresRevisionDisponiblesTR3 += (capacite - heuresAssignees) * 0.4;
      
      // Vérifier si TR3 fait trop de traduction
      const heuresTraduction = taches
        .filter((t: any) => t.typeTache === 'TRADUCTION')
        .reduce((sum: number, tache: any) => {
          const ajustements = Array.isArray(tache.ajustementsTemps) ? tache.ajustementsTemps : [];
          return sum + ajustements.reduce((s: number, aj: any) => s + aj.heures, 0);
        }, 0);
      
      if (heuresTraduction > heuresAssignees * 0.5) {
        tr3SurchargesTraduction.push(trad.nom);
      }
    }
  });

  const ratio = heuresRevisionDisponiblesTR3 > 0 
    ? heuresTraductionTR1 / heuresRevisionDisponiblesTR3 
    : heuresTraductionTR1 > 0 ? 999 : 0;

  let statut: DiagnosticProfils['chargeTR1VsCapaciteRevisionTR3']['statut'] = 'EQUILIBRE';
  if (ratio > 1.5) statut = 'CRITIQUE';
  else if (ratio > 1.2) statut = 'SATURE';
  else if (ratio > 1) statut = 'TENSION';

  const observations: string[] = [];
  if (tr3SurchargesTraduction.length > 0) {
    observations.push(`${tr3SurchargesTraduction.length} TR3 font principalement de la traduction au lieu de révision`);
  }
  if (tr2SousUtilises.length > 2) {
    observations.push(`${tr2SousUtilises.length} TR2 sont sous-utilisés - capacité disponible`);
  }

  return {
    repartitionVolume: { TR1: volumeTR1, TR2: volumeTR2, TR3: volumeTR3 },
    tauxUtilisation: {
      TR1: capaciteTR1 > 0 ? Math.round((heuresTR1 / capaciteTR1) * 100) : 0,
      TR2: capaciteTR2 > 0 ? Math.round((heuresTR2 / capaciteTR2) * 100) : 0,
      TR3: capaciteTR3 > 0 ? Math.round((heuresTR3 / capaciteTR3) * 100) : 0,
    },
    chargeTR1VsCapaciteRevisionTR3: {
      heuresTraductionTR1: Math.round(heuresTraductionTR1 * 10) / 10,
      heuresRevisionDisponiblesTR3: Math.round(heuresRevisionDisponiblesTR3 * 10) / 10,
      ratio: Math.round(ratio * 100) / 100,
      statut,
    },
    tr3SurchargesTraduction,
    tr2SousUtilises,
    observations,
  };
}

// ============================================================================
// ANALYSE DOMAINES
// ============================================================================

function analyserDomaines(donnees: DonneesAnalyse): DiagnosticDomaines {
  const volumeParDomaine: Map<string, number> = new Map();
  let heuresTotal = 0;

  donnees.taches.forEach((tache) => {
    const domaine = tache.sousDomaine?.domaine?.nom || tache.specialisation || 'Non classifié';
    const heures = tache.heuresTotal || 0;
    
    volumeParDomaine.set(domaine, (volumeParDomaine.get(domaine) || 0) + heures);
    heuresTotal += heures;
  });

  const volumeArray = Array.from(volumeParDomaine.entries())
    .map(([domaine, heures]) => ({
      domaine,
      heures: Math.round(heures * 10) / 10,
      pourcentage: heuresTotal > 0 ? Math.round((heures / heuresTotal) * 100) : 0,
    }))
    .sort((a, b) => b.heures - a.heures);

  // Détecter les goulots
  const goulots: DiagnosticDomaines['goulots'] = [];
  volumeArray.forEach((vol) => {
    if (vol.pourcentage > 30) {
      goulots.push({
        domaine: vol.domaine,
        surcharge: vol.heures,
        traducteursConcernes: [],
      });
    }
  });

  return {
    volumeParDomaine: volumeArray,
    capaciteParDomaine: [],
    goulots,
    observations: goulots.length > 0 
      ? [`${goulots.length} domaine(s) concentrent plus de 30% de la charge`]
      : [],
  };
}

// ============================================================================
// ANALYSE TÂCHES
// ============================================================================

function analyserTaches(donnees: DonneesAnalyse): DiagnosticTaches {
  let traduction = 0;
  let revision = 0;
  const modesCounts = { JAT: 0, FIFO: 0, EQUILIBRE: 0, MANUEL: 0 };
  
  // Compteurs par priorité
  let urgentesNombre = 0;
  let urgentesHeures = 0;
  let regulieresNombre = 0;
  let regulieresHeures = 0;

  donnees.taches.forEach((tache) => {
    const heures = tache.heuresTotal || 0;
    
    if (tache.typeTache === 'TRADUCTION') {
      traduction += heures;
    } else if (tache.typeTache === 'REVISION' || tache.typeTache === 'RELECTURE') {
      revision += heures;
    }

    const mode = (tache as any).modeRepartition || 'EQUILIBRE';
    if (mode in modesCounts) {
      modesCounts[mode as keyof typeof modesCounts]++;
    }
    
    // Comptabiliser par priorité
    const priorite = (tache as any).priorite || 'REGULIER';
    if (priorite === 'URGENT') {
      urgentesNombre++;
      urgentesHeures += heures;
    } else {
      regulieresNombre++;
      regulieresHeures += heures;
    }
  });

  const ratio = revision > 0 ? traduction / revision : 0;
  const modesDominants = Object.entries(modesCounts)
    .filter(([_, count]) => count > donnees.taches.length * 0.2)
    .map(([mode]) => mode);
  
  const totalHeures = urgentesHeures + regulieresHeures;
  const totalNombre = urgentesNombre + regulieresNombre;

  return {
    volumeTraductionVsRevision: {
      traduction: Math.round(traduction * 10) / 10,
      revision: Math.round(revision * 10) / 10,
      ratio: Math.round(ratio * 100) / 100,
    },
    distributionModes: modesCounts,
    modesDominants,
    repartitionPriorite: {
      urgentes: {
        nombre: urgentesNombre,
        heures: Math.round(urgentesHeures * 10) / 10,
        pourcentage: totalHeures > 0 ? Math.round((urgentesHeures / totalHeures) * 100) : 0,
      },
      regulieres: {
        nombre: regulieresNombre,
        heures: Math.round(regulieresHeures * 10) / 10,
        pourcentage: totalHeures > 0 ? Math.round((regulieresHeures / totalHeures) * 100) : 0,
      },
    },
    observations: [],
  };
}

// ============================================================================
// ANALYSE ÉCHÉANCES
// ============================================================================

function analyserEcheances(
  donnees: DonneesAnalyse,
  dateDebut: Date,
  dateFin: Date
): AnalyseEcheance[] {
  const analyses: AnalyseEcheance[] = [];
  const aujourdhui = startOfDay(new Date());

  donnees.taches.forEach((tache) => {
    if (!tache.dateEcheance) return;

    const echeance = startOfDay(new Date(tache.dateEcheance));
    const joursRestants = differenceInDays(echeance, aujourdhui);
    
    if (joursRestants < 0) {
      // En retard
      analyses.push({
        tacheId: tache.id,
        numeroProjet: tache.numeroProjet,
        dateEcheance: formatOttawaISO(echeance),
        type: 'RISQUE_RETARD',
        gravite: 'CRITIQUE',
        description: `Tâche en retard de ${Math.abs(joursRestants)} jour(s)`,
        traducteurConcerne: tache.traducteur?.nom || 'Non assigné',
        heuresRestantes: tache.heuresTotal,
        joursDisponibles: 0,
        tauxRemplissageVeille: 100,
        recommandation: 'Action immédiate requise - réviser la priorité',
      });
    } else if (joursRestants <= 2) {
      // Risque imminent
      analyses.push({
        tacheId: tache.id,
        numeroProjet: tache.numeroProjet,
        dateEcheance: formatOttawaISO(echeance),
        type: 'ABSENCE_MARGE',
        gravite: joursRestants === 0 ? 'CRITIQUE' : 'ELEVE',
        description: `Échéance dans ${joursRestants} jour(s)`,
        traducteurConcerne: tache.traducteur?.nom || 'Non assigné',
        heuresRestantes: tache.heuresTotal,
        joursDisponibles: joursRestants,
        tauxRemplissageVeille: 80,
        recommandation: 'Prioriser cette tâche',
      });
    }
  });

  return analyses.sort((a, b) => {
    const graviteOrdre = { CRITIQUE: 4, ELEVE: 3, MOYEN: 2, FAIBLE: 1 };
    return graviteOrdre[b.gravite] - graviteOrdre[a.gravite];
  });
}

// ============================================================================
// VÉRIFICATION CONFORMITÉ
// ============================================================================

function verifierConformite(donnees: DonneesAnalyse): AnalyseConformite[] {
  const violations: AnalyseConformite[] = [];

  donnees.taches.forEach((tache) => {
    const traducteur = donnees.traducteurs.find(t => t.id === tache.traducteurId);
    if (!traducteur) return;

    // TR1 doit avoir révision
    if (traducteur.classification === 'TR1' && tache.typeTache === 'TRADUCTION') {
      // Vérifier s'il y a une révision associée (simplification)
      const hasRevision = donnees.taches.some(
        t => t.numeroProjet === tache.numeroProjet && 
             t.typeTache === 'REVISION' &&
             t.id !== tache.id
      );
      
      if (!hasRevision) {
        violations.push({
          problemeId: `conf-${tache.id}`,
          type: 'TR1_NON_REVISE',
          gravite: 'ELEVE',
          description: `Traduction TR1 sans révision assignée`,
          tacheId: tache.id,
          traducteurId: traducteur.id,
          regleViolee: 'Tout travail TR1 doit être révisé par un TR3',
          correction: `Assigner une révision pour ${tache.numeroProjet}`,
        });
      }
    }
  });

  return violations;
}

// ============================================================================
// ANALYSE RISQUES
// ============================================================================

function analyserRisques(
  donnees: DonneesAnalyse,
  capacite: DiagnosticCapacite,
  profils: DiagnosticProfils,
  echeances: AnalyseEcheance[],
  conformite: AnalyseConformite[]
): AnalyseRisques {
  const tachesEnRetard = echeances.filter(e => e.joursDisponibles < 0).length;
  const tachesRisque = echeances.filter(e => e.gravite === 'CRITIQUE' || e.gravite === 'ELEVE').length;

  const risquesStructurels: AnalyseRisques['risquesStructurels'] = [];

  // Manque TR3
  if (profils.chargeTR1VsCapaciteRevisionTR3.statut === 'CRITIQUE') {
    risquesStructurels.push({
      type: 'MANQUE_TR3',
      description: 'Capacité de révision TR3 insuffisante pour le volume TR1',
      gravite: 'CRITIQUE',
    });
  }

  // Surcharge récurrente
  if (capacite.joursCritiques > donnees.joursOuvrables.length * 0.3) {
    risquesStructurels.push({
      type: 'SURCHARGE_RECURRENTE',
      description: `${capacite.joursCritiques} jours en surcharge critique`,
      gravite: 'ELEVE',
    });
  }

  // Score de risque global
  let scoreRisque = 0;
  scoreRisque += tachesEnRetard * 15;
  scoreRisque += tachesRisque * 10;
  scoreRisque += conformite.length * 20;
  scoreRisque += risquesStructurels.filter(r => r.gravite === 'CRITIQUE').length * 25;
  scoreRisque = Math.min(100, scoreRisque);

  return {
    risquesEcheances: {
      tachesEnRetard,
      tachesRisque,
      impactTotal: tachesEnRetard > 0 ? 'Retards confirmés' : tachesRisque > 0 ? 'Risques modérés' : 'Sous contrôle',
    },
    risquesStructurels,
    risquesRecurrents: [],
    scoreRisqueGlobal: scoreRisque,
  };
}

// ============================================================================
// INDICATEURS CLÉS
// ============================================================================

function calculerIndicateursCles(
  donnees: DonneesAnalyse,
  capacite: DiagnosticCapacite,
  profils: DiagnosticProfils,
  domaines: DiagnosticDomaines
): IndicateursCles {
  
  const tauxMoyen = capacite.tauxUtilisationParJour.length > 0
    ? capacite.tauxUtilisationParJour.reduce((s, t) => s + t.taux, 0) / capacite.tauxUtilisationParJour.length
    : 0;

  const pourcentageSurcharge = donnees.joursOuvrables.length > 0
    ? (capacite.joursCritiques / donnees.joursOuvrables.length) * 100
    : 0;

  const chargeParDomaine: { [key: string]: number } = {};
  domaines.volumeParDomaine.forEach((vol) => {
    chargeParDomaine[vol.domaine] = vol.heures;
  });

  return {
    tauxUtilisationMoyen: Math.round(tauxMoyen),
    pourcentageJoursSurcharge: Math.round(pourcentageSurcharge),
    ratioChargeTR1CapaciteTR3: profils.chargeTR1VsCapaciteRevisionTR3.ratio,
    chargeParDomaine,
    evolutionVsPeriodePrecedente: {
      tauxUtilisation: 0,
      volumeTaches: 0,
      tendance: 'STABLE',
    },
  };
}

// ============================================================================
// GÉNÉRATION RECOMMANDATIONS
// ============================================================================

function genererRecommandations(
  capacites: AnalyseCapaciteTraducteur[],
  echeances: AnalyseEcheance[],
  conformite: AnalyseConformite[],
  profils: DiagnosticProfils,
  domaines: DiagnosticDomaines,
  risques: AnalyseRisques
): RecommandationUnifiee[] {
  const recommandations: RecommandationUnifiee[] = [];
  let idCounter = 1;

  // Priorité 1: Conformité
  conformite.forEach((conf) => {
    recommandations.push({
      id: `rec-${idCounter++}`,
      priorite: 1,
      type: 'CORRECTION_IMMEDIATE',
      categorie: 'CONFORMITE',
      titre: `Corriger: ${conf.type.replace(/_/g, ' ')}`,
      description: conf.description,
      justification: `Règle violée: ${conf.regleViolee}`,
      actionConcrete: conf.correction,
      impactAttendu: 'Conformité aux règles métier',
      effort: 'MOYEN',
    });
  });

  // Priorité 1: Échéances critiques
  echeances.filter(e => e.gravite === 'CRITIQUE').forEach((ech) => {
    recommandations.push({
      id: `rec-${idCounter++}`,
      priorite: 1,
      type: 'CORRECTION_IMMEDIATE',
      categorie: 'PREVISION',
      titre: `Urgence: ${ech.numeroProjet}`,
      description: ech.description,
      justification: `Échéance: ${ech.dateEcheance}`,
      actionConcrete: ech.recommandation,
      impactAttendu: 'Éviter le retard',
      effort: 'ELEVE',
      tachesAffectees: [ech.numeroProjet],
    });
  });

  // Priorité 2: Surcharges
  capacites.filter(c => c.type === 'SURCHARGE' && c.gravite !== 'FAIBLE').forEach((cap) => {
    recommandations.push({
      id: `rec-${idCounter++}`,
      priorite: cap.gravite === 'CRITIQUE' ? 1 : 2,
      type: 'AMELIORATION',
      categorie: 'REDISTRIBUTION',
      titre: `Rééquilibrer: ${cap.traducteurNom}`,
      description: cap.description,
      justification: cap.impact,
      actionConcrete: `Transférer ${((cap.metriques.tauxUtilisation - 85) * cap.metriques.capaciteJournaliere / 100).toFixed(1)}h vers un collègue disponible`,
      impactAttendu: 'Retour à un taux d\'utilisation optimal (70-85%)',
      effort: 'MOYEN',
      traducteursAffectes: [cap.traducteurNom],
    });
  });

  // Priorité 2: Équilibre TR1/TR3
  if (profils.chargeTR1VsCapaciteRevisionTR3.statut !== 'EQUILIBRE') {
    recommandations.push({
      id: `rec-${idCounter++}`,
      priorite: profils.chargeTR1VsCapaciteRevisionTR3.statut === 'CRITIQUE' ? 1 : 2,
      type: 'AMELIORATION',
      categorie: 'PROFIL',
      titre: 'Équilibrer ratio TR1/TR3',
      description: `Le ratio TR1/TR3 est ${profils.chargeTR1VsCapaciteRevisionTR3.ratio.toFixed(2)} (${profils.chargeTR1VsCapaciteRevisionTR3.statut})`,
      justification: 'Les TR3 n\'ont pas assez de temps pour réviser le travail des TR1',
      actionConcrete: profils.tr3SurchargesTraduction.length > 0
        ? `Libérer ${profils.tr3SurchargesTraduction.join(', ')} de leurs tâches de traduction`
        : 'Réduire les assignations TR1 ou augmenter la capacité TR3',
      impactAttendu: 'Ratio TR1/TR3 ≤ 1.0',
      effort: 'MOYEN',
    });
  }

  // Priorité 3: Sous-utilisation
  const sousUtilises = capacites.filter(c => c.type === 'SOUS_UTILISATION');
  if (sousUtilises.length > 2) {
    recommandations.push({
      id: `rec-${idCounter++}`,
      priorite: 3,
      type: 'OPTIMISATION',
      categorie: 'CAPACITE',
      titre: 'Optimiser la capacité disponible',
      description: `${sousUtilises.length} traducteurs sont sous-utilisés`,
      justification: `Capacité totale non exploitée: ${sousUtilises.reduce((s, c) => s + (c.metriques.capaciteJournaliere - c.metriques.heuresAssignees), 0).toFixed(1)}h`,
      actionConcrete: 'Répartir la charge des traducteurs surchargés vers ces ressources disponibles',
      impactAttendu: 'Amélioration de l\'équilibre global',
      effort: 'FAIBLE',
      traducteursAffectes: sousUtilises.map(s => s.traducteurNom),
    });
  }

  return recommandations.slice(0, 10);
}

// ============================================================================
// PROJECTIONS
// ============================================================================

function calculerProjections(
  donnees: DonneesAnalyse,
  dateFin: Date
): ProjectionsUnifiees {
  const aujourdhui = new Date();
  
  // Fonction helper pour calculer une projection
  const calculerProjection = (nombreJours: number): ProjectionCharge => {
    // Compter les jours ouvrables dans la période
    let joursOuvrables = 0;
    let currentDate = new Date(aujourdhui);
    const finProjection = addDays(aujourdhui, nombreJours);
    
    while (currentDate <= finProjection) {
      if (!estWeekend(currentDate)) {
        joursOuvrables++;
      }
      currentDate = addDays(currentDate, 1);
    }
    
    // Estimation basée sur la charge actuelle
    const heuresParJourOuvrable = donnees.joursOuvrables.length > 0 
      ? donnees.heuresAssignees / donnees.joursOuvrables.length 
      : 0;
    const capaciteParJourOuvrable = donnees.joursOuvrables.length > 0 
      ? donnees.capaciteTotale / donnees.joursOuvrables.length 
      : 0;
    
    const heuresPrevues = Math.round(heuresParJourOuvrable * joursOuvrables);
    const capaciteDisponible = Math.round(capaciteParJourOuvrable * joursOuvrables);
    const taux = capaciteDisponible > 0 ? Math.round((heuresPrevues / capaciteDisponible) * 100) : 0;
    const statut: 'NORMAL' | 'TENDU' | 'SATURE' = taux > 90 ? 'SATURE' : taux > 80 ? 'TENDU' : 'NORMAL';
    
    return {
      heuresPrevues,
      capaciteDisponible,
      tauxUtilisationPrevu: taux,
      statut,
      joursOuvrables,
    };
  };

  const projection7j = calculerProjection(7);
  const projection14j = calculerProjection(14);
  const projection30j = calculerProjection(30);

  const risquesAnticipes: string[] = [];
  if (projection7j.statut === 'SATURE') {
    risquesAnticipes.push('Risque de surcharge dans la semaine à venir');
  }
  if (projection14j.statut === 'SATURE') {
    risquesAnticipes.push('Charge saturée prévue sur les 2 prochaines semaines');
  }
  if (projection30j.statut === 'SATURE') {
    risquesAnticipes.push('Tension persistante sur le mois à venir - renfort recommandé');
  }
  if (projection30j.tauxUtilisationPrevu > projection7j.tauxUtilisationPrevu + 10) {
    risquesAnticipes.push('Tendance à la hausse de la charge sur le mois');
  }

  return {
    charge7Jours: projection7j,
    charge14Jours: projection14j,
    charge30Jours: projection30j,
    risquesAnticipes,
    impactTR1TR3: 'Impact à évaluer selon les assignations futures',
  };
}

// ============================================================================
// OBSERVATIONS
// ============================================================================

function genererObservations(
  donnees: DonneesAnalyse,
  capacite: DiagnosticCapacite,
  profils: DiagnosticProfils,
  domaines: DiagnosticDomaines
): ObservationsUnifiees {
  const anomalies: string[] = [];
  const gainsEfficacite: string[] = [];
  const notesGestion: string[] = [];

  if (capacite.tendanceSaturation === 'CROISSANTE') {
    notesGestion.push('Tendance saturation croissante - anticiper renforcement');
  }

  if (profils.tr2SousUtilises.length > 2) {
    gainsEfficacite.push(`${profils.tr2SousUtilises.length} TR2 disponibles pour absorber surplus`);
  }

  if (domaines.goulots.length > 0) {
    anomalies.push(`Concentration excessive sur ${domaines.goulots.length} domaine(s)`);
  }

  return {
    anomalies,
    gainsEfficacite,
    notesGestion,
  };
}

// ============================================================================
// RÉSUMÉ EXÉCUTIF
// ============================================================================

function genererResumeExecutif(
  indicateurs: IndicateursCles,
  capacite: DiagnosticCapacite,
  capacites: AnalyseCapaciteTraducteur[],
  profils: DiagnosticProfils,
  risques: AnalyseRisques,
  recommandations: RecommandationUnifiee[]
): ResumeExecutifUnifie {
  
  // Calculer score global
  let scoreGlobal = 100;
  scoreGlobal -= risques.scoreRisqueGlobal * 0.4;
  scoreGlobal -= (capacites.filter(c => c.gravite === 'CRITIQUE').length * 10);
  scoreGlobal -= (Math.abs(indicateurs.tauxUtilisationMoyen - 75) * 0.3);
  scoreGlobal = Math.max(0, Math.min(100, scoreGlobal));

  // État général
  let etatGeneral: ResumeExecutifUnifie['etatGeneral'] = 'BON';
  if (scoreGlobal >= 80) etatGeneral = 'EXCELLENT';
  else if (scoreGlobal >= 60) etatGeneral = 'BON';
  else if (scoreGlobal >= 40) etatGeneral = 'ACCEPTABLE';
  else if (scoreGlobal >= 20) etatGeneral = 'PREOCCUPANT';
  else etatGeneral = 'CRITIQUE';

  // Problème principal
  let problemePrincipal = 'Situation sous contrôle';
  let objectif = 'Maintenir l\'équilibre actuel';
  
  const critiques = capacites.filter(c => c.gravite === 'CRITIQUE');
  const conformiteProblemes = recommandations.filter(r => r.categorie === 'CONFORMITE');
  
  if (conformiteProblemes.length > 0) {
    problemePrincipal = `${conformiteProblemes.length} problème(s) de conformité`;
    objectif = 'Corriger immédiatement les violations';
  } else if (risques.risquesEcheances.tachesEnRetard > 0) {
    problemePrincipal = `${risques.risquesEcheances.tachesEnRetard} tâche(s) en retard`;
    objectif = 'Sécuriser les livraisons';
  } else if (critiques.length > 0) {
    problemePrincipal = `${critiques.length} traducteur(s) en surcharge critique`;
    objectif = 'Rééquilibrer la charge de travail';
  }

  // Risques et forces
  const principauxRisques = risques.risquesStructurels.map(r => r.description).slice(0, 3);
  
  const principalesForces: string[] = [];
  if (indicateurs.tauxUtilisationMoyen >= 70 && indicateurs.tauxUtilisationMoyen <= 85) {
    principalesForces.push('Taux d\'utilisation équilibré');
  }
  if (capacite.joursCritiques === 0) {
    principalesForces.push('Aucune surcharge critique');
  }
  if (profils.chargeTR1VsCapaciteRevisionTR3.statut === 'EQUILIBRE') {
    principalesForces.push('Bon équilibre TR1/TR3');
  }

  // Vision d'ensemble
  const visionEnsemble = `Planning ${etatGeneral.toLowerCase()} avec utilisation moyenne de ${indicateurs.tauxUtilisationMoyen}%. ` +
    `${recommandations.filter(r => r.priorite === 1).length} action(s) prioritaire(s) identifiée(s).`;

  const recommandationCle = recommandations.length > 0 
    ? recommandations[0].titre 
    : 'Maintenir l\'équilibre actuel';

  // Métriques clés pour le score d'équilibre
  const tauxUtilisations = capacites.map((c) => c.metriques.tauxUtilisation);
  const moyenne = tauxUtilisations.length > 0 
    ? tauxUtilisations.reduce((a, b) => a + b, 0) / tauxUtilisations.length 
    : 0;
  const variance = tauxUtilisations.length > 0
    ? tauxUtilisations.reduce((sum, val) => sum + Math.pow(val - moyenne, 2), 0) / tauxUtilisations.length
    : 0;
  const ecartType = Math.sqrt(variance);
  const scoreEquilibre = Math.max(0, Math.min(100, 100 - ecartType));

  const surcharges = capacites.filter(c => c.type === 'SURCHARGE');
  const sousUtilises = capacites.filter(c => c.type === 'SOUS_UTILISATION');
  const capaciteGaspillee = sousUtilises.reduce(
    (sum, s) => sum + (s.metriques.capaciteJournaliere * 5 - s.metriques.heuresAssignees),
    0
  );

  return {
    scoreGlobal: Math.round(scoreGlobal),
    etatGeneral,
    visionEnsemble,
    problemePrincipal,
    objectif,
    principauxRisques,
    principalesForces,
    recommandationCle,
    metriquesClés: {
      scoreEquilibre: Math.round(scoreEquilibre),
      traducteursSurcharges: surcharges.length,
      tachesEnRisque: risques.risquesEcheances.tachesRisque,
      capaciteGaspillee: Math.round(capaciteGaspillee * 10) / 10,
    },
  };
}

export default {
  genererRapportUnifie,
};
