export const formatHeures = (h: number): string => {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(h);
};

export const formatPourAria = (h: number): string => `${formatHeures(h)} heure${h >= 2 ? 's' : ''}`;

/**
 * Vérifie si une date est un weekend (samedi ou dimanche)
 */
export const estWeekend = (date: string | Date): boolean => {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  const dayOfWeek = d.getDay(); // 0 = dimanche, 6 = samedi
  return dayOfWeek === 0 || dayOfWeek === 6;
};