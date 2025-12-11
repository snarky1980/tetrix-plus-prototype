import prisma from '../config/database';
import { startOfDayOttawa, differenceInHoursOttawa } from '../utils/dateTimeOttawa';

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

/**
 * Calcule le nombre d'heures disponibles dans une plage horaire
 * NOUVEAU: Support mode timestamp avec heures précises
 * 
 * @param dateDebut Date/heure de début (si date seule, utilise 00:00:00)
 * @param dateFin Date/heure de fin (si date seule, utilise 23:59:59)
 * @param soustraireDejeAutomatiquement Si true, retire 1h pour pause déjeuner (12h-13h)
 * @returns Nombre d'heures disponibles (décimal)
 * 
 * @example
 * // Journée complète
 * capaciteDisponiblePlageHoraire(
 *   parseOttawaDateISO('2025-12-15'),
 *   parseOttawaDateISO('2025-12-15'),
 *   true
 * ); // 7h (8h - 1h déjeuner)
 * 
 * // Plage horaire précise
 * capaciteDisponiblePlageHoraire(
 *   parseOttawaDateTimeISO('2025-12-15T09:00:00'),
 *   parseOttawaDateTimeISO('2025-12-15T17:30:00'),
 *   true
 * ); // 7.5h (8.5h - 1h déjeuner)
 */
export function capaciteDisponiblePlageHoraire(
  dateDebut: Date,
  dateFin: Date,
  soustraireDejeAutomatiquement: boolean = true
): number {
  // Calcul différence brute en heures
  let heuresDisponibles = differenceInHoursOttawa(dateDebut, dateFin);
  
  // Soustraire pause déjeuner si demandé (1h systématique: 12h-13h)
  if (soustraireDejeAutomatiquement && heuresDisponibles > 1) {
    heuresDisponibles = Math.max(heuresDisponibles - 1, 0);
  }
  
  return heuresDisponibles;
}
