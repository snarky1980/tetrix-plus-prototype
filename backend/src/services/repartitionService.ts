import prisma from '../config/database';
import { addDays, subDays, differenceInCalendarDays } from 'date-fns';
import { estWeekend } from './planificationService';

export interface RepartitionItem { date: string; heures: number }

const MAX_LOOKBACK_DAYS = 90; // Sécurité pour éviter boucle infinie

// Répartition "Juste-à-temps" (JAT)
export async function repartitionJusteATemps(
  traducteurId: string,
  heuresTotal: number,
  dateEcheance: Date,
  debug = false
): Promise<RepartitionItem[]> {
  if (debug) console.debug(`[JAT] Début: traducteurId=${traducteurId}, heuresTotal=${heuresTotal}, dateEcheance=${dateEcheance.toISOString()}`);
  
  if (heuresTotal <= 0) throw new Error('heuresTotal doit être > 0');
  const traducteur = await prisma.traducteur.findUnique({ where: { id: traducteurId } });
  if (!traducteur) throw new Error('Traducteur introuvable');
  
  if (debug) console.debug(`[JAT] Traducteur: ${traducteur.nom}, capacité=${traducteur.capaciteHeuresParJour}h/jour`);

  const aujourdHui = new Date();
  // Normaliser à minuit pour comparaison de jours
  aujourdHui.setHours(0,0,0,0);
  
  // Parser la date d'échéance correctement pour éviter les problèmes de timezone
  // Si dateEcheance est déjà un Date object créé depuis une string ISO, il peut avoir un décalage
  const echeance = new Date(dateEcheance);
  // Forcer la date en heure locale pour éviter le décalage de timezone
  const echeanceISO = echeance.toISOString().split('T')[0];
  const [year, month, day] = echeanceISO.split('-').map(Number);
  const echeanceCorrigee = new Date(year, month - 1, day);
  echeanceCorrigee.setHours(0,0,0,0);
  
  if (debug) console.debug(`[JAT] Échéance reçue: ${dateEcheance}, corrigée: ${echeanceCorrigee.toISOString()}`);
  
  if (echeanceCorrigee < aujourdHui) throw new Error('dateEcheance déjà passée');

  // Récupérer tous les ajustements entre aujourd'hui et l'échéance (tâches + blocages)
  const ajustements = await prisma.ajustementTemps.findMany({
    where: {
      traducteurId,
      date: { gte: aujourdHui, lte: echeanceCorrigee }
    },
    select: { date: true, heures: true }
  });

  // Indexer les heures existantes par jour ISO
  const heuresParJour: Record<string, number> = {};
  for (const a of ajustements) {
    const iso = a.date.toISOString().split('T')[0];
    heuresParJour[iso] = (heuresParJour[iso] || 0) + a.heures;
  }
  
  if (debug && ajustements.length > 0) {
    console.debug(`[JAT] Ajustements existants trouvés: ${ajustements.length}`);
    Object.entries(heuresParJour).forEach(([date, heures]) => {
      console.debug(`  ${date}: ${heures}h utilisées`);
    });
  }

  // Calculer capacité totale disponible sur la fenêtre (excluant les weekends)
  const totalJours = differenceInCalendarDays(echeanceCorrigee, aujourdHui) + 1;
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
    console.debug(`[JAT] Fenêtre: ${totalJours} jours (${aujourdHui.toISOString().split('T')[0]} à ${echeanceCorrigee.toISOString().split('T')[0]})`);
    console.debug(`[JAT] Capacité disponible totale: ${capaciteDisponibleGlobale.toFixed(2)}h`);
  }
  
  if (heuresTotal - 1e-6 > capaciteDisponibleGlobale) {
    throw new Error(`Capacité insuffisante dans la plage pour heuresTotal demandées (demandé: ${heuresTotal}h, disponible: ${capaciteDisponibleGlobale.toFixed(2)}h)`);
  }

  // Allocation JAT (remplir à rebours depuis l'échéance, en excluant les weekends)
  let restant = heuresTotal;
  const resultat: RepartitionItem[] = [];
  let courant = echeanceCorrigee;
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
