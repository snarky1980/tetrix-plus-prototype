import prisma from '../config/database';
import { startOfDayOttawa, differenceInHoursOttawa, OTTAWA_TIMEZONE } from '../utils/dateTimeOttawa';

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
 * CORRECTION CRITIQUE: Calcule le chevauchement RÉEL avec la pause 12h-13h
 * au lieu de soustraire 1h systématiquement.
 * 
 * @param dateDebut Date/heure de début (si date seule, utilise 00:00:00)
 * @param dateFin Date/heure de fin (si date seule, utilise 23:59:59)
 * @param soustraireDejeAutomatiquement Si true, calcule et soustrait le chevauchement avec 12h-13h
 * @returns Nombre d'heures disponibles (décimal)
 * 
 * @example
 * // Journée complète 09h-17h
 * capaciteDisponiblePlageHoraire(
 *   parseOttawaDateTimeISO('2025-12-15T09:00:00'),
 *   parseOttawaDateTimeISO('2025-12-15T17:00:00'),
 *   true
 * ); // 7h (8h - 1h pause midi)
 * 
 * // Matin 08h-12h (pas de chevauchement)
 * capaciteDisponiblePlageHoraire(
 *   parseOttawaDateTimeISO('2025-12-15T08:00:00'),
 *   parseOttawaDateTimeISO('2025-12-15T12:00:00'),
 *   true
 * ); // 4h (pas de soustraction)
 * 
 * // Multi-jours
 * capaciteDisponiblePlageHoraire(
 *   parseOttawaDateTimeISO('2025-12-15T09:00:00'),
 *   parseOttawaDateTimeISO('2025-12-16T17:00:00'),
 *   true
 * ); // 30h (32h - 2h pause, une par jour)
 */
export function capaciteDisponiblePlageHoraire(
  dateDebut: Date,
  dateFin: Date,
  soustraireDejeAutomatiquement: boolean = true
): number {
  // Calcul différence brute en heures
  const heuresDisponibles = differenceInHoursOttawa(dateDebut, dateFin);
  
  if (!soustraireDejeAutomatiquement || heuresDisponibles <= 0) {
    return Math.max(heuresDisponibles, 0);
  }
  
  // ✅ CORRECTION: Calculer le chevauchement RÉEL avec 12h-13h
  const heuresPause = calculerChevauchementPauseMidi(dateDebut, dateFin);
  
  return Math.max(heuresDisponibles - heuresPause, 0);
}

/**
 * Calcule le nombre d'heures de chevauchement entre une plage horaire et la pause midi (12h-13h)
 * 
 * RÈGLE MÉTIER: La pause 12h-13h est TOUJOURS bloquée et non allouable.
 * 
 * Logique:
 * 1. Itérer sur chaque jour de la plage
 * 2. Pour chaque jour, vérifier si la plage chevauche 12h-13h
 * 3. Si oui, calculer l'intersection exacte
 * 4. Sommer toutes les intersections
 * 
 * @param dateDebut Date/heure de début de la plage
 * @param dateFin Date/heure de fin de la plage
 * @returns Nombre d'heures de chevauchement avec les pauses midi (décimal)
 * 
 * @example
 * // Cas 1: Plage avant midi (08h-12h)
 * calculerChevauchementPauseMidi('08:00', '12:00') // 0h
 * 
 * // Cas 2: Plage après midi (13h-17h)
 * calculerChevauchementPauseMidi('13:00', '17:00') // 0h
 * 
 * // Cas 3: Plage chevauche midi (09h-17h)
 * calculerChevauchementPauseMidi('09:00', '17:00') // 1h
 * 
 * // Cas 4: Plage = pause exacte (12h-13h)
 * calculerChevauchementPauseMidi('12:00', '13:00') // 1h
 * 
 * // Cas 5: Multi-jours
 * calculerChevauchementPauseMidi('09:00 jour1', '17:00 jour2') // 2h (1h par jour)
 */
function calculerChevauchementPauseMidi(dateDebut: Date, dateFin: Date): number {
  const { toZonedTime } = require('date-fns-tz');
  
  // Convertir en temps Ottawa
  const debutOttawa = toZonedTime(dateDebut, OTTAWA_TIMEZONE);
  const finOttawa = toZonedTime(dateFin, OTTAWA_TIMEZONE);
  
  let totalHeuresPause = 0;
  
  // Calculer le nombre de jours à vérifier
  const debutMs = debutOttawa.getTime();
  const finMs = finOttawa.getTime();
  const dureeMs = finMs - debutMs;
  const nbJoursApprox = Math.ceil(dureeMs / (24 * 60 * 60 * 1000));
  
  // Itérer sur chaque jour potentiel
  for (let i = 0; i < nbJoursApprox + 1; i++) {
    // Date de base pour ce jour
    const jourCourant = new Date(debutOttawa);
    jourCourant.setDate(jourCourant.getDate() + i);
    
    // Définir 12h et 13h pour ce jour (en temps Ottawa)
    const midi = new Date(jourCourant);
    midi.setHours(12, 0, 0, 0);
    
    const treizeH = new Date(jourCourant);
    treizeH.setHours(13, 0, 0, 0);
    
    // Convertir en timestamps pour comparaison
    const midiMs = midi.getTime();
    const treizeHMs = treizeH.getTime();
    
    // Vérifier si la plage [dateDebut, dateFin] chevauche [midi, treizeH]
    // Chevauchement si: debut < 13h ET fin > 12h
    if (debutMs < treizeHMs && finMs > midiMs) {
      // Calculer l'intersection
      const intersectionDebut = Math.max(debutMs, midiMs);
      const intersectionFin = Math.min(finMs, treizeHMs);
      
      if (intersectionFin > intersectionDebut) {
        const heuresChevauche = (intersectionFin - intersectionDebut) / (1000 * 60 * 60);
        totalHeuresPause += heuresChevauche;
      }
    }
  }
  
  return totalHeuresPause;
}
