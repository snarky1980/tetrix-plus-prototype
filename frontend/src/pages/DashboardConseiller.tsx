import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { LoadingSpinner } from '../components/ui/Spinner';
import { InfoTooltip } from '../components/ui/Tooltip';
import { TacheCard } from '../components/taches/TacheCard';
import { DemandesRessources } from '../components/notifications/DemandesRessources';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePlanificationGlobal } from '../hooks/usePlanification';
import { tacheService } from '../services/tacheService';
import { traducteurService } from '../services/traducteurService';
import type { Tache, Traducteur } from '../types';

type Section = 'overview' | 'taches' | 'demandes';

/**
 * Dashboard Conseiller - Vue d'ensemble enrichie avec stats et navigation
 * Style harmonisé avec le Dashboard Admin
 */
const DashboardConseiller: React.FC = () => {
  usePageTitle('Portail Conseiller', 'Gérez vos tâches et la planification');
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  
  const [section, setSection] = useState<Section>('overview');
  const [taches, setTaches] = useState<Tache[]>([]);
  const [tachesFiltered, setTachesFiltered] = useState<Tache[]>([]);
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [recherche, setRecherche] = useState('');

  // Planification des 7 prochains jours
  const aujourdHui = useMemo(() => new Date(), []);
  const fin = useMemo(() => new Date(aujourdHui.getTime() + 6 * 86400000), [aujourdHui]);
  const dateISO = (d: Date) => d.toISOString().split('T')[0];
  const { planificationGlobale } = usePlanificationGlobal({ dateDebut: dateISO(aujourdHui), dateFin: dateISO(fin) });

  // Stats de capacité
  const capaciteStats = useMemo(() => {
    if (!planificationGlobale) return { total: 0, libre: 0, presque: 0, plein: 0 };
    let libre = 0, presque = 0, plein = 0;
    planificationGlobale.planification.forEach(l => {
      Object.values(l.dates).forEach(d => {
        if (d.couleur === 'libre') libre++;
        else if (d.couleur === 'presque-plein') presque++;
        else if (d.couleur === 'plein') plein++;
      });
    });
    return { total: libre + presque + plein, libre, presque, plein };
  }, [planificationGlobale]);

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const [tachesData, traducteursData] = await Promise.all([
        tacheService.obtenirTaches({}),
        traducteurService.obtenirTraducteurs({}).catch(() => [])
      ]);
      
      // Trier par date de création (plus récent d'abord)
      const tachesTries = tachesData.sort((a, b) => 
        new Date(b.creeLe).getTime() - new Date(a.creeLe).getTime()
      );
      setTaches(tachesTries);
      setTachesFiltered(tachesTries);
      setTraducteurs(traducteursData);
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    appliquerFiltres();
  }, [filtreStatut, recherche, taches]);

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
  };

  const stats = {
    total: taches.length,
    planifiees: taches.filter(t => t.statut === 'PLANIFIEE').length,
    enCours: taches.filter(t => t.statut === 'EN_COURS').length,
    enRetard: taches.filter(t => t.statut === 'EN_RETARD').length,
    terminees: taches.filter(t => t.statut === 'TERMINEE').length,
    heuresTotal: taches.reduce((sum, t) => sum + t.heuresTotal, 0),
    heuresEnCours: taches.filter(t => t.statut === 'EN_COURS' || t.statut === 'PLANIFIEE').reduce((sum, t) => sum + t.heuresTotal, 0),
  };

  const traducteursDispo = traducteurs.filter(t => t.disponiblePourTravail);
  const traducteursActifs = traducteurs.filter(t => t.actif);

  // Tâches urgentes (échéance dans les 3 prochains jours)
  const tachesUrgentes = taches.filter(t => {
    if (t.statut === 'TERMINEE') return false;
    const echeance = new Date(t.dateEcheance);
    const dans3Jours = new Date(aujourdHui.getTime() + 3 * 86400000);
    return echeance <= dans3Jours;
  });

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Stats cliquables en grille */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: 'Tâches', value: stats.total, sub: `${stats.enCours} en cours`, color: 'blue', tooltip: 'Nombre total de tâches dans le système', action: () => setSection('taches') },
          { label: 'Planifiées', value: stats.planifiees, color: 'gray', tooltip: 'Tâches assignées mais pas encore commencées', action: () => { setFiltreStatut('PLANIFIEE'); setSection('taches'); } },
          { label: 'En retard', value: stats.enRetard, color: stats.enRetard > 0 ? 'red' : 'gray', tooltip: 'Tâches dont l\'échéance est dépassée', action: () => { setFiltreStatut('EN_RETARD'); setSection('taches'); } },
          { label: 'Heures', value: `${stats.heuresEnCours.toFixed(0)}h`, sub: 'actives', color: 'amber', tooltip: 'Heures de travail sur les tâches en cours et planifiées', action: () => navigate('/statistiques-productivite') },
          { label: 'Dispo.', value: capaciteStats.libre, sub: '7 jours', color: 'green', tooltip: 'Créneaux de disponibilité des traducteurs sur les 7 prochains jours', action: () => navigate('/planification-globale') },
          { label: 'Saturé', value: capaciteStats.plein, color: capaciteStats.plein > 0 ? 'orange' : 'gray', tooltip: 'Créneaux complètement occupés - traducteurs à pleine capacité', action: () => navigate('/planification-globale') },
        ].map((stat, i) => (
          <button
            key={i}
            onClick={stat.action}
            className={`p-2 rounded border bg-${stat.color}-50 border-${stat.color}-200 hover:bg-${stat.color}-100 hover:border-${stat.color}-300 transition-colors text-left cursor-pointer`}
          >
            <div className="text-xs text-gray-500 flex items-center gap-1">
              {stat.label}
              {stat.tooltip && <InfoTooltip content={stat.tooltip} size="sm" />}
            </div>
            <div className="text-lg font-bold">{stat.value}</div>
            {stat.sub && <div className="text-xs text-gray-400">{stat.sub}</div>}
          </button>
        ))}
      </div>

      {/* Alertes - Tâches urgentes */}
      {tachesUrgentes.length > 0 && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-700">⚠️ {tachesUrgentes.length} tâche(s) urgente(s) - échéance ≤ 3 jours</span>
            <Button size="sm" variant="outline" onClick={() => { setSection('taches'); }}>
              Voir tout
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tachesUrgentes.slice(0, 5).map(t => (
              <div 
                key={t.id} 
                className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-white rounded border border-orange-200 text-xs cursor-pointer hover:bg-orange-50"
                onClick={() => navigate(`/conseiller/planifier/${t.id}`)}
              >
                <span className="font-medium">{t.numeroProjet}</span>
                <span className="text-orange-600">{t.heuresTotal}h</span>
                <span className="text-gray-500">→ {new Date(t.dateEcheance).toLocaleDateString('fr-CA')}</span>
              </div>
            ))}
            {tachesUrgentes.length > 5 && (
              <span className="text-xs text-orange-600 self-center">+{tachesUrgentes.length - 5}</span>
            )}
          </div>
        </div>
      )}

      {/* Traducteurs disponibles */}
      {traducteursDispo.length > 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">✋ {traducteursDispo.length} traducteur(s) disponible(s) pour du travail</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {traducteursDispo.slice(0, 8).map(tr => (
              <div key={tr.id} className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-white rounded border border-green-200 text-xs">
                <span className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {tr.nom.charAt(0)}
                </span>
                <div className="min-w-0">
                  <div className="font-medium truncate">{tr.nom}</div>
                  {tr.divisions && tr.divisions.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {tr.divisions.slice(0, 2).map((d, i) => (
                        <span key={i} className="px-1 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">{d}</span>
                      ))}
                      {tr.divisions.length > 2 && (
                        <span className="text-[10px] text-green-500">+{tr.divisions.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {traducteursDispo.length > 8 && (
              <span className="text-xs text-green-600 self-center">+{traducteursDispo.length - 8}</span>
            )}
          </div>
        </div>
      )}

      {/* Demandes de ressources */}
      <DemandesRessources />

      {/* Aperçu des tâches récentes */}
      <div className="bg-white border rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">📋 Tâches récentes</span>
          <Button size="sm" variant="outline" onClick={() => setSection('taches')}>
            Voir toutes ({taches.length})
          </Button>
        </div>
        {taches.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            Aucune tâche. <button className="text-primary hover:underline" onClick={() => navigate('/conseiller/creation-tache')}>Créer une tâche</button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {taches.slice(0, 5).map((tache) => (
              <TacheCard key={tache.id} tache={tache} showPlanningButton={true} />
            ))}
          </div>
        )}
      </div>

      {/* Stats traducteurs compact */}
      <div className="bg-white border rounded-lg p-3">
        <div className="text-xs font-medium text-gray-500 mb-2">Équipe de traduction</div>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
            {traducteursActifs.length} actifs
          </span>
          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
            {traducteursDispo.length} disponibles
          </span>
          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
            {traducteurs.length - traducteursActifs.length} inactifs
          </span>
        </div>
      </div>
    </div>
  );

  const renderTaches = () => (
    <div className="space-y-3">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          className="text-xs py-1 px-2 border-gray-200 rounded min-w-[120px]"
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecherche(e.target.value)}
            placeholder="Rechercher..."
            className="text-xs py-1 px-2 pl-7 w-40 border-gray-200 rounded"
          />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
        </div>
        {(filtreStatut || recherche) && (
          <button 
            onClick={reinitialiserFiltres}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          >
            ✕ Réinitialiser
          </button>
        )}
        <span className="text-xs text-gray-500 ml-auto">
          {tachesFiltered.length}/{taches.length} tâches • {tachesFiltered.reduce((sum, t) => sum + t.heuresTotal, 0).toFixed(1)}h
        </span>
      </div>

      {/* Liste */}
      {tachesFiltered.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
            <span className="text-2xl">📭</span>
          </div>
          <p className="text-gray-500 mb-3">Aucune tâche trouvée</p>
          {utilisateur?.role !== 'GESTIONNAIRE' && (
            <Button onClick={() => navigate('/conseiller/creation-tache')} className="gap-2">
              <span>➕</span> Créer une tâche
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {tachesFiltered.map((tache) => (
            <TacheCard key={tache.id} tache={tache} showPlanningButton={true} />
          ))}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (section) {
      case 'taches':
        return renderTaches();
      case 'demandes':
        return <DemandesRessources showAll />;
      case 'overview':
      default:
        return renderOverview();
    }
  };

  if (loading && section === 'overview') {
    return (
      <AppLayout titre="Portail Conseiller">
        <LoadingSpinner message="Chargement des données..." />
      </AppLayout>
    );
  }

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
              {utilisateur?.role !== 'GESTIONNAIRE' && (
                <Button 
                  onClick={() => navigate('/conseiller/creation-tache')}
                  size="sm"
                  className="gap-1.5"
                >
                  <span>➕</span> Nouvelle tâche
                </Button>
              )}
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
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => navigate('/mes-notes')}
                className="gap-1.5"
              >
                <span>📝</span> Mes notes
              </Button>
            </div>
          </div>
        </div>

        {/* Stats en barre horizontale */}
        <div className="bg-white border rounded-lg px-4 py-2 shadow-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-semibold">{stats.total} tâches</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{stats.planifiees} planifiées</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{stats.enCours} en cours</span>
            {stats.enRetard > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">{stats.enRetard} en retard</span>
            )}
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">{stats.terminees} terminées</span>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">{stats.heuresTotal.toFixed(0)}h total</span>
          </div>
          <div className="text-xs text-green-600 flex items-center gap-1">
            {stats.enRetard === 0 ? (
              <>
                <span>✅</span> Aucun retard
              </>
            ) : (
              <span className="text-red-600">⚠️ {stats.enRetard} retard(s)</span>
            )}
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="px-4 py-2 border-b bg-gray-50/50 flex flex-wrap items-center gap-1">
            {[
              { id: 'overview' as const, icon: '🏠', label: 'Vue d\'ensemble' },
              { id: 'taches' as const, icon: '📋', label: 'Toutes les tâches' },
              { id: 'demandes' as const, icon: '📨', label: 'Demandes' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  section === item.id
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Contenu de la section */}
          <div className="p-4">
            {renderContent()}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DashboardConseiller;
