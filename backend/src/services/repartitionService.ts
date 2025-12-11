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
  validateDateRange
} from '../utils/dateTimeOttawa';
import { capaciteDisponiblePlageHoraire } from './capaciteService';

export interface RepartitionItem { date: string; heures: number }

const MAX_LOOKBACK_DAYS = 90; // Sécurité pour éviter boucle infinie

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
  const modeTimestamp = options.modeTimestamp || false;

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
  
  if (debug) console.debug(`[JAT] Traducteur: ${traducteur.nom}, capacité=${traducteur.capaciteHeuresParJour}h/jour`);

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

  // Calculer capacité totale disponible sur la fenêtre (excluant les weekends)
  const totalJours = differenceInDaysOttawa(aujourdHui, echeance) + 1;
  let capaciteDisponibleGlobale = 0;
  
  // Si livraison matinale, limiter capacité du jour J
  const capaciteJourJ = livraisonMatinale 
    ? Math.min(heuresMaxJourJ, traducteur.capaciteHeuresParJour)
    : traducteur.capaciteHeuresParJour;
  
  for (let i = 0; i < totalJours; i++) {
    const d = addDaysOttawa(aujourdHui, i);
    const iso = formatOttawaISO(d);
    // Ignorer les weekends dans le calcul de capacité
    if (isWeekendOttawa(d)) continue;
    const utilisees = heuresParJour[iso] || 0;
    
    // Capacité différente pour le jour d'échéance si livraison matinale
    const estJourEcheance = formatOttawaISO(d) === dateEcheanceISO;
    const capaciteJour = estJourEcheance && livraisonMatinale ? capaciteJourJ : traducteur.capaciteHeuresParJour;
    
    capaciteDisponibleGlobale += Math.max(capaciteJour - utilisees, 0);
  }
  
  if (debug) {
    console.debug(`[JAT] Fenêtre: ${totalJours} jours (${formatOttawaISO(aujourdHui)} à ${formatOttawaISO(echeance)})`);
    console.debug(`[JAT] Capacité disponible totale: ${capaciteDisponibleGlobale.toFixed(2)}h`);
  }
  
  if (heuresTotal - 1e-6 > capaciteDisponibleGlobale) {
    throw new Error(`Capacité insuffisante dans la plage pour heuresTotal demandées (demandé: ${heuresTotal}h, disponible: ${capaciteDisponibleGlobale.toFixed(2)}h)`);
  }

  // Allocation JAT (remplir à rebours depuis l'échéance, en excluant les weekends)
  let restant = heuresTotal;
  const resultat: RepartitionItem[] = [];
  let courant = echeance;
  let iterations = 0;
  while (restant > 0 && iterations < MAX_LOOKBACK_DAYS) {
    if (courant < aujourdHui) break;
    const iso = formatOttawaISO(courant);
    // Ignorer les weekends pour l'allocation
    if (!isWeekendOttawa(courant)) {
      const utilisees = heuresParJour[iso] || 0;
      
      // Appliquer limite pour jour d'échéance si livraison matinale
      const estJourEcheance = iso === dateEcheanceISO;
      const capaciteJour = estJourEcheance && livraisonMatinale ? capaciteJourJ : traducteur.capaciteHeuresParJour;
      
      const libre = Math.max(capaciteJour - utilisees, 0);
      if (libre > 0) {
        const alloue = Math.min(libre, restant);
        resultat.push({ date: iso, heures: alloue });
        restant -= alloue;
        // Mettre à jour mémoire pour éviter double comptage si futur usage
        heuresParJour[iso] = utilisees + alloue;
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
    resultTrie.forEach(r => console.debug(`  ${r.date}: ${r.heures.toFixed(2)}h`));
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

  const { date: dateDebut } = normalizeToOttawa(dateDebutInput, 'dateDebut');
  const { date: dateFin } = normalizeToOttawa(dateFinInput, 'dateFin');
  validateDateRange(dateDebut, dateFin);

  const jours = businessDaysOttawa(dateDebut, dateFin);
  if (jours.length === 0) throw new Error('Aucun jour ouvrable dans la période');

  const heuresParJour = await heuresUtiliseesParJour(traducteurId, dateDebut, dateFin);
  const disponibilites = jours
    .map((jour) => {
      const iso = formatOttawaISO(jour);
      const utilisees = heuresParJour[iso] || 0;
      const libre = Math.max(traducteur.capaciteHeuresParJour - utilisees, 0);
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
  
  // ÉTAPE 4: Construire le résultat final
  const resultat: RepartitionItem[] = allocations.map(alloc => ({
    date: alloc.iso,
    heures: parseFloat(alloc.heuresAllouees.toFixed(4))
  }));
  
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

  const { date: dateDebut } = normalizeToOttawa(dateDebutInput, 'dateDebut');
  const { date: dateFin } = normalizeToOttawa(dateFinInput, 'dateFin');
  validateDateRange(dateDebut, dateFin);

  const jours = businessDaysOttawa(dateDebut, dateFin);
  if (jours.length === 0) throw new Error('Aucun jour ouvrable dans la période');

  const heuresParJour = await heuresUtiliseesParJour(traducteurId, dateDebut, dateFin);
  const resultat: RepartitionItem[] = [];
  let restant = heuresTotal;

  for (const jour of jours) {
    if (restant <= 0) break;
    const iso = formatOttawaISO(jour);
    const utilisees = heuresParJour[iso] || 0;
    const libre = Math.max(traducteur.capaciteHeuresParJour - utilisees, 0);
    if (libre <= 0) continue;
    const alloue = Math.min(libre, restant);
    resultat.push({ date: iso, heures: parseFloat(alloue.toFixed(4)) });
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

// Validation répartition manuelle / uniforme
export async function validerRepartition(
  traducteurId: string,
  repartition: RepartitionItem[],
  heuresTotalAttendu: number,
  ignorerTacheId?: string
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
  for (const r of repartition) {
    const dateObj = new Date(r.date);
    const ajustements = await prisma.ajustementTemps.findMany({
      where: {
        traducteurId,
        date: { equals: dateObj },
        ...(ignorerTacheId ? { NOT: { tacheId: ignorerTacheId } } : {})
      }
    });
    const utilisees = ajustements.reduce((sum, a) => sum + a.heures, 0);
    const totalJour = utilisees + r.heures;
    if (traducteur && totalJour > traducteur.capaciteHeuresParJour + 1e-6) {
      erreurs.push(`Dépassement capacité le ${r.date} (utilisées + nouvelles = ${totalJour.toFixed(2)} / ${traducteur.capaciteHeuresParJour}).`);
    }
    if (r.heures < 0) erreurs.push(`Heures négatives interdites (${r.date}).`);
  }
  return { valide: erreurs.length === 0, erreurs };
}
