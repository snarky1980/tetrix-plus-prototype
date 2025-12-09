import prisma from '../config/database';
import {
  DateInput,
  normalizeToOttawa,
  formatOttawaISO,
  todayOttawa,
  addDaysOttawa,
  subDaysOttawa,
  differenceInDaysOttawa,
  businessDaysOttawa,
  isWeekendOttawa,
  validateNotPast,
  validateDateRange
} from '../utils/dateTimeOttawa';

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

  const { date: echeance, iso: dateEcheanceISO } = normalizeToOttawa(dateEcheanceInput, 'dateEcheance');

  if (debug) {
    console.debug(`[JAT] Début: traducteurId=${traducteurId}, heuresTotal=${heuresTotal}, dateEcheance=${dateEcheanceISO}`);
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
  const totalJours = differenceInDaysOttawa(echeance, aujourdHui) + 1;
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

  // Nouvelle méthode: distribuer en centimes pour éviter arrondis
  // Convertir tout en centièmes (heures * 100)
  const heuresCentimes = Math.round(heuresTotal * 100);
  const nbJours = disponibilites.length;
  const baseParJour = Math.floor(heuresCentimes / nbJours); // centièmes par jour
  let reste = heuresCentimes - (baseParJour * nbJours); // centièmes restants
  
  const resultat: RepartitionItem[] = disponibilites.map((jour, index) => {
    // Chaque jour reçoit sa part de base + 1 centime si reste > 0
    let centimes = baseParJour;
    if (reste > 0) {
      centimes += 1;
      reste--;
    }
    
    // Convertir en heures et respecter capacité disponible
    const heures = Math.min(centimes / 100, jour.libre);
    return { date: jour.iso, heures: parseFloat(heures.toFixed(4)) };
  });
  
  // Vérifier somme exacte (tolérance 0.01h)
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
