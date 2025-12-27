/**
 * Constantes de configuration partagées pour le frontend
 * 
 * Centralise les valeurs de configuration pour éviter les magic numbers
 * et assurer la cohérence à travers l'application.
 */

// ============================================
// NOTIFICATIONS
// ============================================

/** Intervalle de rafraîchissement du compteur de notifications (ms) */
export const NOTIFICATION_POLLING_INTERVAL_MS = 60_000; // 1 minute

/** Nombre maximum de notifications à charger dans le popup */
export const NOTIFICATION_FETCH_LIMIT = 20;

/** Valeur maximale affichée pour le compteur de notifications */
export const NOTIFICATION_COUNT_MAX_DISPLAY = 99;

// ============================================
// COMPTEURS GÉNÉRAUX (demandes ressources, traducteurs dispo)
// ============================================

/** Intervalle de rafraîchissement des compteurs généraux (ms) */
export const COMPTEURS_POLLING_INTERVAL_MS = 30_000; // 30 secondes

// ============================================
// PLANIFICATION
// ============================================

/** Intervalle de rafraîchissement automatique de la planification (ms) */
export const PLANIFICATION_AUTO_REFRESH_MS = 120_000; // 2 minutes

/** Nombre de jours par défaut dans la vue planification */
export const PLANIFICATION_JOURS_DEFAUT = 10;

// ============================================
// FORMULAIRES
// ============================================

/** Délai de debounce pour les recherches (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

// ============================================
// UI
// ============================================

/** Durée d'animation par défaut pour les transitions (ms) */
export const ANIMATION_DURATION_MS = 150;

/** Z-index pour les popups et modales */
export const Z_INDEX = {
  DROPDOWN: 20,
  POPUP: 50,
  MODAL: 100,
  TOAST: 150,
} as const;
