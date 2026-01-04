/**
 * Utilitaires pour les traducteurs
 * Gère la transition entre les champs legacy (String[]) et les relations normalisées
 */

import type { Traducteur } from '../types';

/**
 * Obtient les spécialisations d'un traducteur
 * Utilise les relations normalisées si disponibles, sinon les champs legacy
 */
export function getSpecialisations(traducteur: Traducteur): string[] {
  if (traducteur.traducteurSpecialisations?.length) {
    return traducteur.traducteurSpecialisations.map(ts => ts.specialisation.nom);
  }
  return traducteur.specialisations || [];
}

/**
 * Obtient les domaines d'un traducteur
 * Utilise les relations normalisées si disponibles, sinon les champs legacy
 */
export function getDomaines(traducteur: Traducteur): string[] {
  if (traducteur.traducteurDomaines?.length) {
    return traducteur.traducteurDomaines.map(td => td.domaine.nom);
  }
  return traducteur.domaines || [];
}

/**
 * Obtient les divisions d'un traducteur
 * Utilise les relations normalisées si disponibles, sinon les champs legacy
 */
export function getDivisions(traducteur: Traducteur): string[] {
  if (traducteur.traducteurDivisions?.length) {
    return traducteur.traducteurDivisions.map(td => td.division.nom);
  }
  return traducteur.divisions || [];
}

/**
 * Obtient les clients habituels d'un traducteur
 * Utilise les relations normalisées si disponibles, sinon les champs legacy
 */
export function getClientsHabituels(traducteur: Traducteur): string[] {
  if (traducteur.traducteurClients?.length) {
    return traducteur.traducteurClients.map(tc => tc.client.nom);
  }
  return traducteur.clientsHabituels || [];
}

/**
 * Vérifie si un traducteur a une spécialisation donnée
 */
export function hasSpecialisation(traducteur: Traducteur, specialisation: string): boolean {
  return getSpecialisations(traducteur).some(
    s => s.toLowerCase() === specialisation.toLowerCase()
  );
}

/**
 * Vérifie si un traducteur travaille dans un domaine donné
 */
export function hasDomaine(traducteur: Traducteur, domaine: string): boolean {
  return getDomaines(traducteur).some(
    d => d.toLowerCase() === domaine.toLowerCase()
  );
}

/**
 * Vérifie si un traducteur appartient à une division donnée
 */
export function hasDivision(traducteur: Traducteur, division: string): boolean {
  return getDivisions(traducteur).some(
    d => d.toLowerCase() === division.toLowerCase()
  );
}

/**
 * Vérifie si un traducteur travaille avec un client donné
 */
export function hasClient(traducteur: Traducteur, client: string): boolean {
  return getClientsHabituels(traducteur).some(
    c => c.toLowerCase() === client.toLowerCase()
  );
}
