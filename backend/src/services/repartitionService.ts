import prisma from '../config/database';
import { addDays, subDays, differenceInCalendarDays } from 'date-fns';

export interface RepartitionItem { date: string; heures: number }

const MAX_LOOKBACK_DAYS = 90; // Sécurité pour éviter boucle infinie

// Répartition "Juste-à-temps" (JAT)
export async function repartitionJusteATemps(
  traducteurId: string,
  heuresTotal: number,
  dateEcheance: Date
): Promise<RepartitionItem[]> {
  if (heuresTotal <= 0) throw new Error('heuresTotal doit être > 0');
  const traducteur = await prisma.traducteur.findUnique({ where: { id: traducteurId } });
  if (!traducteur) throw new Error('Traducteur introuvable');

  const aujourdHui = new Date();
  // Normaliser à minuit pour comparaison de jours
  aujourdHui.setHours(0,0,0,0);
  const echeance = new Date(dateEcheance);
  echeance.setHours(0,0,0,0);
  if (echeance < aujourdHui) throw new Error('dateEcheance déjà passée');

  // Récupérer tous les ajustements entre aujourd'hui et l'échéance (tâches + blocages)
  const ajustements = await prisma.ajustementTemps.findMany({
    where: {
      traducteurId,
      date: { gte: aujourdHui, lte: echeance }
    },
    select: { date: true, heures: true }
  });

  // Indexer les heures existantes par jour ISO
  const heuresParJour: Record<string, number> = {};
  for (const a of ajustements) {
    const iso = a.date.toISOString().split('T')[0];
    heuresParJour[iso] = (heuresParJour[iso] || 0) + a.heures;
  }

  // Calculer capacité totale disponible sur la fenêtre
  const totalJours = differenceInCalendarDays(echeance, aujourdHui) + 1;
  let capaciteDisponibleGlobale = 0;
  for (let i = 0; i < totalJours; i++) {
    const d = addDays(aujourdHui, i);
    const iso = d.toISOString().split('T')[0];
    const utilisees = heuresParJour[iso] || 0;
    capaciteDisponibleGlobale += Math.max(traducteur.capaciteHeuresParJour - utilisees, 0);
  }
  if (heuresTotal - 1e-6 > capaciteDisponibleGlobale) {
    throw new Error('Capacité insuffisante dans la plage pour heuresTotal demandées');
  }

  // Allocation JAT (remplir à rebours depuis l'échéance)
  let restant = heuresTotal;
  const resultat: RepartitionItem[] = [];
  let courant = echeance;
  let iterations = 0;
  while (restant > 0 && iterations < MAX_LOOKBACK_DAYS) {
    if (courant < aujourdHui) break;
    const iso = courant.toISOString().split('T')[0];
    const utilisees = heuresParJour[iso] || 0;
    const libre = Math.max(traducteur.capaciteHeuresParJour - utilisees, 0);
    if (libre > 0) {
      const alloue = Math.min(libre, restant);
      resultat.push({ date: iso, heures: alloue });
      restant -= alloue;
      // Mettre à jour mémoire pour éviter double comptage si futur usage
      heuresParJour[iso] = utilisees + alloue;
    }
    courant = subDays(courant, 1);
    iterations++;
  }
  if (restant > 0) throw new Error('Impossible de répartir toutes les heures (capacité insuffisante après allocation).');
  // Retourner trié chronologiquement asc (pour cohérence frontend)
  return resultat.sort((a,b) => a.date.localeCompare(b.date));
}

// Répartition uniforme entre dateDebut et dateFin incluses
export function repartitionUniforme(
  heuresTotal: number,
  dateDebut: Date,
  dateFin: Date
): RepartitionItem[] {
  const jours = differenceInCalendarDays(dateFin, dateDebut) + 1;
  if (jours <= 0) throw new Error('Intervalle de dates invalide');
  const base = heuresTotal / jours;
  const items: RepartitionItem[] = [];
  let cumul = 0;
  for (let i = 0; i < jours; i++) {
    const dateCourante = addDays(dateDebut, i);
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
