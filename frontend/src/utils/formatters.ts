/**
 * Utilitaires de formatage pour les champs de formulaire et l'affichage
 */

/**
 * Formate un horodatage en temps relatif en français
 * 
 * @param dateStr - Date au format ISO
 * @returns Texte relatif (ex: "À l'instant", "Il y a 5 min", "Il y a 2h")
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'À l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD < 7) return `Il y a ${diffD}j`;
  return date.toLocaleDateString('fr-CA');
}

/**
 * Formate un numéro de projet au format 123-123456-001
 * Accepte seulement les chiffres et ajoute automatiquement les tirets
 * 
 * @param value - Valeur saisie par l'utilisateur
 * @returns Valeur formatée avec tirets (max 14 caractères: 3-6-3 + 2 tirets)
 */
export function formatNumeroProjet(value: string): string {
  // Enlever tout sauf les chiffres
  const digits = value.replace(/\D/g, '');
  
  // Limiter à 12 chiffres (3 + 6 + 3)
  const limited = digits.slice(0, 12);
  
  // Appliquer le format 123-123456-001
  if (limited.length <= 3) {
    return limited;
  } else if (limited.length <= 9) {
    // Format: 123-123456
    return `${limited.slice(0, 3)}-${limited.slice(3)}`;
  } else {
    // Format: 123-123456-001
    return `${limited.slice(0, 3)}-${limited.slice(3, 9)}-${limited.slice(9)}`;
  }
}

/**
 * Valide qu'un numéro de projet est complet (format 123-123456-001)
 * 
 * @param value - Numéro de projet à valider
 * @returns true si le format est valide et complet
 */
export function isValidNumeroProjet(value: string): boolean {
  // Format attendu: exactement 3 chiffres - 6 chiffres - 3 chiffres
  const regex = /^\d{3}-\d{6}-\d{3}$/;
  return regex.test(value);
}

/**
 * Extrait les chiffres d'un numéro de projet (pour stockage en base)
 * 
 * @param value - Numéro de projet formaté
 * @returns Seulement les chiffres
 */
export function unformatNumeroProjet(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Formate une date avec le jour de la semaine abrégé en français
 * 
 * @param dateString - Date au format ISO (YYYY-MM-DD)
 * @returns Format "lun. 16 déc" ou "lun. 16 déc 2025"
 */
export function formatDateAvecJour(dateString: string, includeYear = false): string {
  if (!dateString) return '';
  
  const joursAbrev = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const moisAbrev = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
  
  const date = new Date(dateString + 'T12:00:00');
  const jour = joursAbrev[date.getDay()];
  const numero = date.getDate();
  const mois = moisAbrev[date.getMonth()];
  const annee = date.getFullYear();
  
  if (includeYear) {
    return `${jour} ${numero} ${mois} ${annee}`;
  }
  return `${jour} ${numero} ${mois}`;
}

/**
 * Obtient seulement le jour de la semaine abrégé
 * 
 * @param dateString - Date au format ISO (YYYY-MM-DD)
 * @returns "lun.", "mar.", etc.
 */
export function getJourSemaine(dateString: string): string {
  if (!dateString) return '';
  
  const joursAbrev = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const date = new Date(dateString + 'T12:00:00');
  return joursAbrev[date.getDay()];
}
