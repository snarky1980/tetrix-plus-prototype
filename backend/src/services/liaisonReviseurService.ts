/**
 * Service de gestion des liaisons Traducteur-Réviseur
 * 
 * Gère l'attribution des réviseurs (TR03) aux traducteurs (TR01/TR02)
 * et vérifie les disponibilités combinées pour respecter les échéances.
 */

import { PrismaClient, CategorieTraducteur, ModeLiaison } from '@prisma/client';

const prisma = new PrismaClient();

// =====================================================
// Types
// =====================================================

export interface LiaisonReviseur {
  id: string;
  traducteurId: string;
  reviseurId: string;
  estPrincipal: boolean;
  actif: boolean;
  mode: ModeLiaison;
  domaine?: string | null;
  dateFin?: Date | null;
  notes?: string | null;
  creeLe: Date;
  modifieLe: Date;
  traducteur?: TraducteurInfo;
  reviseur?: TraducteurInfo;
}

export interface TraducteurInfo {
  id: string;
  nom: string;
  categorie: CategorieTraducteur;
  division: string;
  capaciteHeuresParJour: number;
  necessiteRevision: boolean;
  actif: boolean;
}

export interface DisponibiliteJour {
  date: string;
  heuresDisponibles: number;
  heuresTaches: number;
  heuresBlocages: number;
  capacite: number;
  plagesLibres: PlageHoraire[];
}

export interface PlageHoraire {
  heureDebut: string;
  heureFin: string;
  duree: number;
}

export interface VerificationDisponibiliteResult {
  traducteurDisponible: boolean;
  reviseurDisponible: boolean;
  disponibiliteCombinee: boolean;
  delaiRespecte: boolean;
  traducteur: {
    id: string;
    nom: string;
    categorie: CategorieTraducteur;
    disponibilites: DisponibiliteJour[];
    heuresNecessaires: number;
    dateFin: string | null;
  };
  reviseur: {
    id: string;
    nom: string;
    estPrincipal: boolean;
    disponibilites: DisponibiliteJour[];
    heuresNecessaires: number;
    dateFin: string | null;
  } | null;
  echeance: string;
  alertes: string[];
  recommandations: string[];
  reviseurAlternatifs?: TraducteurInfo[];
}

export interface CreerLiaisonParams {
  traducteurId: string;
  reviseurId: string;
  estPrincipal?: boolean;
  mode?: ModeLiaison;
  domaine?: string;
  dateFin?: Date;
  notes?: string;
}

export interface VerificationOptions {
  reviseurId?: string; // force un réviseur ponctuel
  domaine?: string;    // spécialisation recherchée
  forceRevision?: boolean; // impose une étape de révision même si le traducteur n'est pas TR01/02 nécessitant révision
  mode?: ModeLiaison;  // ATTITRE ou PONCTUEL
}

// =====================================================
// Fonctions principales
// =====================================================

/**
 * Crée une liaison entre un traducteur et un réviseur
 */
export async function creerLiaison(params: CreerLiaisonParams): Promise<LiaisonReviseur> {
  const { traducteurId, reviseurId, estPrincipal = true, notes, mode = 'ATTITRE', domaine, dateFin } = params;

  // Vérifier que le traducteur existe et n'est pas TR03
  const traducteur = await prisma.traducteur.findUnique({
    where: { id: traducteurId },
  });

  if (!traducteur) {
    throw new Error('Traducteur non trouvé');
  }

  if (traducteur.categorie === 'TR03') {
    throw new Error('Un TR03 ne peut pas avoir de réviseur attitré (il est lui-même réviseur)');
  }

  // Vérifier que le réviseur existe et est TR03
  const reviseur = await prisma.traducteur.findUnique({
    where: { id: reviseurId },
  });

  if (!reviseur) {
    throw new Error('Réviseur non trouvé');
  }

  if (reviseur.categorie !== 'TR03') {
    throw new Error('Seul un TR03 peut être désigné comme réviseur');
  }

  // Si c'est un réviseur principal et liaison attitrée, désactiver les autres liaisons principales
  if (mode === 'ATTITRE' && estPrincipal) {
    await prisma.liaisonReviseur.updateMany({
      where: {
        traducteurId,
        estPrincipal: true,
        actif: true,
      },
      data: {
        estPrincipal: false,
      },
    });
  }

  // Créer ou mettre à jour la liaison
  const liaison = await prisma.liaisonReviseur.upsert({
    where: {
      traducteurId_reviseurId: {
        traducteurId,
        reviseurId,
      },
    },
    update: {
      estPrincipal: mode === 'ATTITRE' ? estPrincipal : false,
      actif: true,
      mode,
      domaine,
      dateFin,
      notes,
    },
    create: {
      traducteurId,
      reviseurId,
      estPrincipal: mode === 'ATTITRE' ? estPrincipal : false,
      mode,
      domaine,
      dateFin,
      notes,
    },
    include: {
      traducteur: true,
      reviseur: true,
    },
  });

  return liaison;
}

