/**
 * Utilitaires pour l'export de données en CSV
 */

/**
 * Convertit un tableau d'objets en CSV
 */
export function convertirEnCSV<T extends Record<string, unknown>>(
  donnees: T[],
  colonnes: { cle: keyof T; label: string }[]
): string {
  if (donnees.length === 0) return '';

  // En-têtes
  const headers = colonnes.map(c => `"${c.label}"`).join(',');
  
  // Lignes de données
  const lignes = donnees.map(item => {
    return colonnes.map(col => {
      const valeur = item[col.cle];
      if (valeur === null || valeur === undefined) return '""';
      if (typeof valeur === 'string') return `"${valeur.replace(/"/g, '""')}"`;
      if (Array.isArray(valeur)) return `"${valeur.join(', ')}"`;
      if (typeof valeur === 'object') return `"${JSON.stringify(valeur)}"`;
      return `"${valeur}"`;
    }).join(',');
  });

  return [headers, ...lignes].join('\n');
}

/**
 * Télécharge un fichier CSV
 */
export function telechargerCSV(contenu: string, nomFichier: string): void {
  // Ajouter BOM pour Excel
  const bom = '\uFEFF';
  const blob = new Blob([bom + contenu], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomFichier}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export des traducteurs
 */
export function exporterTraducteurs(traducteurs: any[]): void {
  const colonnes = [
    { cle: 'nom' as const, label: 'Nom' },
    { cle: 'categorie' as const, label: 'Catégorie' },
    { cle: 'divisions' as const, label: 'Divisions' },
    { cle: 'actif' as const, label: 'Actif' },
    { cle: 'capaciteHeuresParJour' as const, label: 'Capacité (h/jour)' },
    { cle: 'horaire' as const, label: 'Horaire' },
    { cle: 'domaines' as const, label: 'Domaines' },
    { cle: 'specialisations' as const, label: 'Spécialisations' },
  ];
  
  const csv = convertirEnCSV(traducteurs, colonnes);
  telechargerCSV(csv, 'traducteurs');
}

/**
 * Export des utilisateurs
 */
export function exporterUtilisateurs(utilisateurs: any[]): void {
  const colonnes = [
    { cle: 'email' as const, label: 'Email' },
    { cle: 'nom' as const, label: 'Nom' },
    { cle: 'prenom' as const, label: 'Prénom' },
    { cle: 'role' as const, label: 'Rôle' },
    { cle: 'actif' as const, label: 'Actif' },
    { cle: 'creeLe' as const, label: 'Créé le' },
  ];
  
  const csv = convertirEnCSV(utilisateurs, colonnes);
  telechargerCSV(csv, 'utilisateurs');
}

/**
 * Export des tâches
 */
export function exporterTaches(taches: any[]): void {
  const colonnes = [
    { cle: 'numeroProjet' as const, label: 'Numéro Projet' },
    { cle: 'description' as const, label: 'Description' },
    { cle: 'statut' as const, label: 'Statut' },
    { cle: 'typeTache' as const, label: 'Type' },
    { cle: 'heuresTotal' as const, label: 'Heures Total' },
    { cle: 'dateEcheance' as const, label: 'Échéance' },
    { cle: 'modeDistribution' as const, label: 'Mode Distribution' },
    { cle: 'priorite' as const, label: 'Priorité' },
  ];
  
  const csv = convertirEnCSV(taches, colonnes);
  telechargerCSV(csv, 'taches');
}

/**
 * Export des divisions
 */
export function exporterDivisions(divisions: any[]): void {
  const colonnes = [
    { cle: 'code' as const, label: 'Code' },
    { cle: 'nom' as const, label: 'Nom' },
    { cle: 'description' as const, label: 'Description' },
    { cle: 'actif' as const, label: 'Actif' },
  ];
  
  const csv = convertirEnCSV(divisions, colonnes);
  telechargerCSV(csv, 'divisions');
}
