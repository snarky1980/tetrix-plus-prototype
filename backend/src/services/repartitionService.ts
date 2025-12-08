import prisma from '../config/database';
import { addDays, subDays, differenceInCalendarDays } from 'date-fns';
import { estWeekend } from './planificationService';

export interface RepartitionItem { date: string; heures: number }

const MAX_LOOKBACK_DAYS = 90; // Sécurité pour éviter boucle infinie
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type DateInput = Date | string;

function normaliserDateInput(dateInput: DateInput, label = 'date'): { date: Date; iso: string } {
  const toDateOnly = (dateObj: Date) => {
    if (isNaN(dateObj.getTime())) {
      throw new Error(`${label} invalide`);
    }
    const normalisee = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    normalisee.setHours(0, 0, 0, 0);
    return { date: normalisee, iso: normalisee.toISOString().split('T')[0] };
  };

  if (dateInput instanceof Date) {
    return toDateOnly(new Date(dateInput));
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (ISO_DATE_REGEX.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map(Number);
      return toDateOnly(new Date(year, month - 1, day));
    }
    return toDateOnly(new Date(trimmed));
  }

  throw new Error(`${label} invalide (attendu YYYY-MM-DD)`);
}

function joursOuvrablesEntre(dateDebut: Date, dateFin: Date): Date[] {
  const jours: Date[] = [];
  const totalJours = differenceInCalendarDays(dateFin, dateDebut) + 1;
  for (let i = 0; i < totalJours; i++) {
    const dateCourante = addDays(dateDebut, i);
    if (!estWeekend(dateCourante)) {
      jours.push(dateCourante);
    }
  }
  return jours;
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
    const iso = ajustement.date.toISOString().split('T')[0];
    heuresParJour[iso] = (heuresParJour[iso] || 0) + ajustement.heures;
  }
  return heuresParJour;
}

