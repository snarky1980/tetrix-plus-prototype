/**
 * Service de gestion des jours fériés canadiens
 * Gère les congés statutaires pour 2025-2027 selon le calendrier PSAC/AFPC
 */

export interface JourFerie {
  date: Date;
  nom: string;
  description?: string;
}

/**
 * Liste complète des jours fériés pour 2025, 2026 et 2027
 * Basé sur le calendrier officiel PSAC/AFPC
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

const TOUS_JOURS_FERIES = [...JOURS_FERIES_2025, ...JOURS_FERIES_2026, ...JOURS_FERIES_2027];

export class JoursFeriesService {
  /**
   * Vérifie si une date donnée est un jour férié
   */
  static estJourFerie(date: Date): boolean {
    const dateStr = this.formatDate(date);
    return TOUS_JOURS_FERIES.some(
      (jf) => this.formatDate(jf.date) === dateStr
    );
  }

  /**
   * Obtient le nom du jour férié pour une date donnée
   */
  static obtenirNomJourFerie(date: Date): string | null {
    const dateStr = this.formatDate(date);
    const jourFerie = TOUS_JOURS_FERIES.find(
      (jf) => this.formatDate(jf.date) === dateStr
    );
    return jourFerie?.nom || null;
  }

  /**
   * Retourne tous les jours fériés pour une année donnée
   */
  static obtenirJoursFeries(annee: number): JourFerie[] {
    if (annee === 2025) return JOURS_FERIES_2025;
    if (annee === 2026) return JOURS_FERIES_2026;
    if (annee === 2027) return JOURS_FERIES_2027;
    return [];
  }

  /**
   * Retourne tous les jours fériés entre deux dates
   */
  static obtenirJoursFeriesEntreDates(
    dateDebut: Date,
    dateFin: Date
  ): JourFerie[] {
    return TOUS_JOURS_FERIES.filter(
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
    return TOUS_JOURS_FERIES;
  }
}
