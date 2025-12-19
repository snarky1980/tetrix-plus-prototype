import prisma from '../config/database';
import {
  DateInput,
  normalizeToOttawa,
  normalizeToOttawaWithTime,
  hasSignificantTime,
  differenceInHoursOttawa,
  formatOttawaISO,
  todayOttawa,
  nowOttawa,
  addDaysOttawa,
  subDaysOttawa,
  differenceInDaysOttawa,
  businessDaysOttawa,
  isWeekendOttawa,
  validateNotPast,
  validateDateRange,
  parseHoraireTraducteur,
  capaciteNetteJour,
  parseOttawaDateISO
} from '../utils/dateTimeOttawa';
import { capaciteDisponiblePlageHoraire } from './capaciteService';
import { JoursFeriesService } from './joursFeriesService';

export interface RepartitionItem { 
  date: string; 
  heures: number;
  heureDebut?: string; // Format: "10h" ou "10h30"
  heureFin?: string;   // Format: "18h" ou "17h30"
}

const MAX_LOOKBACK_DAYS = 90; // Sécurité pour éviter boucle infinie

/**
 * Formate une heure décimale en format "Xh" ou "Xh30"
 * @example formatHeure(10) => "10h"
 * @example formatHeure(10.5) => "10h30"
 * @example formatHeure(14.25) => "14h15"
 */
function formatHeure(heure: number): string {
  const heureEntiere = Math.floor(heure);
  const minutes = Math.round((heure - heureEntiere) * 60);
  if (minutes === 0) {
    return `${heureEntiere}h`;
  }
  return `${heureEntiere}h${minutes.toString().padStart(2, '0')}`;
}

/**
 * Parse une chaîne d'heure au format "Xh" ou "Xh30" en décimal
 * @example parseHeureString("10h") => 10
 * @example parseHeureString("10h30") => 10.5
 * @example parseHeureString("14h15") => 14.25
 */
function parseHeureString(heureStr: string): number {
  const match = heureStr.match(/^(\d+)h(\d+)?$/);
  if (!match) {
    throw new Error(`Format d'heure invalide: ${heureStr}. Format attendu: "10h" ou "10h30"`);
  }
  const heures = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  return heures + minutes / 60;
}

/**
 * Calcule les plages horaires exactes pour une allocation JAT
 * RÈGLE MÉTIER JAT RÉVISÉE:
 * - STRICTEMENT À REBOURS pour TOUS les jours, y compris le jour J
 * - Si deadline à 11h et tâche de 2h, allouer de 9h à 11h (pas à partir de 8h)
 * - Toujours exclure la pause 12h-13h du calcul
 * - En remontant, si on traverse des pauses, ajuster
 * 
 * @example
 * // Jour échéance, deadline 11h, 2h à allouer
 * calculerPlageHoraireJAT(2, {heureDebut: 8, heureFin: 17}, true, deadline11h) 
 * // => {heureDebut: "9h", heureFin: "11h"} (strictement à rebours)
 * 
 * // Jour avant, 3h en fin de journée jusqu'à 18h
 * calculerPlageHoraireJAT(3, {heureDebut: 10, heureFin: 18}, false)
 * // => {heureDebut: "15h", heureFin: "18h"}
 */
function calculerPlageHoraireJAT(
  heuresAllouees: number,
  horaire: { heureDebut: number; heureFin: number },
  estJourEcheance: boolean,
  deadlineDateTime?: Date
): { heureDebut: string; heureFin: string } {
  // NOUVELLE RÈGLE: TOUT À REBOURS, même le jour J
  
  // Déterminer l'heure de fin effective
  let heureFin: number;
  if (estJourEcheance && deadlineDateTime) {
    // Jour J: l'heure de fin est l'heure de deadline
    heureFin = deadlineDateTime.getHours() + deadlineDateTime.getMinutes() / 60;
  } else {
    // Autres jours: l'heure de fin est la fin de l'horaire
    heureFin = horaire.heureFin;
  }
  
  // Calculer le début en remontant depuis la fin
  let heureDebut = heureFin - heuresAllouees;
  
  // Si on traverse la pause 12h-13h en remontant, ajuster
  if (heureDebut < 13 && heureFin > 13) {
    // On traverse la pause en descendant
    heureDebut -= 1; // Remonter d'une heure supplémentaire pour exclure la pause
  } else if (heureDebut < 12 && heureFin > 12 && heureFin <= 13) {
    // Cas spécial: on finit pendant ou juste avant la pause
    heureDebut -= 1;
  }
  
  // S'assurer qu'on ne commence pas avant l'heure de début de l'horaire
  heureDebut = Math.max(heureDebut, horaire.heureDebut);
  
  return {
    heureDebut: formatHeure(heureDebut),
    heureFin: formatHeure(heureFin)
  };
}

