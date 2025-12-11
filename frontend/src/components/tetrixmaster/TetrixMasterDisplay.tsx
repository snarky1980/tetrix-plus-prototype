import React from 'react';

interface TetrixMasterDisplayProps {
  analyse: any; // Type complet TetrixMasterAnalyse
}

export const TetrixMasterDisplay: React.FC<TetrixMasterDisplayProps> = ({ analyse }) => {
  if (!analyse) return null;

  const { resumeExecutif, diagnosticComplet, recommandations, explicationPedagogique } = analyse;

  const getNiveauRisqueColor = (niveau: string) => {
    switch (niveau) {
      case 'CRITIQUE': return 'bg-red-100 text-red-800 border-red-300';
      case 'ELEVE': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MOYEN': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'FAIBLE': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPrioriteIcon = (priorite: number) => {
    switch (priorite) {
      case 1: return '🔴';
      case 2: return '🟡';
      case 3: return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className="space-y-6">
      {/* Résumé Exécutif */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          📊 Résumé Exécutif
        </h3>
        
        <div className={`inline-block px-4 py-2 rounded-full border-2 mb-4 font-semibold ${getNiveauRisqueColor(resumeExecutif.niveauRisque)}`}>
          Niveau de risque: {resumeExecutif.niveauRisque}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded p-3 border">
            <p className="text-xs text-gray-600">Score d'équilibre</p>
            <p className="text-2xl font-bold text-primary">{resumeExecutif.metriquesClés.scoreEquilibre}/100</p>
          </div>
          <div className="bg-white rounded p-3 border">
            <p className="text-xs text-gray-600">Surcharges</p>
            <p className="text-2xl font-bold text-red-600">{resumeExecutif.metriquesClés.traducteursSurcharges}</p>
          </div>
          <div className="bg-white rounded p-3 border">
            <p className="text-xs text-gray-600">Tâches en risque</p>
            <p className="text-2xl font-bold text-orange-600">{resumeExecutif.metriquesClés.tachesEnRisque}</p>
          </div>
          <div className="bg-white rounded p-3 border">
            <p className="text-xs text-gray-600">Capacité gaspillée</p>
            <p className="text-2xl font-bold text-blue-600">{resumeExecutif.metriquesClés.capaciteGaspillee}h</p>
          </div>
        </div>

        <div className="bg-white rounded p-4 border">
          <p className="text-sm font-semibold text-gray-700 mb-2">Problème principal:</p>
          <p className="text-base mb-3">{resumeExecutif.problemePrincipal}</p>
          <p className="text-sm font-semibold text-gray-700 mb-2">Objectif:</p>
          <p className="text-base">{resumeExecutif.objectif}</p>
        </div>
      </div>

      {/* Recommandations Priorisées */}
      {recommandations && recommandations.length > 0 && (
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-bold mb-4">🎯 Recommandations ({recommandations.length})</h3>
          
          <div className="space-y-3">
            {recommandations.map((rec: any) => (
              <div 
                key={rec.id}
                className={`p-4 rounded border-l-4 ${
                  rec.priorite === 1 ? 'bg-red-50 border-red-500' :
                  rec.priorite === 2 ? 'bg-yellow-50 border-yellow-500' :
                  'bg-green-50 border-green-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getPrioriteIcon(rec.priorite)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{rec.titre}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-white border">
                        Priorité {rec.priorite}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                    <div className="bg-white rounded p-2 border">
                      <p className="text-xs text-gray-600 mb-1">Action concrète:</p>
                      <p className="text-sm font-medium">{rec.actionConcrete}</p>
                    </div>
                    {rec.impactAttendu && (
                      <p className="text-xs text-gray-600 mt-2">
                        <span className="font-semibold">Impact:</span> {rec.impactAttendu}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnostic - Capacités */}
      {diagnosticComplet?.capacites && diagnosticComplet.capacites.length > 0 && (
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-bold mb-4">⚡ Analyse des Capacités</h3>
          
          <div className="space-y-3">
            {diagnosticComplet.capacites.map((cap: any, idx: number) => (
              <div key={idx} className={`p-4 rounded border-l-4 ${
                cap.gravite === 'CRITIQUE' ? 'bg-red-50 border-red-500' :
                cap.gravite === 'ELEVE' ? 'bg-orange-50 border-orange-500' :
                cap.gravite === 'MOYEN' ? 'bg-yellow-50 border-yellow-500' :
                'bg-blue-50 border-blue-500'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-semibold">{cap.traducteurNom}</span>
                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-white border">{cap.profil}</span>
                  </div>
                  <span className="text-lg font-bold">
                    {cap.metriques.tauxUtilisation.toFixed(0)}%
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{cap.description}</p>
                <p className="text-xs text-gray-600">{cap.impact}</p>
                {cap.datesConcernees && cap.datesConcernees.length > 0 && (
                  <p className="text-xs text-gray-600 mt-2">
                    <span className="font-semibold">Jours concernés:</span> {cap.datesConcernees.length}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnostic - Échéances */}
      {diagnosticComplet?.echeances && diagnosticComplet.echeances.length > 0 && (
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-bold mb-4">📅 Analyse des Échéances</h3>
          
          <div className="space-y-3">
            {diagnosticComplet.echeances.map((ech: any, idx: number) => (
              <div key={idx} className={`p-4 rounded border-l-4 ${
                ech.gravite === 'CRITIQUE' ? 'bg-red-50 border-red-500' :
                ech.gravite === 'ELEVE' ? 'bg-orange-50 border-orange-500' :
                'bg-yellow-50 border-yellow-500'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="font-semibold">{ech.numeroProjet}</span>
                  <span className="text-sm font-medium">{ech.dateEcheance}</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{ech.description}</p>
                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-gray-600">Restant:</span>
                    <span className="ml-1 font-semibold">{ech.heuresRestantes.toFixed(1)}h</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Jours:</span>
                    <span className="ml-1 font-semibold">{ech.joursDisponibles}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Charge veille:</span>
                    <span className="ml-1 font-semibold">{ech.tauxRemplissageVeille}%</span>
                  </div>
                </div>
                <div className="bg-white rounded p-2 border">
                  <p className="text-xs font-semibold text-gray-700">Recommandation:</p>
                  <p className="text-sm">{ech.recommandation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnostic - Conformité */}
      {diagnosticComplet?.conformite && diagnosticComplet.conformite.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-red-300">
          <h3 className="text-lg font-bold mb-4 text-red-700">⚠️ Problèmes de Conformité</h3>
          
          <div className="space-y-3">
            {diagnosticComplet.conformite.map((conf: any, idx: number) => (
              <div key={idx} className="p-4 rounded bg-red-50 border-l-4 border-red-500">
                <p className="font-semibold text-red-800 mb-2">{conf.description}</p>
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">Règle violée:</span> {conf.regleViolee}
                </p>
                <div className="bg-white rounded p-2 border border-red-200">
                  <p className="text-xs font-semibold text-gray-700">Correction:</p>
                  <p className="text-sm">{conf.correction}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explication Pédagogique */}
      {explicationPedagogique && (
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-bold mb-4">💡 Explication</h3>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm text-gray-700">
              {explicationPedagogique}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
