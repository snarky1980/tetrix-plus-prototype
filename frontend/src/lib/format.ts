/**
 * Utilitaires de formatage
 */

/**
 * Formate un nombre d'heures avec une décimale
 * @param heures Nombre d'heures
 * @returns Chaîne formatée (ex: "7.5")
 */
export function formatHeures(heures: number): string {
  if (heures === undefined || heures === null) return '0';
  return heures.toFixed(1).replace(/\.0$/, '');
}

/**
 * Formate une durée en heures et minutes
 * @param heures Nombre d'heures
 * @returns Chaîne formatée (ex: "2h 30min")
 */
export function formatDuree(heures: number): string {
  const h = Math.floor(heures);
  const m = Math.round((heures - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}

/**
 * Formate un pourcentage
 * @param value Valeur (0-100)
 * @returns Chaîne formatée (ex: "75%")
 */
export function formatPourcentage(value: number): string {
  return `${Math.round(value)}%`;
}