/**
 * Calcule les plages horaires pour une allocation ÉQUILIBRÉE
 * RÈGLE MÉTIER: Allouer le plus TÔT possible dans la journée
 * En tenant compte des autres tâches déjà allouées, pauses, heures bloquées
 * 
 * @param heuresAllouees Nombre d'heures à allouer ce jour
 * @param horaire Horaire du traducteur
 * @param heuresDejaUtilisees Heures déjà utilisées ce jour (autres tâches)
 * @param dateJour Date du jour (pour vérifier pause midi)
 * @returns {heureDebut, heureFin} Plages horaires au format "8h30", "12h", etc.
 * 
 * @example
 * // Allouer 4h sur un jour où 2h sont déjà utilisées (9h-11h)
 * calculerPlageHoraireEquilibree(4, {heureDebut: 8, heureFin: 17}, 2, date)
 * // => {heureDebut: "11h", heureFin: "16h"} (4h après les 2h existantes, pause exclue)
 */
function calculerPlageHoraireEquilibree(
  heuresAllouees: number,
  horaire: { heureDebut: number; heureFin: number },
  heuresDejaUtilisees: number,
  dateJour: Date
): { heureDebut: string; heureFin: string } {
  // Stratégie: Allouer le plus tôt possible, en évitant la pause midi
  
  // Commencer au début de l'horaire
  let debut = horaire.heureDebut;
  
  // Si des heures sont déjà utilisées, avancer en conséquence
  if (heuresDejaUtilisees > 0) {
    debut += heuresDejaUtilisees;
    
    // Si on traverse la pause 12h-13h, sauter
    if (horaire.heureDebut < 12 && debut > 12 && debut < 13) {
      debut = 13; // Commencer après la pause
    } else if (debut >= 12 && debut < 13) {
      debut = 13; // Commencer après la pause
    }
  }
  
  // Calculer la fin en tenant compte de la pause
  let fin = debut + heuresAllouees;
  
  // Si on traverse la pause 12h-13h, ajouter 1h
  if (debut < 12 && fin > 12) {
    // On commence avant midi et on termine après
    // Ajouter 1h pour la pause
    fin += 1;
  } else if (debut < 13 && fin >= 13 && debut >= 12) {
    // On commence pendant la pause (12h-13h) ou juste avant
    // Ajouter 1h pour sauter la pause
    fin += 1;
  }
  
  // S'assurer qu'on ne dépasse pas la fin de l'horaire
  fin = Math.min(fin, horaire.heureFin);
  
  return {
    heureDebut: formatHeure(debut),
    heureFin: formatHeure(fin)
  };
}

async function heuresUtiliseesParJour(
  traducteurId: string,
  dateDebut: Date,
  dateFin: Date
): Promise<Record<string, number>> {
  const ajustements = await prisma.ajustementTemps.findMany({
    where: {
      traducteurId,
      date: { gte: dateDebut, lte: dateFin }
    },
    select: { date: true, heures: true }
  });

  const heuresParJour: Record<string, number> = {};
  for (const ajustement of ajustements) {
    const iso = formatOttawaISO(ajustement.date);
    heuresParJour[iso] = (heuresParJour[iso] || 0) + ajustement.heures;
  }
  return heuresParJour;
}

export interface RepartitionJATOptions {
  livraisonMatinale?: boolean;
  heuresMaxJourJ?: number;
  debug?: boolean;
  /**
   * NOUVEAU: Mode timestamp - si true, parse les timestamps avec heure
   * et utilise hasSignificantTime() pour détecter si échéance a heure précise
   */
  modeTimestamp?: boolean;
}

