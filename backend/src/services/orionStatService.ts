/**
 * TETRIX ORION - Moteur d'Analyse Statistique Avancée
 * 
 * Analyse la charge de travail, diagnostique l'état opérationnel,
 * identifie les risques et produit des recommandations stratégiques
 * pour le Bureau de la traduction.
 */

import prisma from '../config/database';
import { addDays, differenceInDays, startOfDay, subDays } from 'date-fns';
import { estWeekend } from './planificationService';
import { formatOttawaISO } from '../utils/dateTimeOttawa';

// ============================================================================
// TYPES ET INTERFACES
// ============================================================================

export interface ResumeExecutifOrion {
  visionEnsemble: string;
  etatGeneral: 'EXCELLENT' | 'BON' | 'ACCEPTABLE' | 'PREOCCUPANT' | 'CRITIQUE';
  principauxRisques: string[];
  principalesForces: string[];
  recommandationCle: string;
}

export interface IndicateursCles {
  tauxUtilisationMoyen: number;
  pourcentageJoursSurcharge: number;
  ratioChargeTR1CapaciteTR3: number;
  chargeParDomaine: { [domaine: string]: number };
  evolutionVsPeriodePrecedente: {
    tauxUtilisation: number; // % de changement
    volumeTaches: number; // % de changement
    tendance: 'HAUSSE' | 'BAISSE' | 'STABLE';
  };
}

export interface DiagnosticCapacite {
  type: 'CAPACITE_SATURATION';
  tauxUtilisationParJour: { date: string; taux: number; statut: 'CRITIQUE' | 'ELEVE' | 'NORMAL' | 'FAIBLE' }[];
  joursCritiques: number; // >90%
  joursVides: number; // <30%
  tendanceSaturation: 'CROISSANTE' | 'DECROISSANTE' | 'STABLE';
  observations: string[];
}

export interface DiagnosticProfils {
  type: 'TR1_TR2_TR3';
  repartitionVolume: { TR1: number; TR2: number; TR3: number };
  tauxUtilisation: { TR1: number; TR2: number; TR3: number };
  chargeTR1VsCapaciteRevisionTR3: {
    heuresTraductionTR1: number;
    heuresRevisionDisponiblesTR3: number;
    ratio: number; // >1 = problème
    statut: 'EQUILIBRE' | 'TENSION' | 'SATURE' | 'CRITIQUE';
  };
  tr3SurchargesTraduction: string[]; // Noms des TR3 faisant trop de traduction
  tr2SousUtilises: string[]; // Noms des TR2 sous-utilisés
  observations: string[];
}

export interface DiagnosticDomaines {
  type: 'DOMAINES_SPECIALITES';
  volumeParDomaine: { domaine: string; heures: number; pourcentage: number }[];
  capaciteParDomaine: { domaine: string; capaciteDisponible: number }[];
  goulots: { domaine: string; surcharge: number; traducteursConcernes: string[] }[];
  observations: string[];
}

export interface DiagnosticTaches {
  type: 'TACHES_MODES';
  volumeTraductionVsRevision: { traduction: number; revision: number; ratio: number };
  distributionModes: { JAT: number; FIFO: number; EQUILIBRE: number; MANUEL: number };
  modesDominants: string[];
  recommandationsModes: string[];
  observations: string[];
}

export interface AnalyseTendances {
  periode: '30j' | '60j' | '90j' | '180j' | '365j';
  tendanceUtilisation: 'HAUSSE' | 'BAISSE' | 'STABLE';
  tendanceVolume: 'HAUSSE' | 'BAISSE' | 'STABLE';
  comparaisonSemaines: {
    semaineEnCours: { volume: number; utilisation: number };
    semainePrecedente: { volume: number; utilisation: number };
    evolution: number; // %
  };
  patterns: string[]; // Patterns détectés
}

