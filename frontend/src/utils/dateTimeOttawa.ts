/**
 * Module de gestion des dates avec timezone Ottawa (America/Toronto)
 * Utilise date-fns-tz pour gérer automatiquement les transitions DST
 */

import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { addDays, subDays, differenceInDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export const OTTAWA_TIMEZONE = 'America/Toronto';

/**
 * Timezones disponibles pour l'affichage
 * Note: Les données sont toujours stockées en timezone Ottawa
 */
export type DisplayTimezone = 
  | 'America/Toronto'      // EST/EDT - Ottawa, Toronto
  | 'America/Vancouver'    // PST/PDT - Vancouver
  | 'America/Halifax'      // AST/ADT - Maritimes
  | 'America/Winnipeg'     // CST/CDT - Manitoba
  | 'America/Edmonton'     // MST/MDT - Alberta
  | 'America/St_Johns'     // NST/NDT - Terre-Neuve
  | 'America/Montreal'     // EST/EDT - Montréal
  | 'America/Regina';      // CST (pas de DST) - Saskatchewan

export const TIMEZONE_LABELS: Record<DisplayTimezone, string> = {
  'America/Toronto': '🇨🇦 Toronto/Ottawa (EST/EDT)',
  'America/Montreal': '🇨🇦 Montréal (EST/EDT)',
  'America/Vancouver': '🇨🇦 Vancouver (PST/PDT)',
  'America/Halifax': '🇨🇦 Halifax/Maritimes (AST/ADT)',
  'America/Winnipeg': '🇨🇦 Winnipeg (CST/CDT)',
  'America/Edmonton': '🇨🇦 Edmonton/Calgary (MST/MDT)',
  'America/St_Johns': '🇨🇦 St. John\'s/Terre-Neuve (NST/NDT)',
  'America/Regina': '🇨🇦 Regina/Saskatchewan (CST)',
};

const TIMEZONE_PREFERENCE_KEY = 'tetrix-display-timezone-preference';

/**
 * Obtenir le timezone d'affichage préféré de l'utilisateur
 * Note: Cela n'affecte que l'affichage, les données restent en timezone Ottawa
 */
export function getDisplayTimezonePreference(): DisplayTimezone {
  const stored = localStorage.getItem(TIMEZONE_PREFERENCE_KEY);
  return (stored as DisplayTimezone) || OTTAWA_TIMEZONE;
}

/**
 * Définir le timezone d'affichage préféré de l'utilisateur
 */
export function setDisplayTimezonePreference(timezone: DisplayTimezone): void {
  localStorage.setItem(TIMEZONE_PREFERENCE_KEY, timezone);
}

/**
 * Obtenir la date/heure actuelle à Ottawa
 */
export function nowOttawa(): Date {
  return toZonedTime(new Date(), OTTAWA_TIMEZONE);
}

/**
 * Obtenir la date d'aujourd'hui à Ottawa (minuit)
 */
export function todayOttawa(): Date {
  const now = toZonedTime(new Date(), OTTAWA_TIMEZONE);
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  return fromZonedTime(new Date(year, month, day, 0, 0, 0), OTTAWA_TIMEZONE);
}

/**
 * Formater une date en YYYY-MM-DD dans le timezone d'Ottawa
 */
export function formatOttawaISO(date: Date): string {
  return format(toZonedTime(date, OTTAWA_TIMEZONE), 'yyyy-MM-dd', { timeZone: OTTAWA_TIMEZONE });
}

/**
 * Parser une string YYYY-MM-DD comme date à minuit Ottawa
 */
export function parseOttawaDateISO(dateStr: string | null | undefined): Date {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(NaN); // Return invalid date instead of throwing
  }
  
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Validate the parsed numbers
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return new Date(NaN);
  }
  
  return fromZonedTime(new Date(year, month - 1, day, 0, 0, 0), OTTAWA_TIMEZONE);
}

/**
 * Helper pour formater une date depuis Date object (équivalent à dateISO)
 */
export function dateISO(d: Date): string {
  return formatOttawaISO(d);
}

/**
 * Helper pour parser date ISO (équivalent à parseISODate)
 */
export function parseISODate(dateString: string | null | undefined): Date {
  return parseOttawaDateISO(dateString);
}

/**
 * Ajouter des jours à une date Ottawa
 */
export function addDaysOttawa(date: Date, days: number): Date {
  const zonedDate = toZonedTime(date, OTTAWA_TIMEZONE);
  const result = addDays(zonedDate, days);
  return fromZonedTime(result, OTTAWA_TIMEZONE);
}

/**
 * Soustraire des jours à une date Ottawa
 */
export function subDaysOttawa(date: Date, days: number): Date {
  const zonedDate = toZonedTime(date, OTTAWA_TIMEZONE);
  const result = subDays(zonedDate, days);
  return fromZonedTime(result, OTTAWA_TIMEZONE);
}

/**
 * Différence en jours entre deux dates (timezone Ottawa)
 */