// Répartition "Juste-à-temps" (JAT)
export async function repartitionJusteATemps(
  traducteurId: string,
  heuresTotal: number,
  dateEcheanceInput: DateInput,
  optionsOrDebug?: boolean | RepartitionJATOptions
): Promise<RepartitionItem[]> {
  // Compatibilité avec ancienne signature (debug: boolean)
  const options: RepartitionJATOptions = typeof optionsOrDebug === 'boolean' 
    ? { debug: optionsOrDebug }
    : (optionsOrDebug || {});
  
  const debug = options.debug || false;
  const livraisonMatinale = options.livraisonMatinale || false;
  const heuresMaxJourJ = options.heuresMaxJourJ ?? 2;
  const modeTimestamp = options.modeTimestamp ?? true; // Activé par défaut pour deadlines avec heure

  // Mode legacy ou timestamp
  const { date: echeance, iso: dateEcheanceISO, hasTime: echeanceHasTime } = modeTimestamp
    ? normalizeToOttawaWithTime(dateEcheanceInput, true, 'dateEcheance')
    : { ...normalizeToOttawa(dateEcheanceInput, 'dateEcheance'), hasTime: false };

  if (debug) {
    console.debug(`[JAT] Début: traducteurId=${traducteurId}, heuresTotal=${heuresTotal}, dateEcheance=${dateEcheanceISO}`);
    if (modeTimestamp && echeanceHasTime) {
      console.debug(`[JAT] Mode timestamp: échéance avec heure précise détectée`);
    }
    if (livraisonMatinale) console.debug(`[JAT] Mode livraison matinale activé (max ${heuresMaxJourJ}h le jour J)`);
  }
  
  if (heuresTotal <= 0) throw new Error('heuresTotal doit être > 0');
  const traducteur = await prisma.traducteur.findUnique({ where: { id: traducteurId } });
  if (!traducteur) throw new Error('Traducteur introuvable');
  
  // Parser l'horaire du traducteur pour respecter ses plages de travail
  const horaire = parseHoraireTraducteur(traducteur.horaire);
  
  if (debug) {
    console.debug(`[JAT] Traducteur: ${traducteur.nom}, capacité=${traducteur.capaciteHeuresParJour}h/jour`);
    console.debug(`[JAT] Horaire: ${horaire.heureDebut}h-${horaire.heureFin}h`);
  }

  const aujourdHui = todayOttawa();
  
  if (debug) console.debug(`[JAT] Échéance reçue: ${dateEcheanceISO}, normalisée: ${formatOttawaISO(echeance)}`);
  
  validateNotPast(echeance, 'dateEcheance');

  const heuresParJour = await heuresUtiliseesParJour(traducteurId, aujourdHui, echeance);
  
  if (debug && Object.keys(heuresParJour).length > 0) {
    console.debug(`[JAT] Ajustements existants trouvés: ${Object.keys(heuresParJour).length}`);
    Object.entries(heuresParJour).forEach(([date, heures]) => {
      console.debug(`  ${date}: ${heures}h utilisées`);
    });
  }

  // Calculer capacité totale disponible sur la fenêtre (excluant les weekends ET jours fériés)
  const totalJours = differenceInDaysOttawa(aujourdHui, echeance) + 1;
  let capaciteDisponibleGlobale = 0;
  
  for (let i = 0; i < totalJours; i++) {
    const d = addDaysOttawa(aujourdHui, i);
    const iso = formatOttawaISO(d);
    // Ignorer les weekends ET jours fériés dans le calcul de capacité
    if (isWeekendOttawa(d) || JoursFeriesService.estJourFerie(d)) continue;
    const utilisees = heuresParJour[iso] || 0;
    
    // Calculer capacité nette pour ce jour:
    // - Respecte l'horaire du traducteur (heureDebut-heureFin)
    // - Exclut automatiquement la pause 12h-13h
    // - Si deadline le même jour, limite à l'heure de la deadline
    const estJourEcheance = formatOttawaISO(d) === dateEcheanceISO;
    const deadlineDateTime = estJourEcheance && modeTimestamp && echeanceHasTime ? echeance : undefined;
    let capaciteNette = capaciteNetteJour(horaire, d, deadlineDateTime);
    
    // Si livraison matinale, appliquer limite supplémentaire sur jour J
    if (estJourEcheance && livraisonMatinale) {
      capaciteNette = Math.min(capaciteNette, heuresMaxJourJ);
    }
    
    capaciteDisponibleGlobale += Math.max(capaciteNette - utilisees, 0);
  }
  
  if (debug) {
    console.debug(`[JAT] Fenêtre: ${totalJours} jours (${formatOttawaISO(aujourdHui)} à ${formatOttawaISO(echeance)})`);
    console.debug(`[JAT] Capacité disponible totale: ${capaciteDisponibleGlobale.toFixed(2)}h`);
  }
  
  if (heuresTotal - 1e-6 > capaciteDisponibleGlobale) {
    throw new Error(`Capacité insuffisante dans la plage pour heuresTotal demandées (demandé: ${heuresTotal}h, disponible: ${capaciteDisponibleGlobale.toFixed(2)}h)`);
  }

  // Allocation JAT (remplir à rebours depuis l'échéance, en excluant les weekends)
  // RÈGLE MÉTIER: À rebours pour distribuer les jours, mais:
  // - Jour J: premières heures disponibles (début de journée)
  // - Jours avant: dernières heures disponibles (fin de journée)
  let restant = heuresTotal;
  const resultat: RepartitionItem[] = [];
  let courant = echeance;
  let iterations = 0;
  while (restant > 0 && iterations < MAX_LOOKBACK_DAYS) {
    if (courant < aujourdHui) break;
    const iso = formatOttawaISO(courant);
    // Ignorer les weekends ET jours fériés pour l'allocation
    if (!isWeekendOttawa(courant) && !JoursFeriesService.estJourFerie(courant)) {
      const utilisees = heuresParJour[iso] || 0;
      
      // Calculer capacité nette pour ce jour:
      // - Respecte l'horaire du traducteur
      // - Exclut automatiquement la pause 12h-13h
      // - Si deadline le même jour, limite à l'heure de la deadline
      const estJourEcheance = iso === dateEcheanceISO.split('T')[0];
      const deadlineDateTime = estJourEcheance && modeTimestamp && echeanceHasTime ? echeance : undefined;
      let capaciteNette = capaciteNetteJour(horaire, courant, deadlineDateTime);
      
      // Si livraison matinale, appliquer limite supplémentaire sur jour J
      if (estJourEcheance && livraisonMatinale) {
        capaciteNette = Math.min(capaciteNette, heuresMaxJourJ);
      }
      
      const libre = Math.max(capaciteNette - utilisees, 0);
      if (libre > 0) {
        const alloue = Math.min(libre, restant);
        
        // Calculer les plages horaires exactes
        const plages = calculerPlageHoraireJAT(alloue, horaire, estJourEcheance, deadlineDateTime);
        
        resultat.push({ 
          date: iso, 
          heures: alloue,
          heureDebut: plages.heureDebut,
          heureFin: plages.heureFin
        });
        restant -= alloue;
        // Mettre à jour mémoire pour éviter double comptage si futur usage
        heuresParJour[iso] = utilisees + alloue;
        
        if (debug) {
          console.debug(`[JAT] ${iso}: ${alloue.toFixed(2)}h allouées (${plages.heureDebut}-${plages.heureFin}) ${estJourEcheance ? '[JOUR J - à rebours depuis deadline]' : '[à rebours depuis fin journée]'}`);
        }
      }
    }
    courant = subDaysOttawa(courant, 1);
    iterations++;
  }
  if (restant > 0) throw new Error('Impossible de répartir toutes les heures (capacité insuffisante après allocation).');
  
  // Retourner trié chronologiquement asc (pour cohérence frontend)
  const resultTrie = resultat.sort((a,b) => a.date.localeCompare(b.date));
  
  if (debug) {
    console.debug(`[JAT] Répartition finale (${resultTrie.length} jours):`);
    const totalAlloue = resultTrie.reduce((s, r) => s + r.heures, 0);
    resultTrie.forEach(r => console.debug(`  ${r.date}: ${r.heures.toFixed(2)}h ${r.heureDebut && r.heureFin ? `(${r.heureDebut}-${r.heureFin})` : ''}`));
    console.debug(`[JAT] Total alloué: ${totalAlloue.toFixed(2)}h (demandé: ${heuresTotal}h)`);
  }
  
  return resultTrie;
}