export interface AnalyseRisques {
  risquesEcheances: {
    tachesEnRetard: number;
    tachesRisque: number;
    impactTotal: string;
  };
  risquesStructurels: {
    type: 'MANQUE_TR3' | 'GOULOT_DOMAINE' | 'SURCHARGE_RECURRENTE';
    description: string;
    gravite: 'CRITIQUE' | 'ELEVE' | 'MOYEN';
  }[];
  risquesRecurrents: string[];
  scoreRisqueGlobal: number; // 0-100, 100 = très risqué
}

export interface RecommandationOrion {
  id: string;
  priorite: 'P1' | 'P2' | 'P3';
  categorie: 'REDISTRIBUTION' | 'PROFIL' | 'DOMAINE' | 'MODE' | 'CAPACITE' | 'PREVISION';
  titre: string;
  description: string;
  justification: string;
  actionConcrete: string;
  impactAttendu: string;
  effort: 'FAIBLE' | 'MOYEN' | 'ELEVE';
}

export interface ProjectionsOrion {
  charge7Jours: {
    heuresPrevues: number;
    capaciteDisponible: number;
    tauxUtilisationPrevu: number;
    statut: 'NORMAL' | 'TENDU' | 'SATURE';
  };
  charge14Jours: {
    heuresPrevues: number;
    capaciteDisponible: number;
    tauxUtilisationPrevu: number;
    statut: 'NORMAL' | 'TENDU' | 'SATURE';
  };
  risquesAnticipes: string[];
  impactTR1TR3: string;
}

export interface ObservationsAdditionnelles {
  anomalies: string[];
  gainsEfficacite: string[];
  notesGestion: string[];
}

export interface RapportOrion {
  resumeExecutif: ResumeExecutifOrion;
  indicateursCles: IndicateursCles;
  diagnosticComplet: {
    capacite: DiagnosticCapacite;
    profils: DiagnosticProfils;
    domaines: DiagnosticDomaines;
    taches: DiagnosticTaches;
    tendances: AnalyseTendances;
    risques: AnalyseRisques;
  };
  recommandations: RecommandationOrion[];
  projections: ProjectionsOrion;
  observations: ObservationsAdditionnelles;
  horodatage: string;
  periodeCouverture: { debut: string; fin: string };
}

// ============================================================================
// FONCTION PRINCIPALE
// ============================================================================

