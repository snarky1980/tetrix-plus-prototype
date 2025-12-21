/**
 * Service de gestion de l'historique des modifications de tâches
 */
import prisma from '../config/database';

export interface EnregistrementHistorique {
  tacheId: string;
  action: 'CREATION' | 'MODIFICATION' | 'REASSIGNATION' | 'STATUT_CHANGE' | 'REPARTITION_CHANGE' | 'SUPPRESSION';
  champModifie?: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
  utilisateurId: string;
  utilisateur: string;
  details?: string;
}

/**
 * Enregistre une entrée dans l'historique d'une tâche
 */
export async function enregistrerHistorique(entry: EnregistrementHistorique): Promise<void> {
  try {
    await prisma.historiqueTache.create({
      data: {
        tacheId: entry.tacheId,
        action: entry.action,
        champModifie: entry.champModifie,
        ancienneValeur: entry.ancienneValeur,
        nouvelleValeur: entry.nouvelleValeur,
        utilisateurId: entry.utilisateurId,
        utilisateur: entry.utilisateur,
        details: entry.details,
      },
    });
  } catch (error) {
    console.error('[Historique] Erreur enregistrement:', error);
    // Ne pas faire échouer l'opération principale si l'historique échoue
  }
}

/**
 * Enregistre la création d'une tâche
 */
export async function enregistrerCreation(
  tacheId: string,
  utilisateurId: string,
  utilisateur: string,
  details?: object
): Promise<void> {
  await enregistrerHistorique({
    tacheId,
    action: 'CREATION',
    utilisateurId,
    utilisateur,
    details: details ? JSON.stringify(details) : undefined,
  });
}

/**
 * Enregistre les modifications d'une tâche en comparant les valeurs
 */
export async function enregistrerModifications(
  tacheId: string,
  utilisateurId: string,
  utilisateur: string,
  anciennesTaches: Record<string, any>,
  nouvellesTaches: Record<string, any>
): Promise<void> {
  // Mapper les noms de champs vers des labels lisibles
  const champsLabels: Record<string, string> = {
    numeroProjet: 'Numéro de projet',
    description: 'Description',
    specialisation: 'Spécialisation',
    heuresTotal: 'Heures totales',
    compteMots: 'Compte de mots',
    dateEcheance: 'Date d\'échéance',
    statut: 'Statut',
    typeTache: 'Type de tâche',
    priorite: 'Priorité',
    traducteurId: 'Traducteur assigné',
    clientId: 'Client',
    sousDomaineId: 'Sous-domaine',
    paireLinguistiqueId: 'Paire linguistique',
    modeDistribution: 'Mode de distribution',
  };

  // Champs à suivre
  const champsASuivre = Object.keys(champsLabels);

  for (const champ of champsASuivre) {
    const ancienne = anciennesTaches[champ];
    const nouvelle = nouvellesTaches[champ];

    // Comparer les valeurs (traiter undefined et null comme équivalents)
    const ancienneStr = formatValeur(champ, ancienne);
    const nouvelleStr = formatValeur(champ, nouvelle);

    if (ancienneStr !== nouvelleStr && nouvelle !== undefined) {
      // Déterminer le type d'action
      let action: EnregistrementHistorique['action'] = 'MODIFICATION';
      if (champ === 'traducteurId') {
        action = 'REASSIGNATION';
      } else if (champ === 'statut') {
        action = 'STATUT_CHANGE';
      }

      await enregistrerHistorique({
        tacheId,
        action,
        champModifie: champsLabels[champ] || champ,
        ancienneValeur: ancienneStr,
        nouvelleValeur: nouvelleStr,
        utilisateurId,
        utilisateur,
      });
    }
  }
}

/**
 * Enregistre un changement de répartition
 */
export async function enregistrerChangementRepartition(
  tacheId: string,
  utilisateurId: string,
  utilisateur: string,
  ancienneRepartition: { date: string; heures: number }[],
  nouvelleRepartition: { date: string; heures: number }[]
): Promise<void> {
  const formatRepartition = (rep: { date: string; heures: number }[]) => {
    return rep.map(r => `${r.date}: ${r.heures}h`).join(', ');
  };

  await enregistrerHistorique({
    tacheId,
    action: 'REPARTITION_CHANGE',
    champModifie: 'Répartition des heures',
    ancienneValeur: formatRepartition(ancienneRepartition),
    nouvelleValeur: formatRepartition(nouvelleRepartition),
    utilisateurId,
    utilisateur,
  });
}

/**
 * Récupère l'historique d'une tâche
 */
export async function obtenirHistorique(tacheId: string) {
  return prisma.historiqueTache.findMany({
    where: { tacheId },
    orderBy: { creeLe: 'desc' },
  });
}

/**
 * Formate une valeur pour l'affichage dans l'historique
 */
function formatValeur(champ: string, valeur: any): string {
  if (valeur === null || valeur === undefined) {
    return '(vide)';
  }

  // Formater les dates
  if (champ === 'dateEcheance' && valeur instanceof Date) {
    return valeur.toISOString().split('T')[0];
  }

  // Formater les statuts
  if (champ === 'statut') {
    const statuts: Record<string, string> = {
      'PLANIFIEE': 'Planifiée',
      'EN_COURS': 'En cours',
      'TERMINEE': 'Terminée',
    };
    return statuts[valeur] || valeur;
  }

  // Formater les types
  if (champ === 'typeTache') {
    const types: Record<string, string> = {
      'TRADUCTION': 'Traduction',
      'REVISION': 'Révision',
      'RELECTURE': 'Relecture',
      'ENCADREMENT': 'Encadrement',
      'AUTRE': 'Autre',
    };
    return types[valeur] || valeur;
  }

  // Formater les priorités
  if (champ === 'priorite') {
    const priorites: Record<string, string> = {
      'URGENT': 'Urgent',
      'REGULIER': 'Régulier',
    };
    return priorites[valeur] || valeur;
  }

  return String(valeur);
}