export async function repartitionEquilibree(
  traducteurId: string,
  heuresTotal: number,
  dateDebutInput: DateInput,
  dateFinInput: DateInput
): Promise<RepartitionItem[]> {
  if (heuresTotal <= 0) throw new Error('heuresTotal doit être > 0');
  const traducteur = await prisma.traducteur.findUnique({ where: { id: traducteurId } });
  if (!traducteur) throw new Error('Traducteur introuvable');

  // Parse l'horaire du traducteur
  const horaire = parseHoraireTraducteur(traducteur.horaire);

  const { date: dateDebut } = normalizeToOttawa(dateDebutInput, 'dateDebut');
  const { date: dateFin, hasTime: finHasTime } = normalizeToOttawaWithTime(dateFinInput, true, 'dateFin');
  validateDateRange(dateDebut, dateFin);

  const jours = businessDaysOttawa(dateDebut, dateFin);
  if (jours.length === 0) throw new Error('Aucun jour ouvrable dans la période');

  const heuresParJour = await heuresUtiliseesParJour(traducteurId, dateDebut, dateFin);
  const disponibilites = jours
    .filter((jour) => !JoursFeriesService.estJourFerie(jour)) // Exclure les jours fériés
    .map((jour) => {
      const iso = formatOttawaISO(jour);
      const utilisees = heuresParJour[iso] || 0;
      
      // Déterminer si c'est le jour de la deadline avec heure précise
      const estJourEcheance = iso === formatOttawaISO(dateFin);
      const deadlineDateTime = estJourEcheance && finHasTime ? dateFin : undefined;

      // Utiliser la capacité nette réelle (horaire - pause - deadline)
      const capaciteNette = capaciteNetteJour(horaire, jour, deadlineDateTime);
      const libre = Math.max(capaciteNette - utilisees, 0);
      return { iso, libre };
    })
    .filter((j) => j.libre > 0);

  if (disponibilites.length === 0) {
    throw new Error('La période sélectionnée est déjà saturée.');
  }

  const capaciteDisponible = disponibilites.reduce((s, j) => s + j.libre, 0);
  if (heuresTotal - 1e-6 > capaciteDisponible) {
    throw new Error(`Capacité insuffisante sur la période (disponible: ${capaciteDisponible.toFixed(2)}h).`);
  }

  // Algorithme de distribution équilibrée avec gestion des capacités contraintes
  // ÉTAPE 1: Distribution uniforme initiale en centimes
  const heuresCentimes = Math.round(heuresTotal * 100);
  const nbJours = disponibilites.length;
  const baseParJour = Math.floor(heuresCentimes / nbJours);
  let reste = heuresCentimes - (baseParJour * nbJours);
  
  // Créer allocation initiale
  const allocations = disponibilites.map((jour, index) => {
    let centimes = baseParJour;
    if (reste > 0) {
      centimes += 1;
      reste--;
    }
    return {
      iso: jour.iso,
      capaciteLibre: jour.libre,
      heuresAllouees: centimes / 100,
      estContraint: false
    };
  });
  
  // ÉTAPE 2: Identifier les jours contraints et redistribuer
  let heuresARedistribu = 0;
  const joursContraints: number[] = [];
  const joursLibres: number[] = [];
  
  allocations.forEach((alloc, index) => {
    if (alloc.heuresAllouees > alloc.capaciteLibre + 0.0001) {
      // Jour contraint: ne peut recevoir que sa capacité libre
      heuresARedistribu += alloc.heuresAllouees - alloc.capaciteLibre;
      alloc.heuresAllouees = alloc.capaciteLibre;
      alloc.estContraint = true;
      joursContraints.push(index);
    } else {
      joursLibres.push(index);
    }
  });
  
  // ÉTAPE 3: Redistribuer les heures excédentaires sur les jours non contraints
  if (heuresARedistribu > 0.0001 && joursLibres.length > 0) {
    // Trier les jours libres par capacité restante décroissante
    joursLibres.sort((a, b) => {
      const capaciteResteA = allocations[a].capaciteLibre - allocations[a].heuresAllouees;
      const capaciteResteB = allocations[b].capaciteLibre - allocations[b].heuresAllouees;
      return capaciteResteB - capaciteResteA;
    });
    
    // Redistribuer en centimes pour précision maximale
    let centimesARedistribu = Math.round(heuresARedistribu * 100);
    
    for (const index of joursLibres) {
      if (centimesARedistribu <= 0) break;
      
      const alloc = allocations[index];
      const capaciteResteCentimes = Math.round((alloc.capaciteLibre - alloc.heuresAllouees) * 100);
      
      if (capaciteResteCentimes > 0) {
        const aAjouter = Math.min(capaciteResteCentimes, centimesARedistribu);
        alloc.heuresAllouees += aAjouter / 100;
        centimesARedistribu -= aAjouter;
      }
    }
    
    // Si encore des heures non distribuées, c'est qu'on a un problème
    if (centimesARedistribu > 1) {
      throw new Error(`Erreur de redistribution: ${(centimesARedistribu / 100).toFixed(2)}h non distribuables malgré capacité suffisante`);
    }
  }
  
  // ÉTAPE 4: Construire le résultat final avec plages horaires
  const resultat: RepartitionItem[] = allocations.map(alloc => {
    const dateJour = parseOttawaDateISO(alloc.iso);
    const utilisees = heuresParJour[alloc.iso] || 0;
    
    // Calculer les plages horaires (le plus tôt possible)
    const plages = calculerPlageHoraireEquilibree(
      alloc.heuresAllouees,
      horaire,
      utilisees,
      dateJour
    );
    
    return {
      date: alloc.iso,
      heures: parseFloat(alloc.heuresAllouees.toFixed(4)),
      heureDebut: plages.heureDebut,
      heureFin: plages.heureFin
    };
  });
  
  // Vérifier somme exacte (tolérance 0.01h pour arrondis)
  const somme = resultat.reduce((s, r) => s + r.heures, 0);
  if (Math.abs(somme - heuresTotal) > 0.01) {
    throw new Error(`Erreur de répartition: somme=${somme.toFixed(4)}h, attendu=${heuresTotal.toFixed(4)}h`);
  }

  return resultat.sort((a, b) => a.date.localeCompare(b.date));
}

