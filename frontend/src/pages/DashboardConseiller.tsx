import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { LoadingSpinner } from '../components/ui/Spinner';
import { TacheCard } from '../components/taches/TacheCard';
import { DemandesRessources } from '../components/notifications/DemandesRessources';
import { useAuth } from '../contexts/AuthContext';
import { tacheService } from '../services/tacheService';
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

  const stats = {
    total: taches.length,
    planifiees: taches.filter(t => t.statut === 'PLANIFIEE').length,
    enCours: taches.filter(t => t.statut === 'EN_COURS').length,
    terminees: taches.filter(t => t.statut === 'TERMINEE').length,
    heuresTotal: taches.reduce((sum, t) => sum + t.heuresTotal, 0),
  };

  return (
    <AppLayout titre="Portail Conseiller">
      <div className="space-y-4">
        {/* En-tête compact avec navigation */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Bonjour, {utilisateur?.prenom || 'Conseiller'}</h1>
              <p className="text-sm text-muted">Gérez vos tâches et la planification</p>
            </div>
            
            {/* Navigation compacte */}
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => navigate('/conseiller/creation-tache')}
                size="sm"
                className="gap-1.5"
              >
                <span>➕</span> Nouvelle tâche
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/planification-globale')}
                className="gap-1.5"
              >
                <span>📅</span> Planification
              </Button>
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => navigate('/liaisons')}
                className="gap-1.5"
              >
                <span>🔗</span> Liaisons
              </Button>
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => navigate('/statistiques-productivite')}
                className="gap-1.5"
              >
                <span>📊</span> Stats
              </Button>
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => navigate('/conflict-resolution')}
                className="gap-1.5"
              >
                <span>⚠️</span> Conflits
              </Button>
            </div>
          </div>
        </div>

        {/* Stats ultra-compactes en barre horizontale */}
        <div className="bg-white border rounded-lg px-4 py-2 shadow-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-semibold">{stats.total} tâches</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{stats.planifiees} planifiées</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{stats.enCours} en cours</span>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">{stats.terminees} terminées</span>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">{stats.heuresTotal.toFixed(0)}h total</span>
          </div>
          <div className="text-xs text-green-600 flex items-center gap-1">
            <span>✅</span> Aucun conflit
          </div>
        </div>

        {/* Demandes de ressources et traducteurs disponibles - EN PREMIER */}
        <DemandesRessources />

        {/* Liste des tâches - Section compacte et bien structurée */}
        <div className="bg-white border rounded-lg shadow-sm">
          {/* Header avec titre et filtres sur la même ligne */}
          <div className="px-4 py-3 border-b bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-lg">📋</span>
              Mes tâches
              <span className="text-sm font-normal text-gray-500">
                ({tachesFiltered.length}/{taches.length}) • {tachesFiltered.reduce((sum, t) => sum + t.heuresTotal, 0).toFixed(1)}h
              </span>
            </h3>
            
            {/* Filtres compacts */}
            <div className="flex items-center gap-2">
              <Select
                value={filtreStatut}
                onChange={(e) => { setFiltreStatut(e.target.value); appliquerFiltres(); }}
                className="text-xs py-1 px-2 border-gray-200 rounded min-w-[110px]"
              >
                <option value="">Tous statuts</option>
                <option value="PLANIFIEE">📝 Planifiée</option>
                <option value="EN_COURS">🔄 En cours</option>
                <option value="EN_RETARD">⚠️ En retard</option>
                <option value="TERMINEE">✅ Terminée</option>
              </Select>
              <div className="relative">
                <Input
                  type="text"
                  value={recherche}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setRecherche(e.target.value); }}
                  onKeyUp={(e) => e.key === 'Enter' && appliquerFiltres()}
                  placeholder="Rechercher..."
                  className="text-xs py-1 px-2 pl-7 w-36 border-gray-200 rounded"
                />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
              </div>
              <Button onClick={appliquerFiltres} size="sm" className="text-xs px-2 py-1">
                Filtrer
              </Button>
              {(filtreStatut || recherche) && (
                <button 
                  onClick={reinitialiserFiltres}
                  className="text-xs text-gray-500 hover:text-gray-700 px-1"
                  title="Réinitialiser"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Contenu */}
          <div className="p-4">
            {loading ? (
              <LoadingSpinner message="Chargement..." />
            ) : tachesFiltered.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                  <span className="text-2xl">📭</span>
                </div>
                <p className="text-gray-500 mb-3">Aucune tâche trouvée</p>
                <Button onClick={() => navigate('/conseiller/creation-tache')} className="gap-2">
                  <span>➕</span> Créer une tâche
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {tachesFiltered.map((tache) => (
                  <TacheCard
                    key={tache.id}
                    tache={tache}
                    showPlanningButton={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DashboardConseiller;
