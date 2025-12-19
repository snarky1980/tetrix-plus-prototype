import React, { useState, useEffect } from 'react';
import {
  liaisonService,
  TraducteurInfo,
  VerificationDisponibiliteResult,
} from '../../services/liaisonService';

interface VerificationReviseurButtonProps {
  traducteurId: string;
  heuresTraduction: number;
  dateEcheance: string;
  className?: string;
}

const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const IconWarning = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const IconX = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconSearch = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

/**
 * Bouton de vérification de disponibilité du réviseur
 * S'intègre dans le formulaire de création de tâche
 */
export const VerificationReviseurButton: React.FC<VerificationReviseurButtonProps> = ({
  traducteurId,
  heuresTraduction,
  dateEcheance,
  className = '',
}) => {
  const [traducteurInfo, setTraducteurInfo] = useState<TraducteurInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationDisponibiliteResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [needsRevision, setNeedsRevision] = useState(false);

  // Vérifier si le traducteur nécessite une révision
  useEffect(() => {
    const checkTraducteur = async () => {
      if (!traducteurId) {
        setNeedsRevision(false);
        setTraducteurInfo(null);
        return;
      }

      try {
        const traducteurs = await liaisonService.obtenirTraducteursNecessitantRevision();
        const trad = traducteurs.find((t) => t.id === traducteurId);
        setNeedsRevision(!!trad);
        setTraducteurInfo(trad || null);
      } catch (err) {
        console.error('Erreur vérification traducteur:', err);
        setNeedsRevision(false);
      }
    };

    checkTraducteur();
  }, [traducteurId]);

  const handleVerifier = async () => {
    if (!traducteurId || !heuresTraduction || !dateEcheance) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await liaisonService.verifierDisponibilite({
        traducteurId,
        heuresTraduction,
        dateEcheance,
      });
      setResult(data);
      setShowModal(true);
    } catch (err) {
      console.error('Erreur vérification:', err);
    } finally {
      setLoading(false);
    }
  };

  // Ne pas afficher si le traducteur n'a pas besoin de révision
  if (!needsRevision || !traducteurId) {
    return null;
  }

  const isDisabled = !traducteurId || !heuresTraduction || !dateEcheance;

  return (
    <>
      {/* Indicateur que le traducteur nécessite une révision */}
      <div className={`p-3 bg-purple-50 border border-purple-200 rounded-lg ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              {traducteurInfo?.categorie || 'TR01/TR02'}
            </span>
            <span className="text-sm text-purple-700">
              Ce traducteur nécessite une révision par un TR03
            </span>
          </div>
          <button
            type="button"
            onClick={handleVerifier}
            disabled={isDisabled || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <IconSearch />
            )}
            Vérifier disponibilité réviseur
          </button>
        </div>
      </div>

      {/* Modal de résultat */}
      {showModal && result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-auto">
            {/* Header */}
            <div
              className={`p-6 border-b ${
                result.disponibiliteCombinee && result.delaiRespecte
                  ? 'bg-green-50'
                  : result.traducteurDisponible && !result.reviseurDisponible
                  ? 'bg-amber-50'
                  : 'bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      result.disponibiliteCombinee && result.delaiRespecte
                        ? 'bg-green-100 text-green-600'
                        : result.traducteurDisponible && !result.reviseurDisponible
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {result.disponibiliteCombinee && result.delaiRespecte ? (
                      <IconCheck />
                    ) : result.traducteurDisponible && !result.reviseurDisponible ? (
                      <IconWarning />
                    ) : (
                      <IconX />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {result.disponibiliteCombinee && result.delaiRespecte
                        ? 'Disponibilité confirmée'
                        : result.traducteurDisponible && !result.reviseurDisponible
                        ? 'Réviseur non disponible'
                        : 'Délai impossible'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Échéance: {new Date(result.echeance).toLocaleDateString('fr-CA')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                >
                  <IconX />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Résumé */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Traducteur</p>
                  <p className="text-lg font-bold text-blue-900">{result.traducteur.nom}</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {result.traducteur.heuresNecessaires}h de traduction
                  </p>
                  <div className="mt-2">
                    {result.traducteurDisponible ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        <IconCheck /> Disponible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        <IconX /> Non disponible
                      </span>
                    )}
                  </div>
                </div>

                {result.reviseur && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Réviseur</p>
                    <p className="text-lg font-bold text-green-900">{result.reviseur.nom}</p>
                    <p className="text-xs text-green-700 mt-1">
                      {result.reviseur.heuresNecessaires}h de révision
                      {result.reviseur.estPrincipal && ' • Principal'}
                    </p>
                    <div className="mt-2">
                      {result.reviseurDisponible ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          <IconCheck /> Disponible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          <IconX /> Non disponible
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Alertes */}
              {result.alertes.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1">
                    <IconWarning /> Alertes
                  </h4>
                  <ul className="space-y-1">
                    {result.alertes.map((a, i) => (
                      <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                        <span className="text-amber-400 mt-1">•</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommandations */}
              {result.recommandations.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Recommandations</h4>
                  <ul className="space-y-1">
                    {result.recommandations.map((r, i) => (
                      <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                        <span className="text-blue-400 mt-1">→</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Réviseurs alternatifs */}
              {result.reviseurAlternatifs && result.reviseurAlternatifs.length > 0 && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="text-sm font-medium text-purple-800 mb-2">
                    👥 Réviseurs alternatifs disponibles
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.reviseurAlternatifs.map((r) => (
                      <span
                        key={r.id}
                        className="px-3 py-1 bg-white border border-purple-300 rounded-full text-sm text-purple-700"
                      >
                        {r.nom}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VerificationReviseurButton;
