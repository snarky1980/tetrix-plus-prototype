export const formatHeures = (h: number): string => {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(h);
};

export const formatPourAria = (h: number): string => `${formatHeures(h)} heure${h >= 2 ? 's' : ''}`;