export function differenceInDaysOttawa(dateLeft: Date, dateRight: Date): number {
  const left = toZonedTime(dateLeft, OTTAWA_TIMEZONE);
  const right = toZonedTime(dateRight, OTTAWA_TIMEZONE);
  return differenceInDays(left, right);
}

/**
 * Obtenir le début de journée (minuit) pour une date donnée
 */
export function startOfDayOttawa(date: Date): Date {
  const zonedDate = toZonedTime(date, OTTAWA_TIMEZONE);
  const start = startOfDay(zonedDate);
  return fromZonedTime(start, OTTAWA_TIMEZONE);
}

/**
 * Vérifier si une date est un weekend (samedi ou dimanche)
 */
export function isWeekendOttawa(date: Date): boolean {
  const zonedDate = toZonedTime(date, OTTAWA_TIMEZONE);
  const day = zonedDate.getDay();
  return day === 0 || day === 6; // 0 = dimanche, 6 = samedi
}

/**
 * Formats de date disponibles
 */
export type DateFormat = 
  | 'text-short'      // "11 déc. 2025"
  | 'text-long'       // "11 décembre 2025"
  | 'iso'             // "2025-12-11"
  | 'slash-dmy'       // "11/12/2025"
  | 'slash-mdy'       // "12/11/2025"
  | 'dash-dmy'        // "11-12-2025"
  | 'dash-mdy';       // "12-11-2025"

export const DATE_FORMAT_LABELS: Record<DateFormat, string> = {
  'text-short': '11 déc. 2025 (texte court)',
  'text-long': '11 décembre 2025 (texte long)',
  'iso': '2025-12-11 (ISO, AAAA-MM-JJ)',
  'slash-dmy': '11/12/2025 (JJ/MM/AAAA)',
  'slash-mdy': '12/11/2025 (MM/JJ/AAAA)',
  'dash-dmy': '11-12-2025 (JJ-MM-AAAA)',
  'dash-mdy': '12-11-2025 (MM-JJ-AAAA)',
};

const DATE_PREFERENCE_KEY = 'tetrix-date-format-preference';

/**
 * Obtenir le format de date préféré de l'utilisateur
 */
export function getDateFormatPreference(): DateFormat {
  const stored = localStorage.getItem(DATE_PREFERENCE_KEY);
  return (stored as DateFormat) || 'text-short';
}

/**
 * Définir le format de date préféré de l'utilisateur
 */
export function setDateFormatPreference(format: DateFormat): void {
  localStorage.setItem(DATE_PREFERENCE_KEY, format);
}

/**
 * Formater une date selon le format et le timezone préférés de l'utilisateur (ex: "11 déc. 2025")
 * Note: Les données sont stockées en timezone Ottawa, mais l'affichage utilise le timezone préféré
 */
export function formatDateDisplay(date: Date | null | undefined, customFormat?: DateFormat): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Date invalide';
  }
  
  const displayTimezone = getDisplayTimezonePreference();
  const zonedDate = toZonedTime(date, displayTimezone);
  const fmt = customFormat || getDateFormatPreference();
  
  switch (fmt) {
    case 'text-short':
      return format(zonedDate, 'd MMM yyyy', { timeZone: displayTimezone, locale: fr });
    
    case 'text-long':
      return format(zonedDate, 'd MMMM yyyy', { timeZone: displayTimezone, locale: fr });
    
    case 'iso':
      return format(zonedDate, 'yyyy-MM-dd', { timeZone: displayTimezone });
    
    case 'slash-dmy':
      return format(zonedDate, 'dd/MM/yyyy', { timeZone: displayTimezone });
    
    case 'slash-mdy':
      return format(zonedDate, 'MM/dd/yyyy', { timeZone: displayTimezone });
    
    case 'dash-dmy':
      return format(zonedDate, 'dd-MM-yyyy', { timeZone: displayTimezone });
    
    case 'dash-mdy':
      return format(zonedDate, 'MM-dd-yyyy', { timeZone: displayTimezone });
    
    default:
      return format(zonedDate, 'd MMM yyyy', { timeZone: displayTimezone, locale: fr });
  }
}

/**
 * Formater une date avec jour de la semaine (ex: "Mer. 11/12")
 */
export function formatDateWithWeekday(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Date invalide';
  }
  
  const displayTimezone = getDisplayTimezonePreference();
  const zonedDate = toZonedTime(date, displayTimezone);
  const weekday = format(zonedDate, 'EEE', { 
    timeZone: displayTimezone,
    locale: fr
  });
  const dayMonth = format(zonedDate, 'd/M', { timeZone: displayTimezone });
  return `${weekday}. ${dayMonth}`;
}

/**
 * Formater une date avec heure (ex: "11 déc. 2025 à 14h30")
 */
export function formatDateTimeDisplay(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Date invalide';
  }
  
  const displayTimezone = getDisplayTimezonePreference();
  const zonedDate = toZonedTime(date, displayTimezone);
  const dateStr = formatDateDisplay(date);
  const timeStr = format(zonedDate, 'HH:mm', { timeZone: displayTimezone });
  return `${dateStr} à ${timeStr}`;
}
