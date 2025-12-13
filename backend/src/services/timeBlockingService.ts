
import prisma from '../config/database';
import {
  parseOttawaDateISO,
  parseHoraireTraducteur,
  capaciteNetteJour,
  setHourDecimalOttawa,
  differenceInHoursOttawa,
  isSameDayOttawa,
  formatOttawaISO
} from '../utils/dateTimeOttawa';

/**
 * Bloque une période de temps pour un traducteur.
 * Crée une tâche de type 'AUTRE' et un ajustement de temps 'BLOCAGE'.
 * 
 * @param traducteurId ID du traducteur
 * @param dateStr Date du blocage (YYYY-MM-DD)
 * @param heureDebutStr Heure de début (HH:mm)
 * @param heureFinStr Heure de fin (HH:mm)
 * @param motif Motif du blocage
 * @param creePar ID de l'utilisateur créateur
 */
export async function bloquerTemps(
  traducteurId: string,
  dateStr: string,
  heureDebutStr: string,
  heureFinStr: string,
  motif: string,
  creePar: string
): Promise<void> {
  const traducteur = await prisma.traducteur.findUnique({ where: { id: traducteurId } });
  if (!traducteur) throw new Error('Traducteur introuvable');

  const date = parseOttawaDateISO(dateStr);
  const horaire = parseHoraireTraducteur(traducteur.horaire);

  // Convertir heures string en décimal
  const [hDeb, mDeb] = heureDebutStr.split(':').map(Number);
  const [hFin, mFin] = heureFinStr.split(':').map(Number);
  const debutBloc = hDeb + mDeb / 60;
  const finBloc = hFin + mFin / 60;

  if (finBloc <= debutBloc) throw new Error('L\'heure de fin doit être après l\'heure de début');

  // Calculer la durée effective chargeable (intersection avec horaire travail - pause)
  // 1. Intersection avec horaire de travail
  const debutTravail = horaire.heureDebut;
  const finTravail = horaire.heureFin;
  
  const debutEffectif = Math.max(debutBloc, debutTravail);
  const finEffectif = Math.min(finBloc, finTravail);
  
  let dureeChargeable = 0;
  
  if (finEffectif > debutEffectif) {
    // 2. Soustraire pause midi (12h-13h)
    const pauseDebut = 12.0;
    const pauseFin = 13.0;
    
    // Calculer intersection avec la pause
    const debutPauseInter = Math.max(debutEffectif, pauseDebut);
    const finPauseInter = Math.min(finEffectif, pauseFin);
    const dureePause = Math.max(0, finPauseInter - debutPauseInter);
    
    dureeChargeable = (finEffectif - debutEffectif) - dureePause;
  }
  
  // Arrondir à 2 décimales pour éviter flottants bizarres
  dureeChargeable = Math.round(dureeChargeable * 100) / 100;

  // Si durée chargeable > 0, créer le blocage
  // Même si durée = 0 (ex: blocage pendant pause midi), on pourrait vouloir le noter pour info?
  // Mais pour la capacité, c'est 0.
  // Le user dit "c'est un bloc sur lequel on ne peut pas distribuer d'heures".
  // Si c'est pendant la pause, on ne distribue déjà pas.
  // Si c'est hors horaire, on ne distribue déjà pas.
  // Donc on ne crée l'ajustement que si ça consomme de la capacité.
  // MAIS, pour l'affichage UI, on voudrait peut-être voir le bloc "Dentiste 18h-19h".
  // Cependant, AjustementTemps sert à la capacité.
  // Tache sert à l'affichage.
  // On va créer la tâche dans tous les cas, mais l'ajustement seulement si > 0 ?
  // Non, AjustementTemps est requis pour lier à la tâche si on veut cohérence.
  // On va créer l'ajustement avec 0 heures si nécessaire, ou juste le minimum.
  // Mais attention, repartitionService somme les ajustements. 0 ne gêne pas.
  
  // Créer la tâche "Blocage"
  // On utilise une transaction pour atomicité
  await prisma.$transaction(async (tx) => {
    const tache = await tx.tache.create({
      data: {
        typeTache: 'AUTRE', // Ou ajouter BLOCAGE à l'enum si possible, sinon AUTRE
        statut: 'PLANIFIEE', // Bloqué = planifié
        description: motif,
        heuresTotal: dureeChargeable, // On met la durée chargeable comme "coût"
        dateEcheance: date, // Date du blocage
        traducteurId: traducteurId,
        creePar: creePar,
        numeroProjet: 'BLOCAGE', // Marqueur
        specialisation: `${heureDebutStr}-${heureFinStr}` // Stocker l'heure brute ici pour affichage?
      }
    });

    await tx.ajustementTemps.create({
      data: {
        date: date,
        heures: dureeChargeable,
        type: 'BLOCAGE',
        traducteurId: traducteurId,
        tacheId: tache.id,
        creePar: creePar
      }
    });
    
    console.log(`[TIME BLOCK] Créé pour ${traducteur.nom}: ${dureeChargeable}h le ${dateStr} (${motif})`);
  });
}

/**
 * Supprime un blocage existant (via ID de l'ajustement ou de la tâche)
 */
export async function supprimerBlocage(ajustementId: string): Promise<void> {
  const ajustement = await prisma.ajustementTemps.findFirst({
    where: { id: ajustementId, type: 'BLOCAGE' }
  });
  
  if (!ajustement) throw new Error('Blocage introuvable');
  
  if (ajustement.tacheId) {
    // Supprimer la tâche (cascade delete l'ajustement)
    await prisma.tache.delete({ where: { id: ajustement.tacheId } });
    console.log(`[TIME BLOCK] Supprimé: ${ajustement.heures}h le ${formatOttawaISO(ajustement.date)}`);
  } else {
    // Cas legacy ou orphelin
    await prisma.ajustementTemps.delete({ where: { id: ajustementId } });
  }
}
