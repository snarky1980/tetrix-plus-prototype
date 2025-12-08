import prisma from '../config/database';
import { addDays } from 'date-fns';
import { estWeekend } from './planificationService';

interface TraducteurUtilisation {
  id: string;
  nom: string;
  capaciteTotal: number;
  heuresAssignees: number;
  tauxUtilisation: number;
  joursDisponibles: number;
  taches: any[];
}

interface ProblemeDetecte {
  type: 'SURCHARGE' | 'SOUS_UTILISATION' | 'PIC_CHARGE' | 'GOULOT';
  gravite: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  description: string;
  traducteurId?: string;
  date?: string;
  impact: string;
}

interface Suggestion {
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

interface AnalyseOptimisation {
  periode: { dateDebut: string; dateFin: string };
  score: number;
  ecartType: number;
  problemes: ProblemeDetecte[];
  traducteurs: TraducteurUtilisation[];
  joursAuDessusSeuil: number;
  capaciteGaspillee: number;
}

/**
 * Analyser la planification actuelle pour détecter les déséquilibres
 */
export async function analyserPlanification(
  dateDebut: Date,
  dateFin: Date
): Promise<AnalyseOptimisation> {
  // Récupérer tous les traducteurs actifs
  const traducteurs = await prisma.traducteur.findMany({
    where: { actif: true },
    include: {
      taches: {
        where: {
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
          client: true,
          sousDomaine: true,
          paireLinguistique: true,
        },
      },
      ajustementsTemps: {
        where: {
          date: { gte: dateDebut, lte: dateFin },
        },
      },
    },
  });

  // Calculer le nombre de jours ouvrables dans la période
  let joursOuvrables = 0;
  let currentDate = new Date(dateDebut);
  while (currentDate <= dateFin) {
    if (!estWeekend(currentDate)) {
      joursOuvrables++;
    }
    currentDate = addDays(currentDate, 1);
  }

  // Analyser chaque traducteur
  const utilisations: TraducteurUtilisation[] = traducteurs.map((trad) => {
    const capaciteTotal = trad.capaciteHeuresParJour * joursOuvrables;
    
    // Calculer les heures assignées sur la période
    const heuresAssignees = trad.taches.reduce((sum, tache) => {
      const heuresPeriode = tache.ajustementsTemps
        .filter((aj) => aj.date >= dateDebut && aj.date <= dateFin)
        .reduce((s, aj) => s + aj.heures, 0);
      return sum + heuresPeriode;
    }, 0);

    // Soustraire les blocages
    const heuresBlocages = trad.ajustementsTemps
      .filter((aj) => aj.type === 'BLOCAGE')
      .reduce((s, aj) => s + aj.heures, 0);

    const capaciteEffective = capaciteTotal - heuresBlocages;
    const tauxUtilisation = capaciteEffective > 0 ? (heuresAssignees / capaciteEffective) * 100 : 0;

    return {
      id: trad.id,
      nom: trad.nom,
      capaciteTotal: capaciteEffective,
      heuresAssignees,
      tauxUtilisation,
      joursDisponibles: joursOuvrables,
      taches: trad.taches,
    };
  });

  // Détecter les problèmes
  const problemes: ProblemeDetecte[] = [];

  utilisations.forEach((util) => {
    if (util.tauxUtilisation > 100) {
      problemes.push({
        type: 'SURCHARGE',
        gravite: util.tauxUtilisation > 120 ? 'ELEVE' : 'MOYEN',
        description: `${util.nom} est surchargé à ${util.tauxUtilisation.toFixed(0)}%`,
        traducteurId: util.id,
        impact: `${(util.heuresAssignees - util.capaciteTotal).toFixed(1)}h de surcharge`,
      });
    } else if (util.tauxUtilisation < 50) {
      problemes.push({
        type: 'SOUS_UTILISATION',
        gravite: 'FAIBLE',
        description: `${util.nom} est sous-utilisé à ${util.tauxUtilisation.toFixed(0)}%`,
        traducteurId: util.id,
        impact: `${(util.capaciteTotal - util.heuresAssignees).toFixed(1)}h de capacité disponible`,
      });
    }
  });

  // Calculer l'écart-type
  const moyenneUtilisation = utilisations.reduce((s, u) => s + u.tauxUtilisation, 0) / utilisations.length;
  const variance = utilisations.reduce((s, u) => s + Math.pow(u.tauxUtilisation - moyenneUtilisation, 2), 0) / utilisations.length;
  const ecartType = Math.sqrt(variance);

  // Score d'équilibre (100 = parfait, 0 = très déséquilibré)
  const score = Math.max(0, 100 - ecartType);

  // Capacité gaspillée
  const capaciteGaspillee = utilisations
    .filter((u) => u.tauxUtilisation < 60)
    .reduce((s, u) => s + (u.capaciteTotal - u.heuresAssignees), 0);

  return {
    periode: {
      dateDebut: dateDebut.toISOString().split('T')[0],
      dateFin: dateFin.toISOString().split('T')[0],
    },
    score: Math.round(score),
    ecartType: Math.round(ecartType * 10) / 10,
    problemes,
    traducteurs: utilisations,
    joursAuDessusSeuil: 0, // TODO: implémenter analyse par jour
    capaciteGaspillee: Math.round(capaciteGaspillee * 10) / 10,
  };
}

/**
 * Générer des suggestions de rééquilibrage
 */
export async function genererSuggestions(
  dateDebut: Date,
  dateFin: Date
): Promise<Suggestion[]> {
  const analyse = await analyserPlanification(dateDebut, dateFin);
  const suggestions: Suggestion[] = [];

  // Trouver les traducteurs surchargés et sous-utilisés
  const surcharges = analyse.traducteurs.filter((t) => t.tauxUtilisation > 90);
  const sousUtilises = analyse.traducteurs.filter((t) => t.tauxUtilisation < 60);

  // Pour chaque traducteur surchargé, trouver des tâches à réassigner
  surcharges.forEach((surcharge) => {
    // Trier les tâches par heures décroissant
    const tachesReassignables = surcharge.taches
      .filter((t) => t.ajustementsTemps.length > 0)
      .sort((a, b) => b.heuresTotal - a.heuresTotal);

    tachesReassignables.forEach((tache) => {
      // Trouver un traducteur sous-utilisé avec les mêmes compétences
      const candidat = sousUtilises.find((sousUtil) => {
        // Vérifier les compétences linguistiques
        const tradCible = analyse.traducteurs.find((t) => t.id === sousUtil.id);
        if (!tradCible) return false;

        // Pour l'instant, accepter tous les traducteurs sous-utilisés
        // TODO: vérifier les compétences linguistiques et domaines
        return (
          sousUtil.id !== surcharge.id &&
          sousUtil.capaciteTotal - sousUtil.heuresAssignees >= tache.heuresTotal
        );
      });

      if (candidat) {
        const nouveauTauxSource = ((surcharge.heuresAssignees - tache.heuresTotal) / surcharge.capaciteTotal) * 100;
        const nouveauTauxCible = ((candidat.heuresAssignees + tache.heuresTotal) / candidat.capaciteTotal) * 100;

        // Ne suggérer que si ça améliore la situation
        if (nouveauTauxSource >= 70 && nouveauTauxCible <= 85) {
          suggestions.push({
            id: `suggestion-${tache.id}-${candidat.id}`,
            type: 'REASSIGNER',
            tacheId: tache.id,
            tacheNumero: tache.numeroProjet,
            heuresTotal: tache.heuresTotal,
            traducteurSourceId: surcharge.id,
            traducteurSourceNom: surcharge.nom,
            traducteurCibleId: candidat.id,
            traducteurCibleNom: candidat.nom,
            raison: `${surcharge.nom} à ${surcharge.tauxUtilisation.toFixed(0)}%, ${candidat.nom} à ${candidat.tauxUtilisation.toFixed(0)}%`,
            impactSource: `${surcharge.tauxUtilisation.toFixed(0)}% → ${nouveauTauxSource.toFixed(0)}%`,
            impactCible: `${candidat.tauxUtilisation.toFixed(0)}% → ${nouveauTauxCible.toFixed(0)}%`,
            priorite: Math.abs(surcharge.tauxUtilisation - 80) + Math.abs(candidat.tauxUtilisation - 80),
            nouveauTauxSource,
            nouveauTauxCible,
          });
        }
      }
    });
  });

  // Trier par priorité (plus haut = plus urgent)
  return suggestions.sort((a, b) => b.priorite - a.priorite).slice(0, 10);
}

/**
 * Appliquer une suggestion de réassignation
 */
export async function appliquerReassignation(
  tacheId: string,
  nouveauTraducteurId: string
): Promise<void> {
  // Mettre à jour la tâche
  await prisma.tache.update({
    where: { id: tacheId },
    data: { traducteurId: nouveauTraducteurId },
  });

  // Note: Les ajustements de temps restent liés à la tâche
  // Le système recalculera automatiquement la disponibilité du nouveau traducteur
}