export async function genererRapportOrion(
  dateDebut: Date,
  dateFin: Date
): Promise<RapportOrion> {
  
  // Collecter toutes les données
  const donnees = await collecterDonneesOrion(dateDebut, dateFin);
  
  // Effectuer les analyses
  const capacite = analyserCapaciteSaturation(donnees, dateDebut, dateFin);
  const profils = analyserProfilsTR(donnees, dateDebut, dateFin);
  const domaines = analyserDomaines(donnees);
  const taches = analyserTachesModes(donnees);
  const tendances = analyserTendances(donnees, dateDebut, dateFin);
  const risques = analyserRisques(donnees, capacite, profils, dateDebut, dateFin);
  
  // Générer recommandations
  const recommandations = genererRecommandations(
    capacite,
    profils,
    domaines,
    taches,
    risques
  );
  
  // Projections
  const projections = calculerProjections(donnees, tendances, dateFin);
  
  // Observations
  const observations = genererObservations(donnees, capacite, profils, domaines);
  
  // Indicateurs clés
  const indicateurs = calculerIndicateursCles(
    donnees,
    capacite,
    profils,
    domaines,
    dateDebut,
    dateFin
  );
  
  // Résumé exécutif
  const resume = genererResumeExecutif(
    indicateurs,
    capacite,
    profils,
    risques,
    recommandations
  );
  
  return {
    resumeExecutif: resume,
    indicateursCles: indicateurs,
    diagnosticComplet: {
      capacite,
      profils,
      domaines,
      taches,
      tendances,
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
  };
}

// ============================================================================
// COLLECTE DE DONNÉES
// ============================================================================

interface DonneesOrion {
  traducteurs: any[];
  taches: any[];
  joursOuvrables: Date[];
  tachesHistorique: any[];
}

async function collecterDonneesOrion(
  dateDebut: Date,
  dateFin: Date
): Promise<DonneesOrion> {
  
  // Traducteurs actifs avec toutes leurs données
  const traducteurs = await prisma.traducteur.findMany({
    where: { actif: true },
    include: {
      taches: {
        where: {
          statut: { in: ['PLANIFIEE', 'EN_COURS', 'TERMINEE'] },
          dateEcheance: { gte: dateDebut, lte: dateFin },
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
        },
      },
      pairesLinguistiques: true,
    },
  });

  // Tâches de la période
  const taches = await prisma.tache.findMany({
    where: {
      statut: { in: ['PLANIFIEE', 'EN_COURS', 'TERMINEE'] },
      dateEcheance: { gte: dateDebut, lte: dateFin },
    },
    include: {
      ajustementsTemps: {
        where: {
          date: { gte: dateDebut, lte: dateFin },
          type: 'TACHE',
        },
      },
    },
  });

  // Historique (30 jours avant pour tendances)
  const dateDebutHistorique = subDays(dateDebut, 30);
  const tachesHistorique = await prisma.tache.findMany({
    where: {
      statut: { in: ['PLANIFIEE', 'EN_COURS', 'TERMINEE'] },
      dateEcheance: { gte: dateDebutHistorique, lt: dateDebut },
    },
    include: {
      ajustementsTemps: {
        where: {
          date: { gte: dateDebutHistorique, lt: dateDebut },
          type: 'TACHE',
        },
      },
    },
  });

  // Jours ouvrables
  const joursOuvrables: Date[] = [];
  let currentDate = new Date(dateDebut);
  while (currentDate <= dateFin) {
    if (!estWeekend(currentDate)) {
      joursOuvrables.push(new Date(currentDate));
    }
    currentDate = addDays(currentDate, 1);
  }

  return {
    traducteurs,
    taches,
    joursOuvrables,
    tachesHistorique,
  };
}

// ============================================================================
// ANALYSES
// ============================================================================

function analyserCapaciteSaturation(
  donnees: DonneesOrion,
  dateDebut: Date,
  dateFin: Date
): DiagnosticCapacite {
  
  const tauxParJour: DiagnosticCapacite['tauxUtilisationParJour'] = [];
  let joursCritiques = 0;
  let joursVides = 0;

  donnees.joursOuvrables.forEach((jour) => {
    const jourStr = formatOttawaISO(jour);
    let heuresJour = 0;
    let capaciteJour = 0;

    donnees.traducteurs.forEach((trad) => {
      capaciteJour += trad.capaciteHeuresParJour;
      
      // Heures des tâches
      trad.taches.forEach((tache: any) => {
        tache.ajustementsTemps.forEach((aj: any) => {
          if (formatOttawaISO(aj.date) === jourStr) {
            heuresJour += aj.heures;
          }
        });
      });

      // Soustraire blocages
      trad.ajustementsTemps.forEach((aj: any) => {
        if (formatOttawaISO(aj.date) === jourStr && aj.type === 'BLOCAGE') {
          capaciteJour -= aj.heures;
        }
      });
    });

    const taux = capaciteJour > 0 ? (heuresJour / capaciteJour) * 100 : 0;
    let statut: 'CRITIQUE' | 'ELEVE' | 'NORMAL' | 'FAIBLE' = 'NORMAL';
    
    if (taux > 100) statut = 'CRITIQUE';
    else if (taux > 90) {
      statut = 'ELEVE';
      joursCritiques++;
    } else if (taux < 30) {
      statut = 'FAIBLE';
      joursVides++;
    }

    tauxParJour.push({ date: jourStr, taux: Math.round(taux), statut });
  });

  // Tendance
  const premierePartie = tauxParJour.slice(0, Math.floor(tauxParJour.length / 2));
  const deuxiemePartie = tauxParJour.slice(Math.floor(tauxParJour.length / 2));
  const moyPremiere = premierePartie.reduce((s, t) => s + t.taux, 0) / premierePartie.length;
  const moyDeuxieme = deuxiemePartie.reduce((s, t) => s + t.taux, 0) / deuxiemePartie.length;
  
  let tendanceSaturation: DiagnosticCapacite['tendanceSaturation'] = 'STABLE';
  if (moyDeuxieme > moyPremiere + 5) tendanceSaturation = 'CROISSANTE';
  else if (moyDeuxieme < moyPremiere - 5) tendanceSaturation = 'DECROISSANTE';

  const observations: string[] = [];
  if (joursCritiques > donnees.joursOuvrables.length * 0.2) {
    observations.push(`${joursCritiques} jours en surcharge (>90%) - situation préoccupante`);
  }
  if (joursVides > donnees.joursOuvrables.length * 0.3) {
    observations.push(`${joursVides} jours peu chargés (<30%) - capacité sous-utilisée`);
  }
  if (tendanceSaturation === 'CROISSANTE') {
    observations.push('Tendance à la saturation - surveiller de près');
  }

  return {
    type: 'CAPACITE_SATURATION',
    tauxUtilisationParJour: tauxParJour,
    joursCritiques,
    joursVides,
    tendanceSaturation,
    observations,
  };
}

function analyserProfilsTR(
  donnees: DonneesOrion,
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
    
    const heuresTaches = trad.taches.reduce((sum: number, t: any) => {
      return sum + t.ajustementsTemps.reduce((s: number, aj: any) => s + aj.heures, 0);
    }, 0);

    if (profil === 'TR1') {
      volumeTR1++;
      heuresTR1 += heuresTaches;
      capaciteTR1 += capacite;
      
      // Heures de traduction TR1 (nécessitent révision)
      const heuresTraduction = trad.taches
        .filter((t: any) => t.typeTache === 'TRADUCTION')
        .reduce((sum: number, t: any) => {
          return sum + t.ajustementsTemps.reduce((s: number, aj: any) => s + aj.heures, 0);
        }, 0);
      heuresTraductionTR1 += heuresTraduction;
    } else if (profil === 'TR2') {
      volumeTR2++;
      heuresTR2 += heuresTaches;
      capaciteTR2 += capacite;
      
      const tauxUtil = capacite > 0 ? (heuresTaches / capacite) * 100 : 0;
      if (tauxUtil < 50) {
        tr2SousUtilises.push(trad.nom);
      }
    } else if (profil === 'TR3') {
      volumeTR3++;
      heuresTR3 += heuresTaches;
      capaciteTR3 += capacite;
      
      // Heures de révision disponibles TR3
      const heuresRevision = trad.taches
        .filter((t: any) => t.typeTache === 'REVISION')
        .reduce((sum: number, t: any) => {
          return sum + t.ajustementsTemps.reduce((s: number, aj: any) => s + aj.heures, 0);
        }, 0);
      
      const heuresTraduction = trad.taches
        .filter((t: any) => t.typeTache === 'TRADUCTION')
        .reduce((sum: number, t: any) => {
          return sum + t.ajustementsTemps.reduce((s: number, aj: any) => s + aj.heures, 0);
        }, 0);
      
      heuresRevisionDisponiblesTR3 += heuresRevision;
      
      // TR3 faisant trop de traduction
      if (heuresTraduction > heuresRevision) {
        tr3SurchargesTraduction.push(trad.nom);
      }
    }
  });

  const ratio = heuresRevisionDisponiblesTR3 > 0 
    ? heuresTraductionTR1 / heuresRevisionDisponiblesTR3 
    : 999;
  
  let statutTR1TR3: DiagnosticProfils['chargeTR1VsCapaciteRevisionTR3']['statut'] = 'EQUILIBRE';
  if (ratio > 1.5) statutTR1TR3 = 'CRITIQUE';
  else if (ratio > 1.2) statutTR1TR3 = 'SATURE';
  else if (ratio > 1) statutTR1TR3 = 'TENSION';

  const observations: string[] = [];
  if (statutTR1TR3 !== 'EQUILIBRE') {
    observations.push(`Production TR1 (${heuresTraductionTR1.toFixed(0)}h) dépasse capacité révision TR3 (${heuresRevisionDisponiblesTR3.toFixed(0)}h)`);
  }
  if (tr3SurchargesTraduction.length > 0) {
    observations.push(`${tr3SurchargesTraduction.length} TR3 font plus de traduction que de révision`);
  }
  if (tr2SousUtilises.length > 0) {
    observations.push(`${tr2SousUtilises.length} TR2 sous-utilisés pourraient absorber la traduction`);
  }

  return {
    type: 'TR1_TR2_TR3',
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
      statut: statutTR1TR3,
    },
    tr3SurchargesTraduction,
    tr2SousUtilises,
    observations,
  };
}