export async function repartitionPEPS(
  traducteurId: string,
  heuresTotal: number,
  dateDebutInput: DateInput,
  dateFinInput: DateInput
): Promise<RepartitionItem[]> {
  if (heuresTotal <= 0) throw new Error('heuresTotal doit être > 0');
  const traducteur = await prisma.traducteur.findUnique({ where: { id: traducteurId } });
  if (!traducteur) throw new Error('Traducteur introuvable');

  // Parse l'horaire du traducteur
  const horaire = parseHoraireTraducteur(traducteur.horaire);

  const { date: dateDebut } = normalizeToOttawa(dateDebutInput, 'dateDebut');
  const { date: dateFin, hasTime: finHasTime } = normalizeToOttawaWithTime(dateFinInput, true, 'dateFin');
  validateDateRange(dateDebut, dateFin);

  const jours = businessDaysOttawa(dateDebut, dateFin);
  if (jours.length === 0) throw new Error('Aucun jour ouvrable dans la période');

  const heuresParJour = await heuresUtiliseesParJour(traducteurId, dateDebut, dateFin);
  const resultat: RepartitionItem[] = [];
  let restant = heuresTotal;

  for (const jour of jours) {
    if (restant <= 0) break;
    // Ignorer les jours fériés
    if (JoursFeriesService.estJourFerie(jour)) continue;
    const iso = formatOttawaISO(jour);
    const utilisees = heuresParJour[iso] || 0;
    
    // Déterminer si c'est le jour de la deadline avec heure précise
    const estJourEcheance = iso === formatOttawaISO(dateFin);
    const deadlineDateTime = estJourEcheance && finHasTime ? dateFin : undefined;

    // Utiliser la capacité nette réelle (horaire - pause - deadline)
    const capaciteNette = capaciteNetteJour(horaire, jour, deadlineDateTime);
    const libre = Math.max(capaciteNette - utilisees, 0);
    if (libre <= 0) continue;
    const alloue = Math.min(libre, restant);
    
    // Calculer les plages horaires (PEPS = le plus tôt possible, comme ÉQUILIBRÉ)
    const plages = calculerPlageHoraireEquilibree(alloue, horaire, utilisees, jour);
    
    resultat.push({ 
      date: iso, 
      heures: parseFloat(alloue.toFixed(4)),
      heureDebut: plages.heureDebut,
      heureFin: plages.heureFin
    });
    restant = parseFloat((restant - alloue).toFixed(4));
  }

  if (restant > 1e-4) {
    throw new Error(`Capacité insuffisante sur la période (${restant.toFixed(2)}h restantes).`);
  }

  return resultat;
}