/**
 * Récupère les liaisons d'un traducteur
 */
export async function obtenirLiaisonsTraducteur(traducteurId: string): Promise<LiaisonReviseur[]> {
  const liaisons = await prisma.liaisonReviseur.findMany({
    where: {
      traducteurId,
      actif: true,
    },
    include: {
      reviseur: true,
    },
    orderBy: [
      { estPrincipal: 'desc' },
      { creeLe: 'asc' },
    ],
  });

  return liaisons;
}

/**
 * Récupère les traducteurs révisés par un TR03
 */
export async function obtenirTraducteursRevises(reviseurId: string): Promise<LiaisonReviseur[]> {
  const liaisons = await prisma.liaisonReviseur.findMany({
    where: {
      reviseurId,
      actif: true,
    },
    include: {
      traducteur: true,
    },
    orderBy: [
      { estPrincipal: 'desc' },
      { creeLe: 'asc' },
    ],
  });

  return liaisons;
}

/**
 * Récupère le réviseur principal d'un traducteur
 */
export async function obtenirReviseurPrincipal(traducteurId: string): Promise<TraducteurInfo | null> {
  const liaison = await prisma.liaisonReviseur.findFirst({
    where: {
      traducteurId,
      estPrincipal: true,
      actif: true,
    },
    include: {
      reviseur: true,
    },
  });

  return liaison?.reviseur || null;
}

/**
 * Supprime une liaison
 */
export async function supprimerLiaison(liaisonId: string): Promise<void> {
  await prisma.liaisonReviseur.update({
    where: { id: liaisonId },
    data: { actif: false },
  });
}

/**
 * Récupère tous les TR03 disponibles pour être réviseurs
 */
export async function obtenirReviseursPotentiels(division?: string, domaine?: string): Promise<TraducteurInfo[]> {
  const reviseurs = await prisma.traducteur.findMany({
    where: {
      categorie: 'TR03',
      actif: true,
      ...(division ? { division } : {}),
      ...(domaine ? { specialisations: { has: domaine } } : {}),
    },
    orderBy: { nom: 'asc' },
  });

  return reviseurs;
}

/**
 * Récupère les traducteurs qui nécessitent une révision
 */
export async function obtenirTraducteursNecessitantRevision(): Promise<TraducteurInfo[]> {
  const traducteurs = await prisma.traducteur.findMany({
    where: {
      OR: [
        { categorie: 'TR01' },
        { categorie: 'TR02', necessiteRevision: true },
      ],
      actif: true,
    },
    orderBy: [
      { categorie: 'asc' },
      { nom: 'asc' },
    ],
  });

  return traducteurs;
}

// =====================================================
// Vérification de disponibilité combinée
// =====================================================

/**
 * Calcule les heures de révision nécessaires
 * Généralement 15-25% du temps de traduction
 */
function calculerHeuresRevision(heuresTraduction: number): number {
  const tauxRevision = 0.20; // 20% du temps de traduction
  return Math.ceil(heuresTraduction * tauxRevision * 10) / 10;
}

/**
 * Récupère les disponibilités d'un traducteur pour une période
 */