function analyserDomaines(donnees: DonneesOrion): DiagnosticDomaines {
  const volumeParDomaine: { [key: string]: number } = {};
  const capaciteParDomaine: { [key: string]: number } = {};
  
  // Calculer volume par domaine (basé sur spécialisation de la tâche)
  donnees.taches.forEach((tache) => {
    const domaine = tache.specialisation || 'Non spécifié';
    volumeParDomaine[domaine] = (volumeParDomaine[domaine] || 0) + tache.heuresTotal;
  });

  // Calculer capacité par domaine (approximatif basé sur spécialisations des traducteurs)
  donnees.traducteurs.forEach((trad) => {
    const specialisations = Array.isArray(trad.specialisations) ? trad.specialisations : [];
    if (specialisations.length > 0) {
      specialisations.forEach((spec: string) => {
        capaciteParDomaine[spec] = (capaciteParDomaine[spec] || 0) + 
          (trad.capaciteHeuresParJour * donnees.joursOuvrables.length);
      });
    } else {
      // Si pas de spécialisation, ajouter à "Généraliste"
      capaciteParDomaine['Généraliste'] = (capaciteParDomaine['Généraliste'] || 0) + 
        (trad.capaciteHeuresParJour * donnees.joursOuvrables.length);
    }
  });

  const volumeTotal = Object.values(volumeParDomaine).reduce((s, v) => s + v, 0);
  const volumeArray = Object.entries(volumeParDomaine)
    .map(([domaine, heures]) => ({
      domaine,
      heures: Math.round(heures * 10) / 10,
      pourcentage: Math.round((heures / volumeTotal) * 100),
    }))
    .sort((a, b) => b.heures - a.heures);

  const capaciteArray = Object.entries(capaciteParDomaine).map(([domaine, cap]) => ({
    domaine,
    capaciteDisponible: Math.round(cap * 10) / 10,
  }));

  // Détecter goulots
  const goulots: DiagnosticDomaines['goulots'] = [];
  volumeArray.forEach((vol) => {
    const cap = capaciteArray.find((c) => c.domaine === vol.domaine);
    if (cap && vol.heures > cap.capaciteDisponible * 0.8) {
      goulots.push({
        domaine: vol.domaine,
        surcharge: Math.round((vol.heures - cap.capaciteDisponible) * 10) / 10,
        traducteursConcernes: [], // TODO
      });
    }
  });

  const observations: string[] = [];
  if (volumeArray.length > 0 && volumeArray[0].pourcentage > 40) {
    observations.push(`${volumeArray[0].domaine} concentre ${volumeArray[0].pourcentage}% du volume`);
  }
  if (goulots.length > 0) {
    observations.push(`${goulots.length} domaine(s) en goulot d'étranglement`);
  }

  return {
    type: 'DOMAINES_SPECIALITES',
    volumeParDomaine: volumeArray,
    capaciteParDomaine: capaciteArray,
    goulots,
    observations,
  };
}

