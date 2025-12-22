import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { LoadingSpinner } from '../components/ui/Spinner';
import { usePageTitle } from '../hooks/usePageTitle';
import statistiquesService, { type StatsProductivite } from '../services/statistiquesService';
import { formatOttawaISO, todayOttawa, addDaysOttawa } from '../utils/dateTimeOttawa';

const StatistiquesProductivite: React.FC = () => {
  usePageTitle('Statistiques de Productivité', 'Analysez la productivité des traducteurs');

  // Lire les filtres depuis l'URL (portrait du planificateur)
  const [searchParams] = useSearchParams();
  const urlFilters = {
    division: searchParams.get('division') || undefined,
    client: searchParams.get('client') || undefined,
    domaine: searchParams.get('domaine') || undefined,
    langueSource: searchParams.get('langueSource') || undefined,
    langueCible: searchParams.get('langueCible') || undefined,
  };
  
  // Vérifier si des filtres sont actifs
  const hasActiveFilters = Object.values(urlFilters).some(v => v);

  const [stats, setStats] = useState<StatsProductivite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [periode, setPeriode] = useState('7'); // 7, 30, 90 jours
  const [dateDebut, setDateDebut] = useState(formatOttawaISO(addDaysOttawa(todayOttawa(), -7)));
  const [dateFin, setDateFin] = useState(formatOttawaISO(todayOttawa()));

  useEffect(() => {
    chargerStatistiques();
  }, []);

  useEffect(() => {
    // Mettre à jour les dates en fonction de la période
    const aujourdhui = todayOttawa();
    const fin = formatOttawaISO(aujourdhui);
    let debut: string;

    switch (periode) {
      case '7':
        debut = formatOttawaISO(addDaysOttawa(aujourdhui, -7));
        break;
      case '30':
        debut = formatOttawaISO(addDaysOttawa(aujourdhui, -30));
        break;
      case '90':
        debut = formatOttawaISO(addDaysOttawa(aujourdhui, -90));
        break;
      default:
        debut = dateDebut;
    }

    setDateDebut(debut);
    setDateFin(fin);
  }, [periode]);

  const chargerStatistiques = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await statistiquesService.obtenirProductivite({
        dateDebut,
        dateFin,
        // Filtres du portrait (traducteurs affichés dans le planificateur)
        ...urlFilters,
      });
      setStats(data);
    } catch (err) {
      console.error('Erreur chargement statistiques:', err);
      setError('Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  };

  const getTendanceIcon = (tendance: number) => {
    if (tendance > 5) return '📈';
    if (tendance < -5) return '📉';
    return '→';
  };

  const getTendanceColor = (tendance: number) => {
    if (tendance > 5) return 'text-green-600';
    if (tendance < -5) return 'text-red-600';
    return 'text-gray-600';
  };

  const getAlerteIcon = (type: string) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'info': return '💡';
      default: return 'ℹ️';
    }
  };

  const getAlerteColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-50 border-yellow-300 text-yellow-900';
      case 'success': return 'bg-green-50 border-green-300 text-green-900';
      case 'info': return 'bg-blue-50 border-blue-300 text-blue-900';
      default: return 'bg-gray-50 border-gray-300 text-gray-900';
    }
  };

  if (loading) {
    return (
      <AppLayout titre="Statistiques de Productivité">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout titre="Statistiques de Productivité">
      {/* Barre de navigation */}
      <div className="mb-6 flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-lg p-4">
        <Button
          variant="outline"
          onClick={() => window.location.href = '/tetrix-plus-prototype/conseiller'}
          className="flex items-center gap-2"
        >
          ← Portail Conseiller
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => window.location.href = '/tetrix-plus-prototype/conseiller/creation-tache'}>
            ➕ Nouvelle tâche
          </Button>
          <Button variant="ghost" onClick={() => window.location.href = '/tetrix-plus-prototype/planification-globale'}>
            📅 Planification
          </Button>
          <Button variant="ghost" onClick={() => window.location.href = '/tetrix-plus-prototype/liaisons'}>
            🔗 Liaisons
          </Button>
          <Button variant="ghost" onClick={() => window.location.href = '/tetrix-plus-prototype/conflict-resolution'}>
            ⚠️ Conflits
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">📊 Statistiques de Productivité</h1>
            <p className="text-muted mt-1">Analysez la performance des traducteurs</p>
            {/* Indicateur de filtres actifs (portrait) */}
            {hasActiveFilters && (
              <div className="mt-2 inline-flex items-center gap-2 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200">
                <span>🎯</span>
                <span>Portrait filtré depuis le planificateur</span>
                {urlFilters.division && <span className="bg-blue-100 px-2 py-0.5 rounded">Divisions: {urlFilters.division.split(',').length}</span>}
                {urlFilters.client && <span className="bg-blue-100 px-2 py-0.5 rounded">Clients: {urlFilters.client.split(',').length}</span>}
                {urlFilters.domaine && <span className="bg-blue-100 px-2 py-0.5 rounded">Domaines: {urlFilters.domaine.split(',').length}</span>}
                {urlFilters.langueSource && <span className="bg-blue-100 px-2 py-0.5 rounded">Langues source: {urlFilters.langueSource.split(',').length}</span>}
                {urlFilters.langueCible && <span className="bg-blue-100 px-2 py-0.5 rounded">Langues cible: {urlFilters.langueCible.split(',').length}</span>}
              </div>
            )}
          </div>
          <Button onClick={() => window.print()}>
            📄 Exporter
          </Button>
        </div>

        {/* Filtres */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Période</label>
                <Select value={periode} onChange={(e) => setPeriode(e.target.value)}>
                  <option value="7">7 derniers jours</option>
                  <option value="30">30 derniers jours</option>
                  <option value="90">90 derniers jours</option>
                </Select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Du</label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Au</label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md"
                />
              </div>
              <div className="pt-6">
                <Button onClick={chargerStatistiques}>
                  🔄 Actualiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-900 p-4 rounded-md">
            {error}
          </div>
        )}

        {stats && (
          <>
            {/* Vue d'ensemble - KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary">
                      {stats.vueEnsemble.motsTotaux.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted mt-1">📝 Total Mots</p>
                    <p className={`text-xs mt-1 ${getTendanceColor(stats.vueEnsemble.tendanceMots)}`}>
                      {getTendanceIcon(stats.vueEnsemble.tendanceMots)} {stats.vueEnsemble.tendanceMots > 0 ? '+' : ''}
                      {stats.vueEnsemble.tendanceMots.toFixed(1)}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-blue-600">
                      {stats.vueEnsemble.heuresTotales.toFixed(1)}h
                    </p>
                    <p className="text-sm text-muted mt-1">⏰ Total Heures</p>
                    <p className={`text-xs mt-1 ${getTendanceColor(stats.vueEnsemble.tendanceHeures)}`}>
                      {getTendanceIcon(stats.vueEnsemble.tendanceHeures)} {stats.vueEnsemble.tendanceHeures > 0 ? '+' : ''}
                      {stats.vueEnsemble.tendanceHeures.toFixed(1)}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-green-600">
                      {stats.vueEnsemble.productiviteMoyenne}
                    </p>
                    <p className="text-sm text-muted mt-1">⚡ Mots/Heure</p>
                    <p className={`text-xs mt-1 ${getTendanceColor(stats.vueEnsemble.tendanceProductivite)}`}>
                      {getTendanceIcon(stats.vueEnsemble.tendanceProductivite)} {stats.vueEnsemble.tendanceProductivite > 0 ? '+' : ''}
                      {stats.vueEnsemble.tendanceProductivite.toFixed(1)}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-purple-600">
                      {stats.vueEnsemble.traducteursActifs}
                    </p>
                    <p className="text-sm text-muted mt-1">👥 Traducteurs Actifs</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Statistiques par statut de tâche */}
            {stats.vueEnsemble.tachesTotal !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle>📋 Répartition des tâches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-700">{stats.vueEnsemble.tachesTotal}</p>
                      <p className="text-sm text-muted">Total</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-2xl font-bold text-green-600">{stats.vueEnsemble.tachesTerminees || 0}</p>
                      <p className="text-sm text-green-700">✅ Terminées</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-2xl font-bold text-blue-600">{stats.vueEnsemble.tachesEnCours || 0}</p>
                      <p className="text-sm text-blue-700">🔄 En cours</p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-2xl font-bold text-amber-600">{stats.vueEnsemble.tachesPlanifiees || 0}</p>
                      <p className="text-sm text-amber-700">📅 Planifiées</p>
                    </div>
                  </div>
                  {/* Barre de progression */}
                  {stats.vueEnsemble.tachesTotal > 0 && (
                    <div className="mt-4">
                      <div className="flex h-4 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500" 
                          style={{ width: `${((stats.vueEnsemble.tachesTerminees || 0) / stats.vueEnsemble.tachesTotal) * 100}%` }}
                          title={`${stats.vueEnsemble.tachesTerminees} terminées`}
                        />
                        <div 
                          className="bg-blue-500" 
                          style={{ width: `${((stats.vueEnsemble.tachesEnCours || 0) / stats.vueEnsemble.tachesTotal) * 100}%` }}
                          title={`${stats.vueEnsemble.tachesEnCours} en cours`}
                        />
                        <div 
                          className="bg-amber-400" 
                          style={{ width: `${((stats.vueEnsemble.tachesPlanifiees || 0) / stats.vueEnsemble.tachesTotal) * 100}%` }}
                          title={`${stats.vueEnsemble.tachesPlanifiees} planifiées`}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted mt-1">
                        <span>
                          Taux de complétion: {Math.round(((stats.vueEnsemble.tachesTerminees || 0) / stats.vueEnsemble.tachesTotal) * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Alertes & Recommandations */}
            {stats.alertes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>🎯 Alertes & Recommandations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.alertes.map((alerte, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-md border ${getAlerteColor(alerte.type)}`}
                      >
                        <span className="mr-2">{getAlerteIcon(alerte.type)}</span>
                        {alerte.message}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance par Traducteur */}
            <Card>
              <CardHeader>
                <CardTitle>👥 Performance par Traducteur</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nom</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Division</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Mots</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Heures</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Mots/h</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Tâches</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Terminées</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Tendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stats.parTraducteur.map((trad, idx) => (
                        <tr key={trad.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-sm font-medium">{trad.nom}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{trad.divisions?.join(', ') || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-right">{trad.mots.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right">{trad.heures.toFixed(1)}h</td>
                          <td className="px-4 py-3 text-sm text-right font-bold">
                            <span
                              className={
                                trad.productivite >= stats.vueEnsemble.productiviteMoyenne * 1.1
                                  ? 'text-green-600'
                                  : trad.productivite <= stats.vueEnsemble.productiviteMoyenne * 0.9
                                  ? 'text-red-600'
                                  : 'text-gray-900'
                              }
                            >
                              {trad.productivite}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">{trad.taches}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            {trad.tachesTerminees !== undefined ? (
                              <span className={trad.tachesTerminees > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                                ✅ {trad.tachesTerminees}
                              </span>
                            ) : '-'}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${getTendanceColor(trad.tendance)}`}>
                            {getTendanceIcon(trad.tendance)} {trad.tendance > 0 ? '+' : ''}{trad.tendance.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Analyses Détaillées */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Par Division */}
              {stats.parDivision.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>📂 Par Division</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.parDivision.map((div) => (
                        <div key={div.division} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{div.division}</span>
                          <span className="text-lg font-bold text-primary">
                            {div.productiviteMoyenne} m/h
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Par Type de Texte */}
              {stats.parTypeTexte.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>📝 Par Type de Texte</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.parTypeTexte.map((type) => (
                        <div key={type.type} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{type.type}</span>
                          <span className="text-lg font-bold text-primary">
                            {type.productiviteMoyenne} m/h
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default StatistiquesProductivite;
