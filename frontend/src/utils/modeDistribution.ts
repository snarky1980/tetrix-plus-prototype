/**
 * Utilitaires pour la conversion des modes de distribution
 * 
 * Le frontend utilise 'JUSTE_TEMPS' pour l'interface utilisateur
 * Le backend/API utilise 'JAT' pour la base de données
 * Les autres modes (PEPS, EQUILIBRE, MANUEL) sont identiques
 */

import type { ModeDistribution, TypeRepartitionUI } from '../types';

/**
 * Convertit un mode UI vers le mode API/DB
 * @param mode Mode affiché dans l'interface ('JUSTE_TEMPS', 'PEPS', 'EQUILIBRE', 'MANUEL')
 * @returns Mode pour l'API ('JAT', 'PEPS', 'EQUILIBRE', 'MANUEL')
 */
export const toApiMode = (mode: TypeRepartitionUI): ModeDistribution => {
  return mode === 'JUSTE_TEMPS' ? 'JAT' : mode;
};

/**
 * Convertit un mode API/DB vers le mode UI
 * @param mode Mode de la base de données ('JAT', 'PEPS', 'EQUILIBRE', 'MANUEL')
 * @returns Mode pour l'interface ('JUSTE_TEMPS', 'PEPS', 'EQUILIBRE', 'MANUEL')
 */
export const toUIMode = (mode: ModeDistribution | string | null | undefined): TypeRepartitionUI => {
  if (!mode) return 'JUSTE_TEMPS'; // Par défaut
  return mode === 'JAT' ? 'JUSTE_TEMPS' : mode as TypeRepartitionUI;
};

/**
 * Vérifie si un mode est valide
 */
export const isValidUIMode = (mode: string): mode is TypeRepartitionUI => {
  return ['JUSTE_TEMPS', 'PEPS', 'EQUILIBRE', 'MANUEL'].includes(mode);
};

export const isValidApiMode = (mode: string): mode is ModeDistribution => {
  return ['JAT', 'PEPS', 'EQUILIBRE', 'MANUEL'].includes(mode);
};

/**
 * Labels pour l'affichage des modes
 */
export const MODE_LABELS: Record<TypeRepartitionUI, string> = {
  'JUSTE_TEMPS': 'Juste-à-temps (JAT)',
  'PEPS': 'Premier entré, premier sorti (PEPS)',
  'EQUILIBRE': 'Répartition équilibrée',
  'MANUEL': 'Répartition manuelle',
};

/**
 * Descriptions des modes
 */
export const MODE_DESCRIPTIONS: Record<TypeRepartitionUI, string> = {
  'JUSTE_TEMPS': 'Travail planifié le plus tard possible avant la date d\'échéance',
  'PEPS': 'Travail planifié dès que possible selon les disponibilités',
  'EQUILIBRE': 'Heures réparties uniformément sur la période',
  'MANUEL': 'Vous définissez la répartition jour par jour',
};