// Répartition "Juste-à-temps" (JAT)
export async function repartitionJusteATemps(
  traducteurId: string,
  heuresTotal: number,
  dateEcheanceInput: DateInput,
  debug = false
): Promise<RepartitionItem[]> {
  const { date: echeance, iso: dateEcheanceISO } = normaliserDateInput(dateEcheanceInput, 'dateEcheance');

  if (debug) console.debug(`[JAT] Début: traducteurId=${traducteurId}, heuresTotal=${heuresTotal}, dateEcheance=${dateEcheanceISO}`);
  
  if (heuresTotal <= 0) throw new Error('heuresTotal doit être > 0');
  const traducteur = await prisma.traducteur.findUnique({ where: { id: traducteurId } });
  if (!traducteur) throw new Error('Traducteur introuvable');
  
  if (debug) console.debug(`[JAT] Traducteur: ${traducteur.nom}, capacité=${traducteur.capaciteHeuresParJour}h/jour`);

  const aujourdHui = new Date();
  // Normaliser à minuit pour comparaison de jours
  aujourdHui.setHours(0,0,0,0);
  
  if (debug) console.debug(`[JAT] Échéance reçue: ${dateEcheanceISO}, normalisée: ${echeance.toISOString()}`);
  
  if (echeance < aujourdHui) throw new Error('dateEcheance déjà passée');

  const heuresParJour = await heuresUtiliseesParJour(traducteurId, aujourdHui, echeance);
  
  if (debug && Object.keys(heuresParJour).length > 0) {
    console.debug(`[JAT] Ajustements existants trouvés: ${Object.keys(heuresParJour).length}`);
    Object.entries(heuresParJour).forEach(([date, heures]) => {
      console.debug(`  ${date}: ${heures}h utilisées`);
    });
  }

  // Calculer capacité totale disponible sur la fenêtre (excluant les weekends)
  const totalJours = differenceInCalendarDays(echeance, aujourdHui) + 1;
  let capaciteDisponibleGlobale = 0;
  for (let i = 0; i < totalJours; i++) {
    const d = addDays(aujourdHui, i);
    const iso = d.toISOString().split('T')[0];
    // Ignorer les weekends dans le calcul de capacité
    if (estWeekend(d)) continue;
    const utilisees = heuresParJour[iso] || 0;
    capaciteDisponibleGlobale += Math.max(traducteur.capaciteHeuresParJour - utilisees, 0);
  }
  
  if (debug) {
    console.debug(`[JAT] Fenêtre: ${totalJours} jours (${aujourdHui.toISOString().split('T')[0]} à ${echeance.toISOString().split('T')[0]})`);
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
    const iso = courant.toISOString().split('T')[0];
    // Ignorer les weekends pour l'allocation
    if (!estWeekend(courant)) {
      const utilisees = heuresParJour[iso] || 0;
      const libre = Math.max(traducteur.capaciteHeuresParJour - utilisees, 0);
      if (libre > 0) {
        const alloue = Math.min(libre, restant);
        resultat.push({ date: iso, heures: alloue });
        restant -= alloue;
        // Mettre à jour mémoire pour éviter double comptage si futur usage
        heuresParJour[iso] = utilisees + alloue;
      }
    }
    courant = subDays(courant, 1);
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

  const { date: dateDebut } = normaliserDateInput(dateDebutInput, 'dateDebut');
  const { date: dateFin } = normaliserDateInput(dateFinInput, 'dateFin');
  if (dateFin < dateDebut) throw new Error('dateFin doit être après dateDebut');

  const jours = joursOuvrablesEntre(dateDebut, dateFin);
  if (jours.length === 0) throw new Error('Aucun jour ouvrable dans la période');

  const heuresParJour = await heuresUtiliseesParJour(traducteurId, dateDebut, dateFin);
  const disponibilites = jours
    .map((jour) => {
      const iso = jour.toISOString().split('T')[0];
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

  const resultat: RepartitionItem[] = disponibilites.map((d) => ({ date: d.iso, heures: 0 }));
  let restant = heuresTotal;

  disponibilites.forEach((jour, index) => {
    const joursRestants = disponibilites.length - index;
    const cible = parseFloat((restant / joursRestants).toFixed(4));
    const alloue = Math.min(jour.libre, cible);
    resultat[index].heures = alloue;
    jour.libre = parseFloat((jour.libre - alloue).toFixed(4));
    restant = parseFloat((restant - alloue).toFixed(4));
  });

  // S'il reste quelques centièmes à répartir à cause des arrondis, effectuer un second passage
  let guard = 0;
  while (restant > 1e-4 && guard < 100) {
    for (let i = 0; i < disponibilites.length && restant > 1e-4; i++) {
      const libre = disponibilites[i].libre;
      if (libre <= 0) continue;
      const ajout = Math.min(libre, restant);
      resultat[i].heures = parseFloat((resultat[i].heures + ajout).toFixed(4));
      disponibilites[i].libre = parseFloat((libre - ajout).toFixed(4));
      restant = parseFloat((restant - ajout).toFixed(4));
    }
    guard++;
  }

  if (restant > 1e-3) {
    throw new Error('Impossible de répartir toutes les heures de manière équilibrée.');
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

  const { date: dateDebut } = normaliserDateInput(dateDebutInput, 'dateDebut');
  const { date: dateFin } = normaliserDateInput(dateFinInput, 'dateFin');
  if (dateFin < dateDebut) throw new Error('dateFin doit être après dateDebut');

  const jours = joursOuvrablesEntre(dateDebut, dateFin);
  if (jours.length === 0) throw new Error('Aucun jour ouvrable dans la période');

  const heuresParJour = await heuresUtiliseesParJour(traducteurId, dateDebut, dateFin);
  const resultat: RepartitionItem[] = [];
  let restant = heuresTotal;

  for (const jour of jours) {
    if (restant <= 0) break;
    const iso = jour.toISOString().split('T')[0];
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
  const totalJours = differenceInCalendarDays(dateFin, dateDebut) + 1;
  if (totalJours <= 0) throw new Error('Intervalle de dates invalide');
  
  // Compter uniquement les jours ouvrables (lun-ven)
  const joursOuvrables: Date[] = [];
  for (let i = 0; i < totalJours; i++) {
    const dateCourante = addDays(dateDebut, i);
    if (!estWeekend(dateCourante)) {
      joursOuvrables.push(dateCourante);
    }
  }
  
  if (joursOuvrables.length === 0) {
    throw new Error('Aucun jour ouvrable dans l\'intervalle (uniquement des weekends)');
  }
  
  const base = heuresTotal / joursOuvrables.length;
  const items: RepartitionItem[] = [];
  let cumul = 0;
  for (const dateCourante of joursOuvrables) {
    const iso = dateCourante.toISOString().split('T')[0];
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