async function obtenirDisponibilites(
  traducteurId: string,
  dateDebut: Date,
  dateFin: Date
): Promise<DisponibiliteJour[]> {
  const traducteur = await prisma.traducteur.findUnique({
    where: { id: traducteurId },
  });

  if (!traducteur) {
    throw new Error('Traducteur non trouvé');
  }

  const disponibilites: DisponibiliteJour[] = [];
  const currentDate = new Date(dateDebut);
  currentDate.setHours(0, 0, 0, 0);

  while (currentDate <= dateFin) {
    // Ignorer les week-ends
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Récupérer les ajustements pour ce jour
      const ajustements = await prisma.ajustementTemps.findMany({
        where: {
          traducteurId,
          date: {
            gte: new Date(dateStr + 'T00:00:00Z'),
            lt: new Date(dateStr + 'T23:59:59Z'),
          },
        },
      });

      const heuresTaches = ajustements
        .filter(a => a.type === 'TACHE')
        .reduce((sum, a) => sum + a.heures, 0);

      const heuresBlocages = ajustements
        .filter(a => a.type === 'BLOCAGE')
        .reduce((sum, a) => sum + a.heures, 0);

      const capacite = traducteur.capaciteHeuresParJour;
      const heuresDisponibles = Math.max(0, capacite - heuresTaches - heuresBlocages);

      // Calculer les plages libres (simplification)
      const plagesLibres: PlageHoraire[] = [];
      if (heuresDisponibles > 0) {
        plagesLibres.push({
          heureDebut: '08:00',
          heureFin: '16:00',
          duree: heuresDisponibles,
        });
      }

      disponibilites.push({
        date: dateStr,
        heuresDisponibles,
        heuresTaches,
        heuresBlocages,
        capacite,
        plagesLibres,
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return disponibilites;
}

/**
 * Vérifie si un traducteur peut être affecté à une tâche
 * en tenant compte de la disponibilité du réviseur
 */
export async function verifierDisponibiliteCombinee(
  traducteurId: string,
  heuresTraduction: number,
  dateEcheance: Date,
  options: VerificationOptions = {}
): Promise<VerificationDisponibiliteResult> {
  const alertes: string[] = [];
  const recommandations: string[] = [];

  // Récupérer le traducteur
  const traducteur = await prisma.traducteur.findUnique({
    where: { id: traducteurId },
    include: {
      revisePar: {
        where: { actif: true },
        include: { reviseur: true },
        orderBy: { estPrincipal: 'desc' },
      },
    },
  });

  if (!traducteur) {
    throw new Error('Traducteur non trouvé');
  }

  const dateDebut = new Date();
  dateDebut.setHours(0, 0, 0, 0);

  // Calculer les disponibilités du traducteur
  const disponibilitesTraducteur = await obtenirDisponibilites(
    traducteurId,
    dateDebut,
    dateEcheance
  );

  const heuresDisponiblesTraducteur = disponibilitesTraducteur.reduce(
    (sum, d) => sum + d.heuresDisponibles,
    0
  );

  const traducteurDisponible = heuresDisponiblesTraducteur >= heuresTraduction;

  // Calculer la date de fin de traduction estimée
  let heuresRestantes = heuresTraduction;
  let dateFinTraduction: string | null = null;

  for (const jour of disponibilitesTraducteur) {
    if (heuresRestantes <= 0) break;
    const heuresUtilisees = Math.min(heuresRestantes, jour.heuresDisponibles);
    heuresRestantes -= heuresUtilisees;
    if (heuresRestantes <= 0) {
      dateFinTraduction = jour.date;
    }
  }

  // Vérifier si le traducteur nécessite une révision
  const necessiteRevision = options.forceRevision || traducteur.categorie === 'TR01' ||
    (traducteur.categorie === 'TR02' && traducteur.necessiteRevision);

  let reviseurInfo: VerificationDisponibiliteResult['reviseur'] = null;
  let reviseurDisponible = true;
  let reviseurAlternatifs: TraducteurInfo[] = [];

  if (necessiteRevision) {
    const heuresRevision = calculerHeuresRevision(heuresTraduction);
    // Si l'appel fournit un réviseur ponctuel, on le prend en priorité
    let reviseur = options.reviseurId
      ? await prisma.traducteur.findUnique({ where: { id: options.reviseurId } })
      : undefined;

    const liaisonPrincipale = !reviseur
      ? traducteur.revisePar.find(l => l.estPrincipal)
      : undefined;
    if (!reviseur) {
      reviseur = liaisonPrincipale?.reviseur;
    }

    if (!reviseur) {
      alertes.push(`⚠️ Ce ${traducteur.categorie} n'a pas de réviseur attitré`);
      recommandations.push('Assignez un réviseur TR03 à ce traducteur');
      reviseurDisponible = false;

      // Proposer des réviseurs potentiels
      reviseurAlternatifs = await obtenirReviseursPotentiels(traducteur.division, options.domaine);
    } else {
      // Date de début de révision = fin de traduction + 1 jour
      const dateDebutRevision = dateFinTraduction 
        ? new Date(dateFinTraduction)
        : new Date();
      dateDebutRevision.setDate(dateDebutRevision.getDate() + 1);

      const disponibilitesReviseur = await obtenirDisponibilites(
        reviseur.id,
        dateDebutRevision,
        dateEcheance
      );

      const heuresDisponiblesReviseur = disponibilitesReviseur.reduce(
        (sum, d) => sum + d.heuresDisponibles,
        0
      );

      reviseurDisponible = heuresDisponiblesReviseur >= heuresRevision;

      // Calculer la date de fin de révision
      heuresRestantes = heuresRevision;
      let dateFinRevision: string | null = null;

      for (const jour of disponibilitesReviseur) {
        if (heuresRestantes <= 0) break;
        const heuresUtilisees = Math.min(heuresRestantes, jour.heuresDisponibles);
        heuresRestantes -= heuresUtilisees;
        if (heuresRestantes <= 0) {
          dateFinRevision = jour.date;
        }
      }

      reviseurInfo = {
        id: reviseur.id,
        nom: reviseur.nom,
        estPrincipal: liaisonPrincipale?.estPrincipal || options.mode === 'ATTITRE',
        disponibilites: disponibilitesReviseur,
        heuresNecessaires: heuresRevision,
        dateFin: dateFinRevision,
      };

      if (!reviseurDisponible) {
        alertes.push(`⚠️ Le réviseur ${reviseur.nom} n'a pas assez de disponibilité (${heuresDisponiblesReviseur}h dispo, ${heuresRevision}h nécessaires)`);
        
        // Chercher des réviseurs alternatifs
        const autresReviseurs = await prisma.traducteur.findMany({
          where: {
            categorie: 'TR03',
            actif: true,
            id: { not: reviseur.id },
            division: traducteur.division,
          },
        });

        for (const altReviseur of autresReviseurs) {
          const dispoAlt = await obtenirDisponibilites(
            altReviseur.id,
            dateDebutRevision,
            dateEcheance
          );
          const heuresDispoAlt = dispoAlt.reduce((sum, d) => sum + d.heuresDisponibles, 0);
          
          if (heuresDispoAlt >= heuresRevision) {
            reviseurAlternatifs.push(altReviseur);
          }
        }

        if (reviseurAlternatifs.length > 0) {
          recommandations.push(`${reviseurAlternatifs.length} réviseur(s) alternatif(s) disponible(s)`);
        } else {
          recommandations.push('Envisager de décaler l\'échéance ou de répartir la charge');
        }
      }
    }
  }

  // Vérifier le respect de l'échéance
  const dateEcheanceStr = dateEcheance.toISOString().split('T')[0];
  let delaiRespecte = true;

  if (!traducteurDisponible) {
    alertes.push(`❌ Capacité insuffisante pour le traducteur (${heuresDisponiblesTraducteur}h dispo, ${heuresTraduction}h demandées)`);
    delaiRespecte = false;
  }

  if (dateFinTraduction && dateFinTraduction > dateEcheanceStr) {
    alertes.push(`❌ La traduction ne sera pas terminée avant l'échéance`);
    delaiRespecte = false;
  }

  if (reviseurInfo?.dateFin && reviseurInfo.dateFin > dateEcheanceStr) {
    alertes.push(`❌ La révision ne sera pas terminée avant l'échéance`);
    delaiRespecte = false;
  }

  if (alertes.length === 0) {
    recommandations.push('✅ Attribution possible dans les délais');
  }

  return {
    traducteurDisponible,
    reviseurDisponible,
    disponibiliteCombinee: traducteurDisponible && reviseurDisponible,
    delaiRespecte,
    traducteur: {
      id: traducteur.id,
      nom: traducteur.nom,
      categorie: traducteur.categorie,
      disponibilites: disponibilitesTraducteur,
      heuresNecessaires: heuresTraduction,
      dateFin: dateFinTraduction,
    },
    reviseur: reviseurInfo,
    echeance: dateEcheanceStr,
    alertes,
    recommandations,
    reviseurAlternatifs: reviseurAlternatifs.length > 0 ? reviseurAlternatifs : undefined,
  };
}

/**
 * Met à jour la catégorie d'un traducteur
 */
export async function mettreAJourCategorie(
  traducteurId: string,
  categorie: CategorieTraducteur,
  necessiteRevision?: boolean
): Promise<TraducteurInfo> {
  const traducteur = await prisma.traducteur.update({
    where: { id: traducteurId },
    data: {
      categorie,
      necessiteRevision: categorie === 'TR02' ? (necessiteRevision ?? false) : (categorie === 'TR01'),
    },
  });

  // Si promu à TR03, supprimer les liaisons où il était révisé
  if (categorie === 'TR03') {
    await prisma.liaisonReviseur.updateMany({
      where: { traducteurId },
      data: { actif: false },
    });
  }

  return traducteur;
}

/**
 * Récupère le résumé des liaisons pour le dashboard
 */
export async function obtenirResumeLiaisons(division?: string) {
  const whereClause = division ? { division } : {};

  const [tr01, tr02NecessiteRevision, tr02Autonome, tr03, liaisonsAttitres, liaisonsPonctuelles] = await Promise.all([
    prisma.traducteur.count({
      where: { ...whereClause, categorie: 'TR01', actif: true },
    }),
    prisma.traducteur.count({
      where: { ...whereClause, categorie: 'TR02', necessiteRevision: true, actif: true },
    }),
    prisma.traducteur.count({
      where: { ...whereClause, categorie: 'TR02', necessiteRevision: false, actif: true },
    }),
    prisma.traducteur.count({
      where: { ...whereClause, categorie: 'TR03', actif: true },
    }),
    prisma.liaisonReviseur.count({
      where: { actif: true, mode: 'ATTITRE' },
    }),
    prisma.liaisonReviseur.count({
      where: { actif: true, mode: 'PONCTUEL' },
    }),
  ]);

  // Traducteurs sans réviseur attitré
  const sansReviseur = await prisma.traducteur.findMany({
    where: {
      ...whereClause,
      actif: true,
      OR: [
        { categorie: 'TR01' },
        { categorie: 'TR02', necessiteRevision: true },
      ],
      revisePar: {
        none: { actif: true, estPrincipal: true },
      },
    },
    select: { id: true, nom: true, categorie: true },
  });

  const baseRevision = tr01 + tr02NecessiteRevision;
  const couverture = baseRevision > 0 ? Math.round(((baseRevision - sansReviseur.length) / baseRevision) * 100) : 100;

  return {
    statistiques: {
      tr01,
      tr02NecessiteRevision,
      tr02Autonome,
      tr03,
      liaisonsActives: liaisonsAttitres + liaisonsPonctuelles,
      liaisonsAttitres,
      liaisonsPonctuelles,
      sansReviseur: sansReviseur.length,
      tauxCouvertureObligatoire: couverture,
    },
    traducteursSansReviseur: sansReviseur,
  };
}

export default {
  creerLiaison,
  supprimerLiaison,
  obtenirLiaisonsTraducteur,
  obtenirTraducteursRevises,
  obtenirReviseurPrincipal,
  obtenirReviseursPotentiels,
  obtenirTraducteursNecessitantRevision,
  verifierDisponibiliteCombinee,
  mettreAJourCategorie,
  obtenirResumeLiaisons,
};