function analyserTachesModes(donnees: DonneesOrion): DiagnosticTaches {
  let heuresTraduction = 0;
  let heuresRevision = 0;
  const modes = { JAT: 0, FIFO: 0, EQUILIBRE: 0, MANUEL: 0 };

  donnees.taches.forEach((tache) => {
    if (tache.typeTache === 'TRADUCTION') {
      heuresTraduction += tache.heuresTotal;
    } else if (tache.typeTache === 'REVISION') {
      heuresRevision += tache.heuresTotal;
    }

    // Détecter mode (approximatif basé sur la répartition)
    // TODO: stocker le mode dans la tâche
    modes.EQUILIBRE++;
  });

  const ratio = heuresRevision > 0 ? heuresTraduction / heuresRevision : 999;
  const modesDominants: string[] = [];
  Object.entries(modes).forEach(([mode, count]) => {
    if (count > donnees.taches.length * 0.3) {
      modesDominants.push(mode);
    }
  });

  const recommandations: string[] = [];
  if (ratio > 5) {
    recommandations.push('Volume traduction très supérieur à révision - vérifier équilibre TR1/TR3');
  }

  return {
    type: 'TACHES_MODES',
    volumeTraductionVsRevision: {
      traduction: Math.round(heuresTraduction * 10) / 10,
      revision: Math.round(heuresRevision * 10) / 10,
      ratio: Math.round(ratio * 100) / 100,
    },
    distributionModes: modes,
    modesDominants,
    recommandationsModes: recommandations,
    observations: [],
  };
}

