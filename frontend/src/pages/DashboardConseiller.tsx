import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/Spinner';
import { ConflictOverview } from '../components/ConflictOverview';
import { useAuth } from '../contexts/AuthContext';
import { tacheService } from '../services/tacheService';
import { formatDateDisplay } from '../utils/dateTimeOttawa';
import type { Tache } from '../types';

/**
 * Dashboard Conseiller - Vue d'ensemble avec les tâches créées
 */
const DashboardConseiller: React.FC = () => {
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const [taches, setTaches] = useState<Tache[]>([]);
  const [tachesFiltered, setTachesFiltered] = useState<Tache[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    chargerTaches();
  }, []);

  const chargerTaches = async () => {
    setLoading(true);
    try {
      const data = await tacheService.obtenirTaches({});
      // Trier par date de création (plus récent d'abord)
      const tachesTries = data.sort((a, b) => 
        new Date(b.creeLe).getTime() - new Date(a.creeLe).getTime()
      );
      setTaches(tachesTries);
      setTachesFiltered(tachesTries);
    } catch (err) {
      console.error('Erreur chargement tâches:', err);
    } finally {
      setLoading(false);
    }
  };

  const appliquerFiltres = () => {
    let filtered = [...taches];

    if (filtreStatut) {
      filtered = filtered.filter(t => t.statut === filtreStatut);
    }

    if (recherche) {
      const rech = recherche.toLowerCase();
      filtered = filtered.filter(t => 
        t.numeroProjet.toLowerCase().includes(rech) ||
        t.description?.toLowerCase().includes(rech) ||
        t.traducteur?.nom.toLowerCase().includes(rech) ||
        t.client?.nom.toLowerCase().includes(rech)
      );
    }

    setTachesFiltered(filtered);
  };

  const reinitialiserFiltres = () => {
    setFiltreStatut('');
    setRecherche('');
    setTachesFiltered(taches);
  };

  const getStatutBadgeVariant = (statut: string) => {
    switch (statut) {
      case 'TERMINEE': return 'success';
      case 'EN_COURS': return 'info';
      default: return 'default';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'PLANIFIEE': return 'Planifiée';
      case 'EN_COURS': return 'En cours';
      case 'TERMINEE': return 'Terminée';
      default: return statut;
    }
  };

  const stats = {
    total: taches.length,
    planifiees: taches.filter(t => t.statut === 'PLANIFIEE').length,
    enCours: taches.filter(t => t.statut === 'EN_COURS').length,
    terminees: taches.filter(t => t.statut === 'TERMINEE').length,
    heuresTotal: taches.reduce((sum, t) => sum + t.heuresTotal, 0),
  };

  return (
    <AppLayout titre="Portail Conseiller">
      <div className="space-y-6">
        {/* En-tête avec actions rapides */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bienvenue, {utilisateur?.prenom || 'Conseiller'}</h1>
            <p className="text-muted mt-1">Gérez vos tâches et la planification</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => navigate('/conseiller/creation-tache')}>
              ➕ Nouvelle tâche
            </Button>
            <Button variant="outline" onClick={() => navigate('/planification-globale')}>
              📅 Planification globale
            </Button>
            <Button variant="outline" onClick={() => navigate('/statistiques-productivite')}>
              📊 Statistiques
            </Button>
          </div>
        </div>

        {/* Statistiques et Conflits */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Statistiques */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{stats.total}</p>
                    <p className="text-sm text-muted mt-1">Tâches créées</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-600">{stats.planifiees}</p>
                    <p className="text-sm text-muted mt-1">Planifiées</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">{stats.enCours}</p>
                    <p className="text-sm text-muted mt-1">En cours</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">{stats.terminees}</p>
                    <p className="text-sm text-muted mt-1">Terminées</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-orange-600">{stats.heuresTotal.toFixed(0)}</p>
                    <p className="text-sm text-muted mt-1">Heures totales</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Vue d'ensemble des conflits */}
          <div className="lg:col-span-1">
            <ConflictOverview />
          </div>
        </div>

        {/* Liste des tâches */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Mes tâches créées</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner message="Chargement des tâches..." />
            ) : (
              <div className="space-y-4">
                {/* Filtres */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">🔍 Filtres</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted block mb-1">Statut</label>
                      <Select
                        value={filtreStatut}
                        onChange={(e) => setFiltreStatut(e.target.value)}
                        className="w-full"
                      >
                        <option value="">Tous les statuts</option>
                        <option value="PLANIFIEE">Planifiée</option>
                        <option value="EN_COURS">En cours</option>
                        <option value="TERMINEE">Terminée</option>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted block mb-1">Recherche</label>
                      <Input
                        type="text"
                        value={recherche}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecherche(e.target.value)}
                        placeholder="Projet, traducteur, client..."
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button onClick={appliquerFiltres} className="flex-1">
                        Appliquer
                      </Button>
                      <Button variant="outline" onClick={reinitialiserFiltres}>
                        Réinitialiser
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Compteur */}
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>
                    {tachesFiltered.length} tâche(s) affichée(s) sur {taches.length}
                  </span>
                  <span>
                    {tachesFiltered.reduce((sum, t) => sum + t.heuresTotal, 0).toFixed(1)}h au total
                  </span>
                </div>

                {/* Liste des tâches */}
                {tachesFiltered.length === 0 ? (
                  <div className="text-center py-12 text-muted">
                    <p className="text-lg mb-2">Aucune tâche trouvée</p>
                    <Button onClick={() => navigate('/conseiller/creation-tache')}>
                      Créer ma première tâche
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tachesFiltered.map((tache) => (
                      <div
                        key={tache.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-primary transition-all cursor-pointer"
                        onClick={() => navigate('/conseiller/planification-globale')}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* En-tête */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="font-semibold text-primary">
                                {tache.numeroProjet}
                              </span>
                              <Badge variant={getStatutBadgeVariant(tache.statut)}>
                                {getStatutLabel(tache.statut)}
                              </Badge>
                              <span className="text-xs text-muted">
                                {tache.typeTache}
                              </span>
                            </div>

                            {/* Description */}
                            {tache.description && (
                              <p className="text-sm mb-2 line-clamp-2">
                                {tache.description}
                              </p>
                            )}

                            {/* Informations */}
                            <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                              <span className="flex items-center gap-1">
                                👤 {tache.traducteur?.nom || 'Non assigné'}
                              </span>
                              {tache.client && (
                                <span className="flex items-center gap-1">
                                  📋 {tache.client.nom}
                                </span>
                              )}
                              {tache.paireLinguistique && (
                                <span className="flex items-center gap-1">
                                  🌐 {tache.paireLinguistique.langueSource} → {tache.paireLinguistique.langueCible}
                                </span>
                              )}
                              {tache.compteMots && (
                                <span className="flex items-center gap-1">
                                  📝 {tache.compteMots.toLocaleString()} mots
                                </span>
                              )}
                              <span className="flex items-center gap-1 font-semibold">
                                ⏱️ {tache.heuresTotal}h
                              </span>
                              {tache.dateEcheance && (
                                <span className="flex items-center gap-1 text-orange-600 font-medium">
                                  📅 {formatDateDisplay(new Date(tache.dateEcheance))}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action */}
                          <Button 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/conseiller/planification-globale');
                            }}
                            className="text-sm px-3 py-1"
                          >
                            Voir détails
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default DashboardConseiller;
