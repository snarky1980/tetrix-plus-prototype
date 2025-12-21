import React, { memo } from 'react';

interface PlanificationRowProps {
  ligne: {
    traducteur: {
      id: string;
      nom: string;
      division?: string;
      disponiblePourTravail?: boolean;
    };
    jours: {
      date: string;
      capacite: number;
      occupe: number;
      disponible: number;
      estWeekend?: boolean;
      estFerie?: boolean;
      taches?: any[];
    }[];
  };
  idx: number;
  isSearchResult: boolean;
  searchTerm: string;
  showAvailable: boolean;
  onTraducteurClick: (traducteur: any) => void;
  onCellClick: (traducteurId: string, traducteurNom: string, date: string, taches: any[]) => void;
  onAddTask: (traducteurId: string, date: string) => void;
  renderCellContent: (jour: any, traducteur: any) => React.ReactNode;
}

/**
 * Composant mémorisé pour une ligne du tableau de planification
 * Évite les re-renders inutiles quand d'autres lignes changent
 */
export const PlanificationRow = memo<PlanificationRowProps>(({
  ligne,
  idx,
  isSearchResult,
  searchTerm: _searchTerm, // Utilisé dans la comparaison memo
  showAvailable: _showAvailable, // Utilisé dans la comparaison memo
  onTraducteurClick,
  onCellClick: _onCellClick, // Réservé pour usage futur
  onAddTask: _onAddTask, // Réservé pour usage futur
  renderCellContent,
}) => {
  const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-100';
  
  return (
    <tr 
      className={`group transition-all duration-200 ${isSearchResult ? 'ring-2 ring-yellow-400 ring-inset' : ''} ${bgClass} hover:bg-blue-50 hover:shadow-lg hover:relative hover:z-[5]`}
    >
      <td 
        className={`border-r border-b border-border px-2 py-1 font-medium sticky left-0 z-10 transition-colors ${isSearchResult ? 'bg-yellow-200 group-hover:bg-yellow-100' : bgClass} group-hover:bg-blue-50`}
      >
        <button
          onClick={() => onTraducteurClick(ligne.traducteur)}
          className="text-left w-full hover:text-primary transition-colors cursor-pointer"
          title={`Voir la charge de travail de ${ligne.traducteur.nom}`}
        >
          <div className={`truncate font-medium text-xs leading-tight ${isSearchResult ? 'text-yellow-900' : ''}`}>
            {isSearchResult && '⭐ '}
            {(ligne.traducteur as any).disponiblePourTravail && (
              <span className="text-green-600 mr-1" title="Disponible pour travail">●</span>
            )}
            {ligne.traducteur.nom}
          </div>
          {ligne.traducteur.division && (
            <div className="text-[10px] text-gray-500 truncate">
              {ligne.traducteur.division}
            </div>
          )}
        </button>
      </td>
      {ligne.jours.map((jour) => (
        <td 
          key={jour.date} 
          className="border-r border-b border-border p-0 text-center text-xs relative"
        >
          {renderCellContent(jour, ligne.traducteur)}
        </td>
      ))}
    </tr>
  );
}, (prevProps, nextProps) => {
  // Comparaison personnalisée pour éviter les re-renders inutiles
  return (
    prevProps.ligne.traducteur.id === nextProps.ligne.traducteur.id &&
    prevProps.idx === nextProps.idx &&
    prevProps.isSearchResult === nextProps.isSearchResult &&
    prevProps.searchTerm === nextProps.searchTerm &&
    prevProps.showAvailable === nextProps.showAvailable &&
    // Comparer les jours par référence (ils changent rarement)
    prevProps.ligne.jours === nextProps.ligne.jours
  );
});

PlanificationRow.displayName = 'PlanificationRow';

/**
 * Composant mémorisé pour l'en-tête du tableau
 */
export const PlanificationHeader = memo<{
  dates: string[];
  formatDate: (date: string) => { dayName: string; dayNum: number; month: number; isWeekend: boolean; isFerie: boolean; nomFerie?: string };
}>(({ dates, formatDate }) => (
  <thead className="sticky top-0 z-20">
    <tr>
      <th className="sticky left-0 z-30 bg-primary text-white px-2 py-1 text-left font-medium border-r border-white/20 min-w-[120px]">
        Traducteur
      </th>
      {dates.map((date) => {
        const { dayName, dayNum, month, isWeekend, isFerie, nomFerie } = formatDate(date);
        const isGrayed = isWeekend || isFerie;
        return (
          <th 
            key={date} 
            className={`min-w-[60px] px-1 py-1 text-center font-medium border-r border-white/20 ${isGrayed ? 'bg-gray-400 text-gray-100' : 'bg-primary text-white'}`}
            title={nomFerie || undefined}
          >
            <div className="text-[10px] uppercase">{isFerie ? '🎉' : dayName}</div>
            <div className="text-xs font-bold">
              {dayNum}/{month}
            </div>
          </th>
        );
      })}
    </tr>
  </thead>
));

PlanificationHeader.displayName = 'PlanificationHeader';