function analyserTendances(
  donnees: DonneesOrion,
  dateDebut: Date,
  dateFin: Date
): AnalyseTendances {
  
  // Comparer avec historique
  const volumeActuel = donnees.taches.reduce((s, t) => s + t.heuresTotal, 0);
  const volumeHistorique = donnees.tachesHistorique.reduce((s, t) => s + t.heuresTotal, 0);
  
  let tendanceVolume: 'HAUSSE' | 'BAISSE' | 'STABLE' = 'STABLE';
  if (volumeActuel > volumeHistorique * 1.1) tendanceVolume = 'HAUSSE';
  else if (volumeActuel < volumeHistorique * 0.9) tendanceVolume = 'BAISSE';

  return {
    periode: '30j',
    tendanceUtilisation: 'STABLE',
    tendanceVolume,
    comparaisonSemaines: {
      semaineEnCours: { volume: volumeActuel, utilisation: 75 },
      semainePrecedente: { volume: volumeHistorique, utilisation: 70 },
      evolution: ((volumeActuel - volumeHistorique) / volumeHistorique) * 100,
    },
    patterns: [],
  };
}

function analyserRisques(
  donnees: DonneesOrion,
  capacite: DiagnosticCapacite,
  profils: DiagnosticProfils,
  dateDebut: Date,
  dateFin: Date
): AnalyseRisques {
  
  const maintenant = new Date();
  let tachesEnRetard = 0;
  let tachesRisque = 0;

  donnees.taches.forEach((tache) => {
    if (tache.dateEcheance < maintenant && tache.statut !== 'TERMINEE') {
      tachesEnRetard++;
    } else if (differenceInDays(tache.dateEcheance, maintenant) <= 2 && tache.statut === 'PLANIFIEE') {
      tachesRisque++;
    }
  });

  const risquesStructurels: AnalyseRisques['risquesStructurels'] = [];
  
  if (profils.chargeTR1VsCapaciteRevisionTR3.statut === 'CRITIQUE') {
    risquesStructurels.push({
      type: 'MANQUE_TR3',
      description: 'Capacité de révision TR3 insuffisante pour le volume TR1',
      gravite: 'CRITIQUE',
    });
  }

  if (capacite.joursCritiques > donnees.joursOuvrables.length * 0.3) {
    risquesStructurels.push({
      type: 'SURCHARGE_RECURRENTE',
      description: 'Surcharge récurrente sur plus de 30% des jours',
      gravite: 'ELEVE',
    });
  }

  const scoreRisque = Math.min(100,
    (tachesEnRetard * 10) +
    (tachesRisque * 5) +
    (risquesStructurels.length * 20) +
    (capacite.joursCritiques * 2)
  );

  return {
    risquesEcheances: {
      tachesEnRetard,
      tachesRisque,
      impactTotal: `${tachesEnRetard + tachesRisque} tâches concernées`,
    },
    risquesStructurels,
    risquesRecurrents: [],
    scoreRisqueGlobal: Math.round(scoreRisque),
  };
}

// ============================================================================
// RECOMMANDATIONS
// ============================================================================

