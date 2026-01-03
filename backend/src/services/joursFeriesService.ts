/**
 * Service de gestion des jours fériés canadiens
 * Gère les congés statutaires - version hybride BD + fallback hardcodé
 */

import { PrismaClient } from '.prisma/client';

// Import direct du client Prisma pour éviter les problèmes de cache TypeScript
const prisma = new PrismaClient();

export interface JourFerie {
  date: Date;
  nom: string;
  description?: string;
}

/**
 * Liste de fallback des jours fériés pour 2025, 2026 et 2027
 * Utilisée si la BD est vide ou inaccessible
 */
const JOURS_FERIES_2025: JourFerie[] = [
  { date: new Date('2025-12-25'), nom: 'Noël' },
  { date: new Date('2025-12-26'), nom: 'Lendemain de Noël' },
];

const JOURS_FERIES_2026: JourFerie[] = [
  { date: new Date('2026-01-01'), nom: "Jour de l'An" },
  { date: new Date('2026-01-02'), nom: "Congé du Jour de l'An (observé)" },
  { date: new Date('2026-04-03'), nom: 'Vendredi saint' },
  { date: new Date('2026-05-18'), nom: 'Fête de la Reine (Victoria Day)' },
  { date: new Date('2026-07-01'), nom: 'Fête du Canada' },
  { date: new Date('2026-09-07'), nom: 'Fête du Travail' },
  { date: new Date('2026-09-30'), nom: 'Journée nationale de la vérité et de la réconciliation' },
  { date: new Date('2026-10-12'), nom: "Action de grâces" },
  { date: new Date('2026-11-11'), nom: 'Jour du Souvenir' },
  { date: new Date('2026-12-25'), nom: 'Noël' },
  { date: new Date('2026-12-28'), nom: 'Congé de Noël (observé)' },
];

const JOURS_FERIES_2027: JourFerie[] = [
  { date: new Date('2027-01-01'), nom: "Jour de l'An" },
  { date: new Date('2027-03-26'), nom: 'Vendredi saint' },
  { date: new Date('2027-03-29'), nom: 'Lundi de Pâques' },
  { date: new Date('2027-05-24'), nom: 'Fête de la Reine (Victoria Day)' },
  { date: new Date('2027-07-01'), nom: 'Fête du Canada' },
  { date: new Date('2027-09-06'), nom: 'Fête du Travail' },
  { date: new Date('2027-09-30'), nom: 'Journée nationale de la vérité et de la réconciliation' },
  { date: new Date('2027-10-11'), nom: "Action de grâces" },
  { date: new Date('2027-11-11'), nom: 'Jour du Souvenir' },
  { date: new Date('2027-12-27'), nom: 'Noël (observé)' },
  { date: new Date('2027-12-28'), nom: 'Lendemain de Noël (observé)' },
];

const FALLBACK_JOURS_FERIES = [...JOURS_FERIES_2025, ...JOURS_FERIES_2026, ...JOURS_FERIES_2027];

