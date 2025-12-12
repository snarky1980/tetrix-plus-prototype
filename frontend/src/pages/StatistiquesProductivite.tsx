import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { LoadingSpinner } from '../components/ui/Spinner';
import { usePageTitle } from '../hooks/usePageTitle';
import statistiquesService, { type StatsProductivite } from '../services/statistiquesService';
import { formatOttawaISO, todayOttawa, addDaysOttawa } from '../utils/dateTimeOttawa';
import { useAuth } from '../contexts/AuthContext';

const StatistiquesProductivite: React.FC = () => {
  usePageTitle('Statistiques de Productivité', 'Analysez la productivité des traducteurs');
  const { utilisateur } = useAuth();

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
    const aujourd hui = todayOttawa();
    const fin = formatOttawaISO(aujourd hui);
    let debut: string;

    switch (periode) {
      case '7':
        debut = formatOttawaISO(addDaysOttawa(aujourd hui, -7));
        break;
      case '30':
        debut = formatOttawaISO(addDaysOttawa(aujourd hui, -30));
        break;
      case '90':
        debut = formatOttawaISO(addDaysOttawa(aujourd hui, -90));
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
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">📊 Statistiques de Productivité</h1>
            <p className="text-muted mt-1">Analysez la performance des traducteurs</p>
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
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Tendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stats.parTraducteur.map((trad, idx) => (
                        <tr key={trad.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-sm font-medium">{trad.nom}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{trad.division}</td>
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
