/**
 * Utilitaires de formatage pour les champs de formulaire
 */

/**
 * Formate un numéro de projet au format 123-4567-001
 * Accepte seulement les chiffres et ajoute automatiquement les tirets
 * 
 * @param value - Valeur saisie par l'utilisateur
 * @returns Valeur formatée avec tirets (max 12 caractères: 3-4-3 + 2 tirets)
 */
export function formatNumeroProjet(value: string): string {
  // Enlever tout sauf les chiffres
  const digits = value.replace(/\D/g, '');
  
  // Limiter à 10 chiffres (3 + 4 + 3)
  const limited = digits.slice(0, 10);
  
  // Appliquer le format 123-4567-001
  if (limited.length <= 3) {
    return limited;
  } else if (limited.length <= 7) {
    // Format: 123-4567
    return `${limited.slice(0, 3)}-${limited.slice(3)}`;
  } else {
    // Format: 123-4567-001
    return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`;
  }
}

/**
 * Valide qu'un numéro de projet est complet (format 123-4567-001)
 * 
 * @param value - Numéro de projet à valider
 * @returns true si le format est valide et complet
 */
export function isValidNumeroProjet(value: string): boolean {
  // Format attendu: exactement 3 chiffres - 4 chiffres - 3 chiffres
  const regex = /^\d{3}-\d{4}-\d{3}$/;
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
