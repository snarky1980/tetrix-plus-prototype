/**
 * Module de gestion centralisée des dates et heures pour Tetrix PLUS
 * 
 * RÈGLES STRICTES:
 * - Toutes les opérations de dates utilisent le fuseau horaire America/Toronto (Ottawa)
 * - Une "journée" = minuit à 23:59:59 heure d'Ottawa
 * - Gère automatiquement les transitions DST (Daylight Saving Time)
 * - PostgreSQL stocke en UTC, conversions explicites à chaque lecture/écriture
 * 
 * IMPORTANT: N'utilisez JAMAIS new Date() sans passer par ces fonctions!
 */

import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { addDays, subDays, differenceInCalendarDays, parseISO } from 'date-fns';

/**
 * Fuseau horaire de référence pour toutes les opérations
 * America/Toronto gère automatiquement:
 * - EST (Eastern Standard Time): UTC-5 en hiver
 * - EDT (Eastern Daylight Time): UTC-4 en été
 */
export const OTTAWA_TIMEZONE = 'America/Toronto';

/**
 * Regex pour valider format ISO date: YYYY-MM-DD
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Type accepté en entrée pour les fonctions de date
 */
export type DateInput = Date | string;

/**
 * Crée une Date représentant minuit (00:00:00) à Ottawa pour la date spécifiée
 * 
 * @param year Année (ex: 2025)
 * @param month Mois (1-12, pas 0-11!)
 * @param day Jour du mois (1-31)
 * @returns Date UTC équivalente à minuit Ottawa
 * 
 * @example
 * const noel = createOttawaDate(2025, 12, 25);
 * // Retourne Date UTC correspondant au 2025-12-25 00:00:00 heure Ottawa
 */
export function createOttawaDate(year: number, month: number, day: number): Date {
  // Créer string ISO avec heure locale Ottawa
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
  
  // Convertir en UTC (ce que PostgreSQL stocke)
  return fromZonedTime(dateStr, OTTAWA_TIMEZONE);
}

/**
 * Parse une string YYYY-MM-DD en Date représentant minuit Ottawa
 * 
 * @param dateStr String au format YYYY-MM-DD
 * @returns Date UTC équivalente à minuit Ottawa
 * @throws Error si format invalide
 * 
 * @example
 * const date = parseOttawaDateISO('2025-12-08');
 * // Retourne Date pour le 8 décembre 2025 à minuit heure Ottawa
 */
export function parseOttawaDateISO(dateStr: string): Date {
  if (!ISO_DATE_REGEX.test(dateStr)) {
    throw new Error(`Format de date invalide: "${dateStr}". Attendu: YYYY-MM-DD`);
  }
  
  const [year, month, day] = dateStr.split('-').map(Number);
  return createOttawaDate(year, month, day);
}

/**
 * Obtient la date et heure actuelle à Ottawa
 * 
 * @returns Date actuelle en timezone Ottawa
 * 
 * @example
 * const maintenant = nowOttawa();
 * // Si serveur en UTC, convertit automatiquement en heure Ottawa
 */
export function nowOttawa(): Date {
  return toZonedTime(new Date(), OTTAWA_TIMEZONE);
}

/**
 * Obtient le début de la journée actuelle (minuit) à Ottawa
 * 
 * @returns Date représentant aujourd'hui à 00:00:00 Ottawa
 * 
 * @example
 * const aujourdHui = todayOttawa();
 * // Retourne aujourd'hui à minuit heure Ottawa
 */
export function todayOttawa(): Date {
  const now = nowOttawa();
  return startOfDayOttawa(now);
}

/**
 * Formate une Date en string YYYY-MM-DD selon le fuseau Ottawa
 * 
 * @param date Date à formater
 * @returns String au format YYYY-MM-DD
 * 
 * @example
 * const date = new Date('2025-12-08T05:00:00Z'); // 00h Ottawa
 * formatOttawaISO(date); // Retourne '2025-12-08'
 */
