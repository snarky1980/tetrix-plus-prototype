import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { FormField } from '../components/ui/FormField';
import { SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/Spinner';
import { InfoTooltip } from '../components/ui/Tooltip';
import { MultiSelectDropdown } from '../components/ui/MultiSelectDropdown';
import { usePageTitle } from '../hooks/usePageTitle';
import { useDashboardGestionnaire } from '../hooks/useDashboardGestionnaire';
import { traducteurService } from '../services/traducteurService';
import { formatHeures } from '../lib/format';
import type { Traducteur } from '../types';

type ViewMode = '1' | '7' | '14' | '30' | 'custom';
type Section = 'overview' | 'planification' | 'traducteurs' | 'blocages' | 'statistiques';

/**
 * Dashboard Gestionnaire - Interface pour les gestionnaires de divisions
 * Style harmonisé avec le Dashboard Admin
 * Accès filtré par divisions autorisées, gestion des blocages TR, statistiques
 * SANS création/modification de tâches
 */
const DashboardGestionnaire: React.FC = () => {
  const navigate = useNavigate();
  
  // ============ Hook métier ============
  const {
    // Navigation
    section, setSection,
    viewMode, setViewMode,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    
    // Données
    divisions,
    divisionsSelectionnees, setDivisionsSelectionnees,
    traducteurs,
    planificationData,
    blocagesListe,
    
    // États de chargement
    loading,
    loadingPlanif,
    
    // Blocages
    ouvrirBlocage, setOuvrirBlocage,
    blocageData, setBlocageData,
    submittingBlocage,
    erreurBlocage,
    confirmDeleteBlocage, setConfirmDeleteBlocage,
    
    // Statistiques
    stats,
    tauxUtilisation,
    
    // Actions
    chargerTraducteurs,
    handleCreerBlocage,
    handleSupprimerBlocage,
    executerSuppressionBlocage,
    
    // Helpers
    today,
  } = useDashboardGestionnaire();

  usePageTitle('Espace Gestionnaire - Tetrix PLUS', 'Gérez vos équipes et planifications');

  // Divisions sélectionnées (noms pour affichage)
  const divisionsCourantes = divisions.filter(d => divisionsSelectionnees.includes(d.id));
  const divisionLabel = divisionsCourantes.length === 0 
    ? 'Aucune' 
    : divisionsCourantes.length === 1 
      ? (divisionsCourantes[0].code || divisionsCourantes[0].nom)
      : `${divisionsCourantes.length} divisions`;
  
  // État pour le modal d'édition de traducteur
  const [editingTraducteur, setEditingTraducteur] = useState<Traducteur | null>(null);
  const [editFormData, setEditFormData] = useState({
    horaire: '',
    heureDinerDebut: '',
    heureDinerFin: '',
    capaciteHeuresParJour: 7.5
  });
  const [savingTraducteur, setSavingTraducteur] = useState(false);
  const [editError, setEditError] = useState('');

  const ouvrirEditionTraducteur = (tr: Traducteur) => {
    setEditingTraducteur(tr);
    setEditFormData({
      horaire: tr.horaire || '9h-17h',
      heureDinerDebut: tr.heureDinerDebut || '12:00',
      heureDinerFin: tr.heureDinerFin || '13:00',
      capaciteHeuresParJour: tr.capaciteHeuresParJour || 7.5
    });
    setEditError('');
  };

  const handleSaveTraducteur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTraducteur) return;
    setSavingTraducteur(true);
    setEditError('');
    try {
      await traducteurService.mettreAJourTraducteur(editingTraducteur.id, {
        horaire: editFormData.horaire,
        heureDinerDebut: editFormData.heureDinerDebut,
        heureDinerFin: editFormData.heureDinerFin,
        capaciteHeuresParJour: editFormData.capaciteHeuresParJour
      });
      setEditingTraducteur(null);
      // Recharger les traducteurs
      await chargerTraducteurs();
    } catch (err: any) {
      setEditError(err.response?.data?.message || err.response?.data?.erreur || 'Erreur lors de la sauvegarde');
    } finally {
      setSavingTraducteur(false);
    }
  };

  // ============ Rendu des sections ============
  const renderOverview = () => (
    <div className="space-y-4">
      {/* Stats cliquables en grille - style Admin */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: 'Traducteurs', value: stats.nbTraducteurs, sub: `${stats.traducteurDisponibles} dispo`, color: 'blue', tooltip: 'Traducteurs dans votre division. Les disponibles cherchent du travail.', action: () => setSection('traducteurs') },
          { label: 'Capacité', value: `${formatHeures(stats.capacite)}h`, sub: viewMode === '1' ? '1 jour' : `${viewMode} jours`, color: 'gray', tooltip: 'Capacité totale de travail de votre équipe sur la période sélectionnée.', action: () => setSection('planification') },
          { label: 'Tâches', value: `${formatHeures(stats.taches)}h`, sub: 'planifiées', color: 'amber', tooltip: 'Heures de tâches assignées aux traducteurs de la division.', action: () => setSection('planification') },
          { label: 'Blocages', value: `${formatHeures(stats.blocages)}h`, sub: `${stats.nbBlocages} bloc.`, color: 'red', tooltip: 'Temps bloqué (réunions, formations, congés).', action: () => setSection('blocages') },
          { label: 'Disponible', value: `${formatHeures(stats.disponible)}h`, color: 'green', tooltip: 'Heures encore disponibles pour de nouvelles tâches.', action: () => setSection('planification') },
          { label: 'Utilisation', value: `${tauxUtilisation.toFixed(0)}%`, color: tauxUtilisation >= 90 ? 'red' : tauxUtilisation >= 70 ? 'orange' : 'green', tooltip: 'Taux d\'occupation global de la division.', action: () => setSection('statistiques') },
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

      {/* Barre de progression globale */}
      <div className="bg-white border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Utilisation de la division</span>
          <span className="text-sm font-bold">{tauxUtilisation.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              tauxUtilisation >= 100 ? 'bg-red-600' : 
              tauxUtilisation >= 75 ? 'bg-orange-500' : 
              tauxUtilisation >= 50 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(tauxUtilisation, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>📝 {stats.taches.toFixed(1)}h tâches</span>
          <span>🚫 {stats.blocages.toFixed(1)}h blocages</span>
          <span>✅ {stats.disponible.toFixed(1)}h disponible</span>
        </div>
      </div>

      {/* Traducteurs disponibles */}
      {stats.traducteurDisponibles > 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">✋ {stats.traducteurDisponibles} traducteur(s) cherchent du travail</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {traducteurs.filter(t => t.disponiblePourTravail).slice(0, 8).map(tr => (
              <div key={tr.id} className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-white rounded border border-green-200 text-xs">
                <span className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {tr.nom.charAt(0)}
                </span>
                <div className="min-w-0">
                  <div className="font-medium truncate">{tr.nom}</div>
                  <div className="text-[10px] text-gray-500">{tr.categorie ? `TR-0${tr.categorie.slice(-1)}` : ''}</div>
                </div>
              </div>
            ))}
            {stats.traducteurDisponibles > 8 && (
              <span className="text-xs text-green-600 self-center">+{stats.traducteurDisponibles - 8}</span>
            )}
          </div>
        </div>
      )}

      {/* Blocages à venir - compact */}
      <div className="bg-white border rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">🚫 Blocages à venir</span>
          <Button size="sm" variant="outline" onClick={() => setSection('blocages')}>
            Voir tout
          </Button>
        </div>
        {blocagesListe.length === 0 ? (
          <div className="text-center py-3 text-gray-500 text-sm">
            Aucun blocage prévu
          </div>
        ) : (
          <div className="space-y-1.5">
            {blocagesListe.slice(0, 4).map((blocage: any) => (
              <div 
                key={blocage.id} 
                className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-[10px] font-bold">
                    {blocage.traducteur?.nom?.charAt(0) || '?'}
                  </span>
                  <div>
                    <span className="font-medium">{blocage.traducteur?.nom}</span>
                    <span className="text-gray-500 ml-2">
                      {new Date(blocage.date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                      {' • '}{blocage.heures}h
                    </span>
                  </div>
                </div>
                <span className="text-gray-400 truncate max-w-[100px]">{blocage.motif || '-'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPlanification = () => (
    <div className="space-y-4">
      {/* Contrôles de période */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={viewMode}
          onChange={e => setViewMode(e.target.value as ViewMode)}
          className="text-sm py-1.5"
        >
          <option value="1">Aujourd'hui</option>
          <option value="7">7 jours</option>
          <option value="14">14 jours</option>
          <option value="30">30 jours</option>
          <option value="custom">Personnalisé</option>
        </Select>
        {viewMode === 'custom' && (
          <>
            <Input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="text-sm py-1"
            />
            <span className="text-gray-400">à</span>
            <Input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="text-sm py-1"
            />
          </>
        )}
      </div>

      {/* Grille de planification par traducteur */}
      {loadingPlanif ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : planificationData.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Aucune donnée"
          description="Pas de planification disponible pour cette division"
        />
      ) : (
        <div className="space-y-3">
          {planificationData.map(item => {
            const tr = item.traducteur;
            const planif = item.planification?.planification || [];
            
            const totaux = planif.reduce((acc: any, jour: any) => ({
              taches: acc.taches + (jour.heuresTaches || 0),
              blocages: acc.blocages + (jour.heuresBlocages || 0),
              capacite: acc.capacite + (jour.capacite || 0),
            }), { taches: 0, blocages: 0, capacite: 0 });
            
            const pctUtilise = totaux.capacite > 0 
              ? ((totaux.taches + totaux.blocages) / totaux.capacite) * 100 
              : 0;

            return (
              <div key={tr.id} className="bg-white border rounded-lg overflow-hidden">
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                      tr.disponiblePourTravail ? 'bg-green-500' : 'bg-gray-400'
                    }`}>
                      {tr.nom.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{tr.nom}</div>
                      <div className="text-xs text-gray-500">
                        {tr.categorie ? `TR-0${tr.categorie.slice(-1)}` : ''} • {tr.horaire || '9h-17h'}
                        {tr.disponiblePourTravail && ' • ✋'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{pctUtilise.toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">
                      {totaux.taches.toFixed(1)}h tâches
                    </div>
                  </div>
                </div>
                
                <div className="p-3">
                  <div className="grid grid-cols-7 gap-1">
                    {planif.slice(0, 7).map((jour: any) => {
                      const dateObj = new Date(jour.date);
                      const jourSemaine = dateObj.toLocaleDateString('fr-CA', { weekday: 'short' });
                      const jourNum = dateObj.getDate();
                      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                      const utilise = (jour.heuresTaches || 0) + (jour.heuresBlocages || 0);
                      const pct = jour.capacite > 0 ? (utilise / jour.capacite) * 100 : 0;
                      
                      let bg = 'bg-green-100';
                      if (isWeekend) bg = 'bg-gray-100';
                      else if (pct >= 100) bg = 'bg-red-100';
                      else if (pct >= 75) bg = 'bg-orange-100';
                      else if (pct >= 50) bg = 'bg-yellow-100';
                      
                      return (
                        <div key={jour.date} className={`p-2 rounded text-center ${bg}`}>
                          <div className="text-[10px] text-gray-500 uppercase">{jourSemaine}</div>
                          <div className="text-sm font-bold">{jourNum}</div>
                          {!isWeekend && (
                            <div className="text-[10px]">{utilise.toFixed(1)}h</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderTraducteurs = () => (
    <div className="space-y-4">
      {traducteurs.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Aucun traducteur"
          description="Aucun traducteur dans cette division"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {traducteurs.map(tr => (
            <div 
              key={tr.id} 
              className={`p-3 rounded-lg border ${
                tr.disponiblePourTravail 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 ${
                  tr.disponiblePourTravail ? 'bg-green-500' : 'bg-gray-400'
                }`}>
                  {tr.nom.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{tr.nom}</div>
                  <div className="text-xs text-gray-500">
                    {tr.categorie ? `TR-0${tr.categorie.slice(-1)}` : ''} • {tr.horaire || '9h-17h'} • {tr.capaciteHeuresParJour || 7.5}h/jour
                  </div>
                </div>
              </div>
              
              {tr.disponiblePourTravail && (
                <div className="mt-2 p-1.5 bg-green-100 rounded text-xs text-green-700">
                  ✋ Cherche du travail
                  {tr.commentaireDisponibilite && (
                    <span className="block text-[10px] mt-0.5">💬 {tr.commentaireDisponibilite}</span>
                  )}
                </div>
              )}

              {tr.specialisations && tr.specialisations.length > 0 && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1">
                    {tr.specialisations.slice(0, 3).map((spec, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">
                        {spec}
                      </span>
                    ))}
                    {tr.specialisations.length > 3 && (
                      <span className="text-[10px] text-gray-400">+{tr.specialisations.length - 3}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-2 pt-2 border-t flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => ouvrirEditionTraducteur(tr)}
                >
                  ✏️ Modifier
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    setBlocageData(prev => ({ ...prev, traducteurId: tr.id }));
                    setOuvrirBlocage(true);
                  }}
                >
                  + Blocage
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderBlocages = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{blocagesListe.length} blocage(s)</span>
        <Button size="sm" onClick={() => setOuvrirBlocage(true)}>
          + Nouveau blocage
        </Button>
      </div>
      
      {blocagesListe.length === 0 ? (
        <EmptyState
          icon="🚫"
          title="Aucun blocage"
          description="Aucun blocage planifié pour cette période"
          action={{
            label: 'Créer un blocage',
            onClick: () => setOuvrirBlocage(true)
          }}
        />
      ) : (
        <div className="space-y-2">
          {blocagesListe.map((blocage: any) => (
            <div 
              key={blocage.id} 
              className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center font-bold text-sm">
                  {blocage.traducteur?.nom?.charAt(0) || '?'}
                </div>
                <div>
                  <div className="font-medium text-sm">{blocage.traducteur?.nom}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(blocage.date).toLocaleDateString('fr-CA', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short' 
                    })} • {blocage.heureDebut} - {blocage.heureFin} ({blocage.heures}h)
                    {blocage.motif && ` • ${blocage.motif}`}
                  </div>
                </div>
              </div>
              <Button 
                variant="danger" 
                size="sm"
                onClick={() => handleSupprimerBlocage(blocage.id)}
              >
                Supprimer
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStatistiques = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-blue-50 rounded-lg text-center border border-blue-100">
          <div className="text-3xl font-bold text-blue-600">{stats.nbTraducteurs}</div>
          <div className="text-sm text-gray-600">Traducteurs</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg text-center border border-green-100">
          <div className="text-3xl font-bold text-green-600">{stats.capacite.toFixed(0)}h</div>
          <div className="text-sm text-gray-600">Capacité totale</div>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg text-center border border-orange-100">
          <div className="text-3xl font-bold text-orange-600">{stats.taches.toFixed(0)}h</div>
          <div className="text-sm text-gray-600">Heures planifiées</div>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg text-center border border-purple-100">
          <div className="text-3xl font-bold text-purple-600">{tauxUtilisation.toFixed(0)}%</div>
          <div className="text-sm text-gray-600">Taux d'utilisation</div>
        </div>
      </div>
      
      <EmptyState
        icon="📈"
        title="Statistiques détaillées à venir"
        description="Des graphiques et analyses avancées de productivité seront disponibles prochainement"
      />
    </div>
  );

  // ============ Rendu principal ============
  if (loading) {
    return (
      <AppLayout titre="Chargement...">
        <LoadingSpinner message="Chargement de vos divisions..." />
      </AppLayout>
    );
  }

  if (divisions.length === 0) {
    return (
      <AppLayout titre="Espace Gestionnaire">
        <EmptyState
          icon="🔒"
          title="Aucune division assignée"
          description="Vous n'avez accès à aucune division. Contactez un administrateur pour obtenir les accès nécessaires."
        />
      </AppLayout>
    );
  }

  const renderContent = () => {
    switch (section) {
      case 'planification':
        return renderPlanification();
      case 'traducteurs':
        return renderTraducteurs();
      case 'blocages':
        return renderBlocages();
      case 'statistiques':
        return renderStatistiques();
      case 'overview':
      default:
        return renderOverview();
    }
  };

  return (
    <AppLayout titre="Espace Gestionnaire">
      <div className="space-y-4">
        {/* En-tête compact style Admin */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Espace Gestionnaire 👔</h1>
              <p className="text-sm text-muted">Gérez vos équipes et suivez la planification</p>
            </div>
            
            {/* Sélecteur de divisions (multi-sélection) et actions */}
            <div className="flex flex-wrap items-center gap-2">
              <MultiSelectDropdown
                label=""
                options={divisions.map(d => d.code || d.nom)}
                selected={divisionsSelectionnees.map(id => {
                  const div = divisions.find(d => d.id === id);
                  return div?.code || div?.nom || '';
                }).filter(Boolean)}
                onChange={(selectedNames) => {
                  const selectedIds = divisions
                    .filter(d => selectedNames.includes(d.code || d.nom))
                    .map(d => d.id);
                  setDivisionsSelectionnees(selectedIds);
                }}
                placeholder="Divisions"
                minWidth="180px"
              />
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setOuvrirBlocage(true)}
                className="gap-1.5"
              >
                <span>🚫</span> Blocage
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => navigate('/mes-notes')}
                className="gap-1.5"
              >
                <span>📝</span> Notes
              </Button>
            </div>
          </div>
        </div>

        {/* Stats en barre horizontale */}
        <div className="bg-white border rounded-lg px-4 py-2 shadow-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-semibold">{divisionLabel}</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{stats.nbTraducteurs} traducteurs</span>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">{stats.disponible.toFixed(0)}h disponible</span>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">{stats.taches.toFixed(0)}h planifié</span>
            {stats.nbBlocages > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">{stats.nbBlocages} blocage(s)</span>
            )}
          </div>
          <div className={`text-xs flex items-center gap-1 ${tauxUtilisation >= 90 ? 'text-red-600' : tauxUtilisation >= 70 ? 'text-orange-600' : 'text-green-600'}`}>
            {tauxUtilisation >= 90 ? '⚠️' : tauxUtilisation >= 70 ? '🔶' : '✅'} {tauxUtilisation.toFixed(0)}% utilisé
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="px-4 py-2 border-b bg-gray-50/50 flex flex-wrap items-center gap-1">
            {[
              { id: 'overview' as Section, icon: '🏠', label: 'Vue d\'ensemble' },
              { id: 'planification' as Section, icon: '📅', label: 'Planification' },
              { id: 'traducteurs' as Section, icon: '👥', label: 'Traducteurs' },
              { id: 'blocages' as Section, icon: '🚫', label: 'Blocages' },
              { id: 'statistiques' as Section, icon: '📊', label: 'Statistiques' },
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

      {/* Modal de blocage */}
      <Modal
        titre="🚫 Créer un blocage"
        ouvert={ouvrirBlocage}
        onFermer={() => setOuvrirBlocage(false)}
        ariaDescription="Formulaire pour créer un blocage pour un traducteur"
      >
        <form onSubmit={handleCreerBlocage} className="space-y-4">
          {erreurBlocage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {erreurBlocage}
            </div>
          )}

          <FormField label="Traducteur" required>
            <Select
              value={blocageData.traducteurId}
              onChange={e => setBlocageData({ ...blocageData, traducteurId: e.target.value })}
              required
            >
              <option value="">-- Sélectionner un traducteur --</option>
              {traducteurs.map(tr => (
                <option key={tr.id} value={tr.id}>{tr.nom}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Date" required>
            <Input
              type="date"
              value={blocageData.date}
              onChange={e => setBlocageData({ ...blocageData, date: e.target.value })}
              required
              min={today}
            />
          </FormField>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="journeeCompleteGest"
              checked={blocageData.journeeComplete}
              onChange={e => setBlocageData({ ...blocageData, journeeComplete: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="journeeCompleteGest" className="text-sm">
              Journée complète
            </label>
          </div>

          {!blocageData.journeeComplete && (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Heure de début" required>
                <Input
                  type="time"
                  value={blocageData.heureDebut}
                  onChange={e => setBlocageData({ ...blocageData, heureDebut: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Heure de fin" required>
                <Input
                  type="time"
                  value={blocageData.heureFin}
                  onChange={e => setBlocageData({ ...blocageData, heureFin: e.target.value })}
                  required
                />
              </FormField>
            </div>
          )}

          <FormField label="Motif">
            <Input
              type="text"
              value={blocageData.motif}
              onChange={e => setBlocageData({ ...blocageData, motif: e.target.value })}
              placeholder="Ex: Réunion d'équipe, Formation..."
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOuvrirBlocage(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submittingBlocage}>
              {submittingBlocage ? 'Création...' : 'Créer le blocage'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal d'édition du profil traducteur */}
      <Modal
        ouvert={!!editingTraducteur}
        onFermer={() => setEditingTraducteur(null)}
        titre={`Modifier le profil de ${editingTraducteur?.nom || ''}`}
      >
        <form onSubmit={handleSaveTraducteur} className="space-y-4">
          {editError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {editError}
            </div>
          )}

          <FormField label="Horaire de travail" helper="Format: 8h30-16h30 ou 9h-17h">
            <Input
              type="text"
              value={editFormData.horaire}
              onChange={e => setEditFormData({ ...editFormData, horaire: e.target.value })}
              placeholder="Ex: 9h-17h"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Début du dîner">
              <Input
                type="time"
                value={editFormData.heureDinerDebut}
                onChange={e => setEditFormData({ ...editFormData, heureDinerDebut: e.target.value })}
              />
            </FormField>
            <FormField label="Fin du dîner">
              <Input
                type="time"
                value={editFormData.heureDinerFin}
                onChange={e => setEditFormData({ ...editFormData, heureDinerFin: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Capacité (heures/jour)" helper="Nombre d'heures de travail par jour">
            <Input
              type="number"
              step="0.5"
              min="1"
              max="12"
              value={editFormData.capaciteHeuresParJour}
              onChange={e => setEditFormData({ ...editFormData, capaciteHeuresParJour: parseFloat(e.target.value) || 7.5 })}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditingTraducteur(null)}>
              Annuler
            </Button>
            <Button type="submit" disabled={savingTraducteur}>
              {savingTraducteur ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Dialogue de confirmation suppression */}
      <ConfirmDialog
        isOpen={confirmDeleteBlocage.isOpen}
        onClose={() => setConfirmDeleteBlocage({ isOpen: false, id: null })}
        onConfirm={executerSuppressionBlocage}
        title="Supprimer le blocage"
        message="Voulez-vous vraiment supprimer ce blocage ? Cette action est irréversible."
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </AppLayout>
  );
};

export default DashboardGestionnaire;