// Répartition uniforme entre dateDebut et dateFin incluses (excluant les weekends)
export function repartitionUniforme(
  heuresTotal: number,
  dateDebut: Date,
  dateFin: Date
): RepartitionItem[] {
  validateDateRange(dateDebut, dateFin);
  
  const joursOuvrables = businessDaysOttawa(dateDebut, dateFin);
  
  if (joursOuvrables.length === 0) {
    throw new Error('Aucun jour ouvrable dans l\'intervalle (uniquement des weekends)');
  }
  
  const base = heuresTotal / joursOuvrables.length;
  const items: RepartitionItem[] = [];
  let cumul = 0;
  for (const dateCourante of joursOuvrables) {
    const iso = formatOttawaISO(dateCourante);
    let h = parseFloat(base.toFixed(4));
    cumul += h;
    items.push({ date: iso, heures: h });
  }
  // Ajuster dernière valeur si cumul diffère (précision flottante)
  const diff = parseFloat((heuresTotal - cumul).toFixed(4));
  if (Math.abs(diff) >= 0.0001) {
    items[items.length - 1].heures = parseFloat((items[items.length - 1].heures + diff).toFixed(4));
  }
  return items;
}

/**
 * Suggère des heures par défaut pour une répartition manuelle
 * RÈGLE MÉTIER: Propose le plus TÔT possible dans la journée où il y a de la capacité
 * 
 * @param traducteurId ID du traducteur
 * @param repartition Répartition manuelle (avec dates et heures, sans heureDebut/heureFin)
 * @param ignorerTacheId ID de tâche à ignorer (pour édition)
 * @returns Répartition avec heureDebut/heureFin suggérés
 */