export function formatOttawaISO(date: Date): string {
  return format(toZonedTime(date, OTTAWA_TIMEZONE), 'yyyy-MM-dd', { timeZone: OTTAWA_TIMEZONE });
}

/**
 * Obtient le début de journée (minuit) pour une date donnée à Ottawa
 * 
 * @param date Date de référence
 * @returns Date représentant minuit Ottawa pour cette journée
 * 
 * @example
 * const date = new Date('2025-12-08T15:30:00'); // 15h30
 * const minuit = startOfDayOttawa(date); // 2025-12-08 00:00:00 Ottawa
 */
export function startOfDayOttawa(date: Date): Date {
  const formatted = formatOttawaISO(date);
  return parseOttawaDateISO(formatted);
}

/**
 * Vérifie si deux dates représentent le même jour à Ottawa
 * 
 * @param date1 Première date
 * @param date2 Deuxième date
 * @returns true si même jour calendaire à Ottawa
 * 
 * @example
 * const d1 = new Date('2025-12-08T23:59:00'); // 23h59 le 8
 * const d2 = new Date('2025-12-08T00:01:00'); // 00h01 le 8
 * isSameDayOttawa(d1, d2); // true
 */
export function isSameDayOttawa(date1: Date, date2: Date): boolean {
  return formatOttawaISO(date1) === formatOttawaISO(date2);
}

/**
 * Ajoute un nombre de jours à une date (timezone-aware)
 * 
 * @param date Date de départ
 * @param days Nombre de jours à ajouter (peut être négatif)
 * @returns Nouvelle date
 * 
 * @example
 * const demain = addDaysOttawa(todayOttawa(), 1);
 */
export function addDaysOttawa(date: Date, days: number): Date {
  // date-fns gère automatiquement DST
  return addDays(date, days);
}

/**
 * Soustrait un nombre de jours à une date (timezone-aware)
 * 
 * @param date Date de départ
 * @param days Nombre de jours à soustraire
 * @returns Nouvelle date
 * 
 * @example
 * const hier = subDaysOttawa(todayOttawa(), 1);
 */
export function subDaysOttawa(date: Date, days: number): Date {
  return subDays(date, days);
}

/**
 * Calcule le nombre de jours calendaires entre deux dates à Ottawa
 * 
 * @param dateFrom Date de début (incluse)
 * @param dateTo Date de fin (incluse)
 * @returns Nombre de jours (peut être négatif si dateTo < dateFrom)
 * 
 * @example
 * const debut = parseOttawaDateISO('2025-12-08');
 * const fin = parseOttawaDateISO('2025-12-10');
 * differenceInDaysOttawa(debut, fin); // 2
 */
export function differenceInDaysOttawa(dateFrom: Date, dateTo: Date): number {
  return differenceInCalendarDays(dateTo, dateFrom);
}

/**
 * Normalise une entrée utilisateur (Date | string) en Date Ottawa
 * Remplace l'ancienne fonction normaliserDateInput
 * 
 * @param input Date ou string YYYY-MM-DD
 * @param label Label pour messages d'erreur
 * @returns Objet { date: Date, iso: string }
 * @throws Error si format invalide
 * 
 * @example
 * const { date, iso } = normalizeToOttawa('2025-12-08', 'dateEcheance');
 * // date = Date à minuit Ottawa
 * // iso = '2025-12-08'
 */