function genererRecommandations(
  capacite: DiagnosticCapacite,
  profils: DiagnosticProfils,
  domaines: DiagnosticDomaines,
  taches: DiagnosticTaches,
  risques: AnalyseRisques
): RecommandationOrion[] {
  
  const recommandations: RecommandationOrion[] = [];
  let idCounter = 1;

  // P1: Critiques
  if (profils.chargeTR1VsCapaciteRevisionTR3.statut === 'CRITIQUE') {
    recommandations.push({
      id: `orion-rec-${idCounter++}`,
      priorite: 'P1',
      categorie: 'PROFIL',
      titre: 'Déséquilibre TR1/TR3 critique',
      description: `Production TR1 (${profils.chargeTR1VsCapaciteRevisionTR3.heuresTraductionTR1}h) dépasse capacité révision TR3 (${profils.chargeTR1VsCapaciteRevisionTR3.heuresRevisionDisponiblesTR3}h)`,
      justification: 'Risque de goulot de révision et retards sur TR1',
      actionConcrete: 'Réduire charge traduction TR1 ou augmenter capacité révision TR3',
      impactAttendu: 'Respect des délais et qualité maintenue',
      effort: 'ELEVE',
    });
  }

  if (profils.tr3SurchargesTraduction.length > 0) {
    recommandations.push({
      id: `orion-rec-${idCounter++}`,
      priorite: 'P1',
      categorie: 'REDISTRIBUTION',
      titre: 'Libérer TR3 de la traduction',
      description: `${profils.tr3SurchargesTraduction.length} TR3 font trop de traduction: ${profils.tr3SurchargesTraduction.join(', ')}`,
      justification: 'Les TR3 doivent prioriser la révision',
      actionConcrete: 'Transférer traductions TR3 vers TR2 disponibles',
      impactAttendu: 'Capacité de révision augmentée',
      effort: 'MOYEN',
    });
  }

  // P2: Importantes
  if (profils.tr2SousUtilises.length > 0) {
    recommandations.push({
      id: `orion-rec-${idCounter++}`,
      priorite: 'P2',
      categorie: 'CAPACITE',
      titre: 'Sous-utilisation TR2',
      description: `${profils.tr2SousUtilises.length} TR2 sous-utilisés (<50%)`,
      justification: 'Capacité disponible non exploitée',
      actionConcrete: 'Redistribuer tâches de traduction vers ces TR2',
      impactAttendu: 'Meilleure utilisation des ressources',
      effort: 'FAIBLE',
    });
  }

  if (domaines.goulots.length > 0) {
    domaines.goulots.forEach((goulot) => {
      recommandations.push({
        id: `orion-rec-${idCounter++}`,
        priorite: 'P2',
        categorie: 'DOMAINE',
        titre: `Goulot domaine ${goulot.domaine}`,
        description: `Surcharge de ${goulot.surcharge}h dans ${goulot.domaine}`,
        justification: 'Risque de retard sur ce domaine',
        actionConcrete: 'Affecter traducteurs additionnels ou redistribuer',
        impactAttendu: 'Fluidité retrouvée',
        effort: 'MOYEN',
      });
    });
  }

  // P3: Opportunités
  if (capacite.joursVides > capacite.joursCritiques * 2) {
    recommandations.push({
      id: `orion-rec-${idCounter++}`,
      priorite: 'P3',
      categorie: 'PREVISION',
      titre: 'Équilibrage temporel',
      description: `${capacite.joursVides} jours peu chargés vs ${capacite.joursCritiques} jours critiques`,
      justification: 'Répartition inégale dans le temps',
      actionConcrete: 'Lisser la charge en anticipant certaines tâches',
      impactAttendu: 'Charge plus équilibrée',
      effort: 'FAIBLE',
    });
  }

  return recommandations.sort((a, b) => {
    const ordre = { P1: 1, P2: 2, P3: 3 };
    return ordre[a.priorite] - ordre[b.priorite];
  });
}

// ============================================================================
// PROJECTIONS
// ============================================================================