export async function suggererHeuresManuel(
  traducteurId: string,
  repartition: RepartitionItem[],
  ignorerTacheId?: string
): Promise<RepartitionItem[]> {
  const traducteur = await prisma.traducteur.findUnique({ where: { id: traducteurId } });
  if (!traducteur) throw new Error('Traducteur introuvable');

  const horaire = parseHoraireTraducteur(traducteur.horaire);
  const suggestions: RepartitionItem[] = [];

  for (const item of repartition) {
    // Si l'utilisateur a déjà spécifié les heures, les conserver
    if (item.heureDebut && item.heureFin) {
      suggestions.push({ ...item });
      continue;
    }

    const dateObj = parseOttawaDateISO(item.date);
    
    // Récupérer heures déjà utilisées ce jour
    const ajustements = await prisma.ajustementTemps.findMany({
      where: {
        traducteurId,
        date: { equals: dateObj },
        ...(ignorerTacheId ? { NOT: { tacheId: ignorerTacheId } } : {})
      }
    });
    const heuresUtilisees = ajustements.reduce((sum, a) => sum + a.heures, 0);
    
    // Calculer les plages horaires suggérées (le plus tôt possible)
    const plages = calculerPlageHoraireEquilibree(item.heures, horaire, heuresUtilisees, dateObj);
    
    suggestions.push({
      date: item.date,
      heures: item.heures,
      heureDebut: plages.heureDebut,
      heureFin: plages.heureFin
    });
  }

  return suggestions;
}