export function normalizeToOttawa(
  input: DateInput,
  label = 'date'
): { date: Date; iso: string } {
  let date: Date;
  
  if (input instanceof Date) {
    // Si Date, normaliser au début de journée Ottawa
    date = startOfDayOttawa(input);
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    
    // Cas 1: Format YYYY-MM-DD (recommandé)
    if (ISO_DATE_REGEX.test(trimmed)) {
      date = parseOttawaDateISO(trimmed);
    }
    // Cas 2: ISO complet avec heure (ex: "2025-12-08T12:30:00Z")
    else if (trimmed.includes('T')) {
      const parsed = parseISO(trimmed);
      if (isNaN(parsed.getTime())) {
        throw new Error(`${label} invalide: "${trimmed}"`);
      }
      date = startOfDayOttawa(parsed);
    }
    // Cas 3: Autre format, tenter parse standard
    else {
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) {
        throw new Error(`${label} invalide: "${trimmed}". Format attendu: YYYY-MM-DD`);
      }
      date = startOfDayOttawa(parsed);
    }
  } else {
    throw new Error(`${label}: type invalide (attendu Date ou string)`);
  }
  
  const iso = formatOttawaISO(date);
  return { date, iso };
}

/**
 * Vérifie si une date est un weekend (samedi ou dimanche)
 * 
 * @param date Date à vérifier
 * @returns true si samedi (6) ou dimanche (0)
 * 
 * @example
 * const samedi = parseOttawaDateISO('2025-12-13'); // Samedi
 * isWeekendOttawa(samedi); // true
 */
export function isWeekendOttawa(date: Date): boolean {
  const ottawaDate = toZonedTime(date, OTTAWA_TIMEZONE);
  const dayOfWeek = ottawaDate.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Dimanche = 0, Samedi = 6
}

/**
 * Génère la liste des jours ouvrables (lun-ven) entre deux dates à Ottawa
 * 
 * @param dateFrom Date de début (incluse)
 * @param dateTo Date de fin (incluse)
 * @returns Array de dates représentant les jours ouvrables
 * 
 * @example
 * const debut = parseOttawaDateISO('2025-12-08'); // Lundi
 * const fin = parseOttawaDateISO('2025-12-12');   // Vendredi
 * const jours = businessDaysOttawa(debut, fin);   // 5 jours
 */
export function businessDaysOttawa(dateFrom: Date, dateTo: Date): Date[] {
  const days: Date[] = [];
  const totalDays = differenceInDaysOttawa(dateFrom, dateTo) + 1;
  
  for (let i = 0; i < totalDays; i++) {
    const currentDay = addDaysOttawa(dateFrom, i);
    if (!isWeekendOttawa(currentDay)) {
      days.push(currentDay);
    }
  }
  
  return days;
}

/**
 * Convertit une Date en object avec date et iso pour compatibilité backend
 * Utile pour migrer progressivement depuis l'ancien code
 * 
 * @param date Date à convertir
 * @returns { date: Date, iso: string }
 */
export function toDateIso(date: Date): { date: Date; iso: string } {
  return {
    date,
    iso: formatOttawaISO(date)
  };
}

/**
 * Valide qu'une date n'est pas dans le passé (par rapport à aujourd'hui Ottawa)
 * 
 * @param date Date à valider
 * @param label Label pour message d'erreur
 * @throws Error si date passée
 */
export function validateNotPast(date: Date, label = 'Date'): void {
  const today = todayOttawa();
  if (date < today) {
    const dateStr = formatOttawaISO(date);
    const todayStr = formatOttawaISO(today);
    throw new Error(`${label} (${dateStr}) est dans le passé. Aujourd'hui: ${todayStr}`);
  }
}

/**
 * Valide qu'une date de fin est après une date de début
 * 
 * @param dateFrom Date de début
 * @param dateTo Date de fin
 * @param labelFrom Label date début
 * @param labelTo Label date fin
 * @throws Error si ordre incorrect
 */
export function validateDateRange(
  dateFrom: Date,
  dateTo: Date,
  labelFrom = 'Date de début',
  labelTo = 'Date de fin'
): void {
  if (dateTo < dateFrom) {
    const fromStr = formatOttawaISO(dateFrom);
    const toStr = formatOttawaISO(dateTo);
    throw new Error(`${labelTo} (${toStr}) doit être après ${labelFrom} (${fromStr})`);
  }
}