function calculerProjections(
  donnees: DonneesOrion,
  tendances: AnalyseTendances,
  dateFin: Date
): ProjectionsOrion {
  
  // Simplifié pour l'instant
  return {
    charge7Jours: {
      heuresPrevues: 200,
      capaciteDisponible: 240,
      tauxUtilisationPrevu: 83,
      statut: 'NORMAL',
    },
    charge14Jours: {
      heuresPrevues: 420,
      capaciteDisponible: 480,
      tauxUtilisationPrevu: 88,
      statut: 'TENDU',
    },
    risquesAnticipes: [],
    impactTR1TR3: 'Stable si répartition actuelle maintenue',
  };
}

// ============================================================================
// OBSERVATIONS
// ============================================================================

function genererObservations(
  donnees: DonneesOrion,
  capacite: DiagnosticCapacite,
  profils: DiagnosticProfils,
  domaines: DiagnosticDomaines
): ObservationsAdditionnelles {
  
  const anomalies: string[] = [];
  const gainsEfficacite: string[] = [];
  const notesGestion: string[] = [];

  if (capacite.tendanceSaturation === 'CROISSANTE') {
    notesGestion.push('Tendance saturation croissante - anticiper renforcement');
  }

  if (profils.tr2SousUtilises.length > 2) {
    gainsEfficacite.push('Plusieurs TR2 disponibles pour absorber surplus');
  }

  return {
    anomalies,
    gainsEfficacite,
    notesGestion,
  };
}

// ============================================================================
// INDICATEURS CLÉS
// ============================================================================

function calculerIndicateursCles(
  donnees: DonneesOrion,
  capacite: DiagnosticCapacite,
  profils: DiagnosticProfils,
  domaines: DiagnosticDomaines,
  dateDebut: Date,
  dateFin: Date
): IndicateursCles {
  
  const tauxMoyen = capacite.tauxUtilisationParJour.reduce((s, t) => s + t.taux, 0) / 
    capacite.tauxUtilisationParJour.length;

  const pourcentageSurcharge = (capacite.joursCritiques / donnees.joursOuvrables.length) * 100;

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
      tauxUtilisation: 0, // TODO
      volumeTaches: 0, // TODO
      tendance: 'STABLE',
    },
  };
}

// ============================================================================
// RÉSUMÉ EXÉCUTIF
// ============================================================================

function genererResumeExecutif(
  indicateurs: IndicateursCles,
  capacite: DiagnosticCapacite,
  profils: DiagnosticProfils,
  risques: AnalyseRisques,
  recommandations: RecommandationOrion[]
): ResumeExecutifOrion {
  
  let etatGeneral: ResumeExecutifOrion['etatGeneral'] = 'BON';
  
  if (risques.scoreRisqueGlobal > 60) etatGeneral = 'CRITIQUE';
  else if (risques.scoreRisqueGlobal > 40) etatGeneral = 'PREOCCUPANT';
  else if (indicateurs.tauxUtilisationMoyen > 85) etatGeneral = 'ACCEPTABLE';
  else if (indicateurs.tauxUtilisationMoyen < 60) etatGeneral = 'ACCEPTABLE';

  const principauxRisques: string[] = risques.risquesStructurels
    .slice(0, 3)
    .map((r) => r.description);

  const principalesForces: string[] = [];
  if (indicateurs.tauxUtilisationMoyen >= 70 && indicateurs.tauxUtilisationMoyen <= 85) {
    principalesForces.push('Taux d\'utilisation équilibré');
  }
  if (capacite.joursCritiques === 0) {
    principalesForces.push('Aucune surcharge critique');
  }

  const visionEnsemble = `Planning ${etatGeneral.toLowerCase()} avec utilisation moyenne de ${indicateurs.tauxUtilisationMoyen}%. ` +
    `${recommandations.filter((r) => r.priorite === 'P1').length} action(s) critique(s) identifiée(s).`;

  const recommandationCle = recommandations.length > 0 
    ? recommandations[0].titre 
    : 'Maintenir l\'équilibre actuel';

  return {
    visionEnsemble,
    etatGeneral,
    principauxRisques,
    principalesForces,
    recommandationCle,
  };
}
