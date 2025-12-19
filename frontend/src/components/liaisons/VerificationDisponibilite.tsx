import React, { useState, useEffect } from 'react';
import {
  liaisonService,
  VerificationDisponibiliteResult,
  TraducteurInfo,
  DisponibiliteJour,
} from '../../services/liaisonService';

// Icônes
const IconCalendar = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const IconClock = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconCheck = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconX = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconWarning = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const IconLightbulb = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const IconUser = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const IconSearch = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

interface DisponibiliteCalendarProps {
  disponibilites: DisponibiliteJour[];
  label: string;
  color: 'blue' | 'green';
}

const DisponibiliteCalendar: React.FC<DisponibiliteCalendarProps> = ({
  disponibilites,
  label,
  color,
}) => {
  const colorClasses = {
    blue: {
      header: 'bg-blue-50 border-blue-200 text-blue-800',
      full: 'bg-blue-500',
      partial: 'bg-blue-300',
      empty: 'bg-gray-200',
    },
    green: {
      header: 'bg-green-50 border-green-200 text-green-800',
      full: 'bg-green-500',
      partial: 'bg-green-300',
      empty: 'bg-gray-200',
    },
  };

  const getBarWidth = (heuresDisponibles: number, capacite: number) => {
    if (capacite === 0) return 0;
    return Math.min(100, (heuresDisponibles / capacite) * 100);
  };

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className={`px-4 py-3 border-b ${colorClasses[color].header}`}>
        <h4 className="font-medium">{label}</h4>
      </div>
      <div className="p-4 space-y-3">
        {disponibilites.map((jour) => {
          const barWidth = getBarWidth(jour.heuresDisponibles, jour.capacite);
          const dateStr = new Date(jour.date).toLocaleDateString('fr-CA', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          });

          return (
            <div key={jour.date} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 capitalize">{dateStr}</span>
                <span className="font-medium">
                  {jour.heuresDisponibles.toFixed(1)}h / {jour.capacite}h
                </span>
              </div>
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                    barWidth >= 80
                      ? colorClasses[color].full
                      : barWidth >= 30
                      ? colorClasses[color].partial
                      : colorClasses[color].empty
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface ResultCardProps {
  result: VerificationDisponibiliteResult;
}

const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  const getStatusConfig = () => {
    if (result.disponibiliteCombinee && result.delaiRespecte) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-300',
        icon: <IconCheck />,
        iconBg: 'bg-green-100 text-green-600',
        title: 'Disponibilité confirmée',
        subtitle: 'Le traducteur et le réviseur peuvent respecter l\'échéance',
      };
    } else if (result.traducteurDisponible && !result.reviseurDisponible) {
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        icon: <IconWarning />,
        iconBg: 'bg-amber-100 text-amber-600',
        title: 'Réviseur non disponible',
        subtitle: 'Des alternatives sont proposées ci-dessous',
      };
    } else {
      return {
        bg: 'bg-red-50',
        border: 'border-red-300',
        icon: <IconX />,
        iconBg: 'bg-red-100 text-red-600',
        title: 'Délai impossible à respecter',
        subtitle: 'L\'échéance ne peut pas être atteinte',
      };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`rounded-2xl border-2 ${config.bg} ${config.border} overflow-hidden`}>
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${config.iconBg}`}>{config.icon}</div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{config.title}</h3>
            <p className="text-gray-600">{config.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Traducteur & Réviseur Info */}
      <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
              T
            </div>
            <div>
              <p className="text-sm text-gray-500">Traducteur</p>
              <p className="font-semibold">{result.traducteur.nom}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Catégorie</span>
              <span className="font-medium">{result.traducteur.categorie}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Heures nécessaires</span>
              <span className="font-medium">{result.traducteur.heuresNecessaires}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date fin estimée</span>
              <span className="font-medium">
                {result.traducteur.dateFin
                  ? new Date(result.traducteur.dateFin).toLocaleDateString('fr-CA')
                  : '-'}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-2">
              {result.traducteurDisponible ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                  <IconCheck /> Disponible
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                  <IconX /> Non disponible
                </span>
              )}
            </div>
          </div>
        </div>

        {result.reviseur && (
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                R
              </div>
              <div>
                <p className="text-sm text-gray-500">Réviseur</p>
                <p className="font-semibold">{result.reviseur.nom}</p>
                {result.reviseur.estPrincipal && (
                  <span className="text-xs text-yellow-600">★ Principal</span>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Heures révision</span>
                <span className="font-medium">{result.reviseur.heuresNecessaires}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date fin estimée</span>
                <span className="font-medium">
                  {result.reviseur.dateFin
                    ? new Date(result.reviseur.dateFin).toLocaleDateString('fr-CA')
                    : '-'}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-2">
                {result.reviseurDisponible ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                    <IconCheck /> Disponible
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                    <IconX /> Non disponible
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendriers de disponibilité */}
      {(result.traducteur.disponibilites.length > 0 || result.reviseur?.disponibilites?.length) && (
        <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.traducteur.disponibilites.length > 0 && (
            <DisponibiliteCalendar
              disponibilites={result.traducteur.disponibilites}
              label="Disponibilités traducteur"
              color="blue"
            />
          )}
          {result.reviseur && result.reviseur.disponibilites.length > 0 && (
            <DisponibiliteCalendar
              disponibilites={result.reviseur.disponibilites}
              label="Disponibilités réviseur"
              color="green"
            />
          )}
        </div>
      )}

      {/* Alertes */}
      {result.alertes.length > 0 && (
        <div className="px-6 pb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="font-medium text-amber-800 flex items-center gap-2 mb-2">
              <IconWarning /> Alertes
            </h4>
            <ul className="space-y-1">
              {result.alertes.map((alerte, idx) => (
                <li key={idx} className="text-sm text-amber-700 flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  {alerte}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Recommandations */}
      {result.recommandations.length > 0 && (
        <div className="px-6 pb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-medium text-blue-800 flex items-center gap-2 mb-2">
              <IconLightbulb /> Recommandations
            </h4>
            <ul className="space-y-1">
              {result.recommandations.map((reco, idx) => (
                <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                  <span className="text-blue-400 mt-1">→</span>
                  {reco}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Réviseurs alternatifs */}
      {result.reviseurAlternatifs && result.reviseurAlternatifs.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <h4 className="font-medium text-purple-800 flex items-center gap-2 mb-3">
              <IconUser /> Réviseurs alternatifs disponibles
            </h4>
            <div className="flex flex-wrap gap-2">
              {result.reviseurAlternatifs.map((reviseur) => (
                <button
                  key={reviseur.id}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-purple-300 rounded-lg text-purple-700 hover:bg-purple-100 transition-colors text-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center text-purple-600 text-xs font-bold">
                    {reviseur.nom.charAt(0)}
                  </div>
                  {reviseur.nom}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface VerificationDisponibiliteProps {
  traducteurId?: string;
  heuresTraduction?: number;
  dateEcheance?: string;
  onClose?: () => void;
}

export const VerificationDisponibilite: React.FC<VerificationDisponibiliteProps> = ({
  traducteurId: initialTraducteurId,
  heuresTraduction: initialHeures,
  dateEcheance: initialEcheance,
  onClose,
}) => {
  const [traducteurs, setTraducteurs] = useState<TraducteurInfo[]>([]);
  const [selectedTraducteur, setSelectedTraducteur] = useState(initialTraducteurId || '');
  const [heures, setHeures] = useState(initialHeures?.toString() || '');
  const [echeance, setEcheance] = useState(initialEcheance || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationDisponibiliteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const chargerTraducteurs = async () => {
      try {
        const data = await liaisonService.obtenirTraducteursNecessitantRevision();
        setTraducteurs(data);
      } catch (err) {
        console.error('Erreur chargement traducteurs:', err);
      }
    };
    chargerTraducteurs();
  }, []);

  const handleVerifier = async () => {
    if (!selectedTraducteur || !heures || !echeance) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const data = await liaisonService.verifierDisponibilite({
        traducteurId: selectedTraducteur,
        heuresTraduction: parseFloat(heures),
        dateEcheance: echeance,
      });

      setResult(data);
    } catch (err) {
      setError('Erreur lors de la vérification');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <IconCalendar />
            </div>
            <div className="text-white">
              <h2 className="text-xl font-bold">Vérification de disponibilité</h2>
              <p className="text-indigo-100 text-sm">
                Traducteur + Réviseur pour respecter l'échéance
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <IconX />
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="p-6 border-b bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Traducteur
            </label>
            <div className="relative">
              <select
                value={selectedTraducteur}
                onChange={(e) => setSelectedTraducteur(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">Sélectionner...</option>
                {traducteurs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom} ({t.categorie})
                  </option>
                ))}
              </select>
              <IconUser />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heures de traduction
            </label>
            <div className="relative">
              <input
                type="number"
                value={heures}
                onChange={(e) => setHeures(e.target.value)}
                min="0.5"
                step="0.5"
                placeholder="ex: 8"
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <IconClock />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date d'échéance
            </label>
            <div className="relative">
              <input
                type="date"
                value={echeance}
                onChange={(e) => setEcheance(e.target.value)}
                min={minDate}
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <IconCalendar />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleVerifier}
            disabled={loading || !selectedTraducteur || !heures || !echeance}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Vérification...
              </>
            ) : (
              <>
                <IconSearch />
                Vérifier la disponibilité
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <p className="text-red-700 flex items-center gap-2">
            <IconWarning />
            {error}
          </p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="p-6">
          <ResultCard result={result} />
        </div>
      )}
    </div>
  );
};

export default VerificationDisponibilite;