// Cache des jours fériés de la BD (rafraîchi toutes les 5 minutes)
let cacheJoursFeries: JourFerie[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class JoursFeriesService {
  /**
   * Récupère les jours fériés de la BD avec cache
   */
  private static async getJoursFeriesFromDB(): Promise<JourFerie[]> {
    const now = Date.now();
    
    // Utiliser le cache si valide
    if (cacheJoursFeries && (now - cacheTimestamp) < CACHE_TTL) {
      return cacheJoursFeries;
    }
    
    try {
      const joursFeriesDB = await prisma.jourFerie.findMany({
        where: { actif: true },
        orderBy: { date: 'asc' },
      });
      
      if (joursFeriesDB.length > 0) {
        cacheJoursFeries = joursFeriesDB.map((jf: { date: Date; nom: string; description: string | null }) => ({
          date: jf.date,
          nom: jf.nom,
          description: jf.description || undefined,
        }));
        cacheTimestamp = now;
        return cacheJoursFeries!;
      }
    } catch (error) {
      console.warn('JoursFeriesService: Impossible de lire la BD, utilisation du fallback');
    }
    
    // Fallback si BD vide ou erreur
    return FALLBACK_JOURS_FERIES;
  }

  /**
   * Invalide le cache (à appeler après modification)
   */
  static invalidateCache(): void {
    cacheJoursFeries = null;
    cacheTimestamp = 0;
  }

  /**
   * Vérifie si une date donnée est un jour férié
   */
  static estJourFerie(date: Date): boolean {
    // Version synchrone - utilise le cache ou le fallback
    const joursFeries = cacheJoursFeries || FALLBACK_JOURS_FERIES;
    const dateStr = this.formatDate(date);
    return joursFeries.some(
      (jf) => this.formatDate(jf.date) === dateStr
    );
  }

  /**
   * Version asynchrone qui vérifie la BD
   */
  static async estJourFerieAsync(date: Date): Promise<boolean> {
    const joursFeries = await this.getJoursFeriesFromDB();
    const dateStr = this.formatDate(date);
    return joursFeries.some(
      (jf) => this.formatDate(jf.date) === dateStr
    );
  }

  /**
   * Obtient le nom du jour férié pour une date donnée
   */
  static obtenirNomJourFerie(date: Date): string | null {
    const joursFeries = cacheJoursFeries || FALLBACK_JOURS_FERIES;
    const dateStr = this.formatDate(date);
    const jourFerie = joursFeries.find(
      (jf) => this.formatDate(jf.date) === dateStr
    );
    return jourFerie?.nom || null;
  }

  /**
   * Retourne tous les jours fériés pour une année donnée
   */
  static obtenirJoursFeries(annee: number): JourFerie[] {
    const joursFeries = cacheJoursFeries || FALLBACK_JOURS_FERIES;
    return joursFeries.filter(jf => jf.date.getFullYear() === annee);
  }

  /**
   * Version asynchrone
   */
  static async obtenirJoursFeriesAsync(annee: number): Promise<JourFerie[]> {
    const joursFeries = await this.getJoursFeriesFromDB();
    return joursFeries.filter(jf => jf.date.getFullYear() === annee);
  }

  /**
   * Retourne tous les jours fériés entre deux dates
   */
  static obtenirJoursFeriesEntreDates(
    dateDebut: Date,
    dateFin: Date
  ): JourFerie[] {
    const joursFeries = cacheJoursFeries || FALLBACK_JOURS_FERIES;
    return joursFeries.filter(
      (jf) => jf.date >= dateDebut && jf.date <= dateFin
    );
  }

  /**
   * Filtre une liste de dates pour exclure les jours fériés
   */
  static filtrerJoursFeries(dates: Date[]): Date[] {
    return dates.filter((date) => !this.estJourFerie(date));
  }

  /**
   * Compte le nombre de jours ouvrables (excluant week-ends et fériés) entre deux dates
   */
  static compterJoursOuvrables(dateDebut: Date, dateFin: Date): number {
    let count = 0;
    const current = new Date(dateDebut);

    while (current <= dateFin) {
      const dayOfWeek = current.getDay();
      // Exclure samedi (6) et dimanche (0) et jours fériés
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !this.estJourFerie(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Obtient la prochaine date ouvrable (excluant week-ends et fériés)
   */
  static prochainJourOuvrable(date: Date): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);

    while (
      next.getDay() === 0 ||
      next.getDay() === 6 ||
      this.estJourFerie(next)
    ) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Formate une date en YYYY-MM-DD pour comparaison
   */
  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Retourne tous les jours fériés configurés
   */
  static obtenirTousLesJoursFeries(): JourFerie[] {
    return cacheJoursFeries || FALLBACK_JOURS_FERIES;
  }

  /**
   * Version asynchrone - charge de la BD
   */
  static async obtenirTousLesJoursFeriesAsync(): Promise<JourFerie[]> {
    return this.getJoursFeriesFromDB();
  }

  /**
   * Force le rechargement du cache depuis la BD
   */
  static async rechargerCache(): Promise<void> {
    this.invalidateCache();
    await this.getJoursFeriesFromDB();
  }
}