// Validation répartition manuelle / uniforme
export async function validerRepartition(
  traducteurId: string,
  repartition: RepartitionItem[],
  heuresTotalAttendu: number,
  ignorerTacheId?: string,
  dateEcheanceInput?: DateInput
): Promise<{ valide: boolean; erreurs: string[] }> {
  const erreurs: string[] = [];
  const somme = repartition.reduce((s, r) => s + r.heures, 0);
  const sommeFix = parseFloat(somme.toFixed(4));
  const attenduFix = parseFloat(heuresTotalAttendu.toFixed(4));
  if (sommeFix !== attenduFix) {
    erreurs.push(`Somme des heures (${sommeFix}) différente des heures totales (${attenduFix}).`);
  }
  const traducteur = await prisma.traducteur.findUnique({ where: { id: traducteurId } });
  if (!traducteur) erreurs.push('Traducteur introuvable.');
  
  // Parse l'horaire si traducteur trouvé
  const horaire = traducteur ? parseHoraireTraducteur(traducteur.horaire) : null;

  // Parse deadline si fournie
  let deadlineDate: Date | undefined;
  let deadlineHasTime = false;
  if (dateEcheanceInput) {
    const { date, hasTime } = normalizeToOttawaWithTime(dateEcheanceInput, true, 'dateEcheance');
    deadlineDate = date;
    deadlineHasTime = hasTime;
  }

  for (const r of repartition) {
    // Utiliser parseOttawaDateISO pour garantir la bonne timezone
    const dateObj = parseOttawaDateISO(r.date);
    const ajustements = await prisma.ajustementTemps.findMany({
      where: {
        traducteurId,
        date: { equals: dateObj },
        ...(ignorerTacheId ? { NOT: { tacheId: ignorerTacheId } } : {})
      }
    });
    const utilisees = ajustements.reduce((sum, a) => sum + a.heures, 0);
    const totalJour = utilisees + r.heures;
    
    if (traducteur && horaire) {
      // Vérifier si c'est le jour de la deadline
      const estJourEcheance = deadlineDate && formatOttawaISO(dateObj) === formatOttawaISO(deadlineDate);
      const deadlineDateTime = estJourEcheance && deadlineHasTime ? deadlineDate : undefined;

      const capaciteNette = capaciteNetteJour(horaire, dateObj, deadlineDateTime);
      if (totalJour > capaciteNette + 1e-6) {
        erreurs.push(`Dépassement capacité le ${r.date} (utilisées + nouvelles = ${totalJour.toFixed(2)} / ${capaciteNette.toFixed(2)}).`);
      }
      
      // Validation des heures précises si fournies
      if (r.heureDebut && r.heureFin) {
        const debut = parseHeureString(r.heureDebut);
        const fin = parseHeureString(r.heureFin);
        
        // Vérifier que début < fin
        if (debut >= fin) {
          erreurs.push(`Heures invalides le ${r.date}: heureDebut (${r.heureDebut}) doit être < heureFin (${r.heureFin}).`);
        }
        
        // Vérifier que les heures sont dans l'horaire du traducteur
        if (debut < horaire.heureDebut) {
          erreurs.push(`Heures invalides le ${r.date}: heureDebut (${r.heureDebut}) avant l'horaire du traducteur (${formatHeure(horaire.heureDebut)}).`);
        }
        if (fin > horaire.heureFin) {
          erreurs.push(`Heures invalides le ${r.date}: heureFin (${r.heureFin}) après l'horaire du traducteur (${formatHeure(horaire.heureFin)}).`);
        }
        
        // Calculer la durée en tenant compte de la pause
        let dureeCalculee = fin - debut;
        if (debut < 13 && fin > 13) {
          dureeCalculee -= 1; // Exclure la pause midi
        }
        
        // Vérifier que la durée correspond aux heures spécifiées (tolérance 0.1h)
        if (Math.abs(dureeCalculee - r.heures) > 0.1) {
          erreurs.push(`Incohérence le ${r.date}: plage horaire (${r.heureDebut}-${r.heureFin}) = ${dureeCalculee.toFixed(2)}h mais ${r.heures}h spécifiées.`);
        }
      }
    }
    if (r.heures < 0) erreurs.push(`Heures négatives interdites (${r.date}).`);
  }
  return { valide: erreurs.length === 0, erreurs };
}
