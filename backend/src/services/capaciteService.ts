import prisma from '../config/database';
import { startOfDayOttawa } from '../utils/dateTimeOttawa';

export interface CapaciteResult {
  capacite: number;
  heuresActuelles: number;
  disponible: number;
  depassement: boolean;
}

/**
 * Obtenir capacité disponible pour un jour donné
 * @param traducteurId ID du traducteur
 * @param date Date du jour (sera normalisée à minuit Ottawa)
 * @param ignorerTacheId ID de tâche à exclure du calcul (optionnel)
 * @returns Heures disponibles (capacité - ajustements - blocages)
 */
export async function capaciteDisponibleJour(
  traducteurId: string,
  date: Date,
  ignorerTacheId?: string
): Promise<number> {
  const traducteur = await prisma.traducteur.findUnique({ where: { id: traducteurId } });
  if (!traducteur) throw new Error('Traducteur introuvable');
  
  const dateNormalisee = startOfDayOttawa(date);
  
  // Récupérer tous les ajustements pour ce jour (incluant blocages et tâches)
  const ajustements = await prisma.ajustementTemps.findMany({
    where: {
      traducteurId,
      date: { equals: dateNormalisee },
      ...(ignorerTacheId ? { NOT: { tacheId: ignorerTacheId } } : {})
    }
  });
  
  const heuresUtilisees = ajustements.reduce((s, a) => s + a.heures, 0);
  const disponible = Math.max(traducteur.capaciteHeuresParJour - heuresUtilisees, 0);
  
  return disponible;
}

export async function verifierCapaciteJournaliere(
  traducteurId: string,
  date: Date,
  heuresSupplementaires: number,
  ignorerTacheId?: string
): Promise<CapaciteResult> {
  const traducteur = await prisma.traducteur.findUnique({ where: { id: traducteurId } });
  if (!traducteur) throw new Error('Traducteur introuvable');
  
  const dateNormalisee = startOfDayOttawa(date);
  const ajustements = await prisma.ajustementTemps.findMany({
    where: {
      traducteurId,
      date: { equals: dateNormalisee },
      ...(ignorerTacheId ? { NOT: { tacheId: ignorerTacheId } } : {})
    }
  });
  
  const heuresActuelles = ajustements.reduce((s, a) => s + a.heures, 0);
  const capacite = traducteur.capaciteHeuresParJour;
  const disponible = capacite - heuresActuelles;
  const depassement = heuresActuelles + heuresSupplementaires > capacite + 1e-6;
  return { capacite, heuresActuelles, disponible, depassement };
}
