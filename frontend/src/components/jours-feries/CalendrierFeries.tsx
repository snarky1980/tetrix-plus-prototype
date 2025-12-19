import React, { useEffect, useState } from 'react';
import { Calendar, AlertCircle, Info } from 'lucide-react';
import { joursFeriesService, type JourFerie } from '../../services/joursFeriesService';

interface CalendrierFeriesProps {
  className?: string;
}

export const CalendrierFeries: React.FC<CalendrierFeriesProps> = ({ className = '' }) => {
  const [joursFeries, setJoursFeries] = useState<JourFerie[]>([]);
  const [anneeSelectionnee, setAnneeSelectionnee] = useState<number>(new Date().getFullYear());
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    chargerJoursFeries();
  }, [anneeSelectionnee]);

  const chargerJoursFeries = async () => {
    try {
      setChargement(true);
      setErreur(null);
      const data = await joursFeriesService.obtenirParAnnee(anneeSelectionnee);
      setJoursFeries(data);
    } catch (err) {
      console.error('Erreur lors du chargement des jours fériés:', err);
      setErreur('Impossible de charger les jours fériés');
    } finally {
      setChargement(false);
    }
  };

  const formaterDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T12:00:00');
    return new Intl.DateTimeFormat('fr-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const joursFeriesParMois = React.useMemo(() => {
    const parMois: Record<number, JourFerie[]> = {};
    
    joursFeries.forEach((jf) => {
      const date = new Date(jf.date + 'T12:00:00');
      const mois = date.getMonth();
      if (!parMois[mois]) {
        parMois[mois] = [];
      }
      parMois[mois].push(jf);
    });

    return parMois;
  }, [joursFeries]);

  const nomsMois = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  if (chargement) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>{erreur}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Jours fériés canadiens
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={anneeSelectionnee}
              onChange={(e) => setAnneeSelectionnee(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Blocage automatique</p>
            <p>
              Ces journées sont automatiquement bloquées dans tous les planificateurs
              et ne peuvent pas être assignées aux traducteurs. Le système exclut ces dates
              lors de la répartition des tâches (modes JAT, ÉQUILIBRE et PEPS).
            </p>
          </div>
        </div>

        {joursFeries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Aucun jour férié configuré pour cette année</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nomsMois.map((nomMois, index) => {
              const feriesDuMois = joursFeriesParMois[index] || [];
              if (feriesDuMois.length === 0) return null;

              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                    {nomMois}
                  </h3>
                  <ul className="space-y-2">
                    {feriesDuMois.map((jf, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1.5"></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {jf.nom}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formaterDate(jf.date)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Total: <strong className="text-gray-900">{joursFeries.length}</strong> jours fériés en {anneeSelectionnee}
            </span>
            <span className="text-xs text-gray-500">
              Source: PSAC/AFPC - Fonction publique fédérale
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
