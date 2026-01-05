import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { TacheCard } from '../components/taches/TacheCard';
import { DemandesRessourcesTraducteur } from '../components/notifications/DemandesRessourcesTraducteur';
import { usePageTitle } from '../hooks/usePageTitle';
import { useDashboardTraducteur, ViewMode } from '../hooks/useDashboardTraducteur';
import { formatHeures } from '../lib/format';
import { divisionService } from '../services/divisionService';
import { equipeProjetService } from '../services/equipeProjetService';

type Section = 'overview' | 'taches' | 'blocages' | 'parametres' | 'statistiques';

/**
 * Dashboard Traducteur - Interface complète et moderne
 * Inspiré du portail conseiller avec forte emphase UI/UX
 * 
 * Logique métier extraite dans useDashboardTraducteur
 * Supporte un mode "vue admin" via paramètre URL :id
 */
const DashboardTraducteur: React.FC = () => {
  // ============ Paramètre URL pour mode admin ============
  const { id: traducteurIdParam } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  // ============ État de navigation (UI uniquement) ============
  const [section, setSection] = useState<Section>('overview');

  // ============ Hook métier ============
  const {
    // Données
    traducteur,
    mesTaches,
    blocages,
    planification,
    stats,
    percentageUtilise,
    today,
    isViewingAsAdmin,
    
    // Loading states
    loadingTraducteur,
    loadingTaches,
    loadingPlanif,
    errorPlanif,
    
    // Vue
    viewMode,
    setViewMode,
    
    // Disponibilité
    disponibiliteActive,
    commentaireDisponibilite,
    setCommentaireDisponibilite,
    ciblageDisponibilite,
    setCiblageDisponibilite,
    savingDisponibilite,
    toggleDisponibilite,
    sauvegarderCiblageDisponibilite,
    
    // Blocages
    ouvrirBlocage,
    setOuvrirBlocage,
    blocageData,
    setBlocageData,
    submittingBlocage,
    erreurBlocage,
    creerBlocage,
    confirmDeleteBlocage,
    demanderSuppressionBlocage,
    executerSuppressionBlocage,
    annulerSuppressionBlocage,
    
    // Terminaison tâche
    confirmTerminerTache,
    terminerLoading,
    commentaireTerminaison,
    setCommentaireTerminaison,
    demanderTerminerTache,
    confirmerTerminerTache,
    annulerTerminerTache,
    
    // Paramètres
    parametresForm,
    setParametresForm,
    savingParametres,
    sauvegarderParametres,
  } = useDashboardTraducteur(traducteurIdParam);

  // ============ Titre dynamique ============
  const titreTraducteur = traducteur?.nom || 'Mon espace';
  usePageTitle(`${titreTraducteur} - Tetrix PLUS`, 'Gérez votre planification et vos disponibilités');

  // ============ Options de ciblage ============
  const [toutesLesDivisions, setToutesLesDivisions] = useState<string[]>([]);
  const [equipesProjet, setEquipesProjet] = useState<Array<{ id: string; nom: string; code: string }>>([]);
  const categorieOptions = ['TR01', 'TR02', 'TR03'];
  
  // Charger les options de ciblage
  useEffect(() => {
    Promise.all([
      divisionService.obtenirDivisions().catch(() => []),
      equipeProjetService.lister({ actif: true }).catch(() => []),
    ]).then(([divisions, equipes]) => {
      setToutesLesDivisions(divisions.map((d: any) => d.nom).sort());
      setEquipesProjet(equipes);
    });
  }, []);

  // ============ Rendu du calendrier ============
  const renderCalendrier = () => {
    if (loadingPlanif) {
      return (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: parseInt(viewMode === 'custom' ? '7' : viewMode) }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    }

    if (!planification || planification.planification.length === 0) {
      return (
        <EmptyState 
          icon="📅"
          title="Aucune planification"
          description="Votre planification n'est pas encore générée pour cette période"
        />
      );
    }

    const nbCols = viewMode === '1' ? 1 : viewMode === '7' ? 7 : viewMode === '14' ? 7 : 7;
    
    return (
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${nbCols}, minmax(0, 1fr))` }}>
        {planification.planification.map((jour: any) => {
          const dateObj = new Date(jour.date);
          const jourSemaine = dateObj.toLocaleDateString('fr-CA', { weekday: 'short' });
          const jourMois = dateObj.getDate();
          const mois = dateObj.toLocaleDateString('fr-CA', { month: 'short' });
          const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
          const isToday = jour.date === today;
          
          const utilise = (jour.heuresTaches || 0) + (jour.heuresBlocages || 0);
          const pct = jour.capacite > 0 ? (utilise / jour.capacite) * 100 : 0;
          
          let bgColor = 'bg-green-50 border-green-200';
          let textColor = 'text-green-700';
          if (isWeekend) {
            bgColor = 'bg-gray-100 border-gray-300';
            textColor = 'text-gray-500';
          } else if (pct >= 100) {
            bgColor = 'bg-red-50 border-red-200';
            textColor = 'text-red-700';
          } else if (pct >= 75) {
            bgColor = 'bg-orange-50 border-orange-200';
            textColor = 'text-orange-700';
          } else if (pct >= 50) {
            bgColor = 'bg-yellow-50 border-yellow-200';
            textColor = 'text-yellow-700';
          }
          
          return (
            <div 
              key={jour.date}
              className={`p-3 rounded-lg border-2 transition-all ${bgColor} ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
            >
              <div className="text-center">
                <div className={`text-xs font-medium uppercase ${isWeekend ? 'text-gray-400' : 'text-gray-500'}`}>
                  {jourSemaine}
                </div>
                <div className={`text-lg font-bold ${isWeekend ? 'text-gray-400' : textColor}`}>
                  {jourMois}
                </div>
                <div className="text-xs text-gray-400">{mois}</div>
              </div>
              
              {!isWeekend && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={textColor}>{utilise.toFixed(1)}h</span>
                    <span className="text-gray-400">/{jour.capacite}h</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all ${
                        pct >= 100 ? 'bg-red-500' : 
                        pct >= 75 ? 'bg-orange-500' : 
                        pct >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>📝 {(jour.heuresTaches || 0).toFixed(1)}h</span>
                    <span>🚫 {(jour.heuresBlocages || 0).toFixed(1)}h</span>
                  </div>
                </div>
              )}
              
              {isWeekend && (
                <div className="mt-2 text-center text-xs text-gray-400">
                  Congé
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ============ Rendu des sections ============
  const renderOverview = () => (
    <div className="space-y-4">
      {/* Statut de disponibilité - compact */}
      <div className={`p-3 rounded-lg border ${
        disponibiliteActive 
          ? 'bg-green-50 border-green-200' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{disponibiliteActive ? '✋' : '😴'}</span>
            <div>
              <span className="font-medium text-sm">
                {disponibiliteActive ? 'Je cherche du travail' : 'Statut normal'}
              </span>
              <p className="text-xs text-gray-500">
                {disponibiliteActive 
                  ? 'Les conseillers voient que vous êtes disponible'
                  : 'Activez pour signaler votre disponibilité'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleDisponibilite}
            disabled={savingDisponibilite}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              disponibiliteActive ? 'bg-green-500' : 'bg-gray-300'
            } ${savingDisponibilite ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            role="switch"
            aria-checked={disponibiliteActive}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                disponibiliteActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        {disponibiliteActive && (
          <div className="mt-3 pt-3 border-t border-green-200 space-y-3">
            <Input
              type="text"
              value={commentaireDisponibilite}
              onChange={e => setCommentaireDisponibilite(e.target.value)}
              placeholder="Commentaire optionnel..."
              className="text-sm"
              maxLength={200}
            />
            
            {/* Ciblage compact */}
            <div className="p-2 bg-white/60 rounded border border-green-100">
              <div className="text-xs font-medium text-green-800 mb-2">🎯 Ciblage (optionnel)</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <MultiSelectDropdown
                  label="Divisions"
                  options={toutesLesDivisions}
                  selected={ciblageDisponibilite.divisions}
                  onChange={(val) => setCiblageDisponibilite({ ...ciblageDisponibilite, divisions: val })}
                  placeholder="Toutes"
                  minWidth="100%"
                />
                <MultiSelectDropdown
                  label="Catégories"
                  options={categorieOptions}
                  selected={ciblageDisponibilite.categories}
                  onChange={(val) => setCiblageDisponibilite({ ...ciblageDisponibilite, categories: val })}
                  placeholder="Toutes"
                  minWidth="100%"
                />
                {equipesProjet.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Équipe</label>
                    <Select
                      value={ciblageDisponibilite.equipeProjetId}
                      onChange={e => setCiblageDisponibilite({ ...ciblageDisponibilite, equipeProjetId: e.target.value })}
                      className="text-sm py-1"
                    >
                      <option value="">Toutes</option>
                      {equipesProjet.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.code}</option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  variant="secondaire"
                  size="sm"
                  onClick={sauvegarderCiblageDisponibilite}
                  disabled={savingDisponibilite}
                >
                  {savingDisponibilite ? '⏳' : '💾'} Enregistrer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Demandes de ressources actives */}
      <DemandesRessourcesTraducteur />

      {/* Stats cliquables en grille - style Admin */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: 'Capacité', value: `${formatHeures(stats.capacite)}h`, sub: viewMode === '1' ? '1 jour' : `${viewMode} jours`, color: 'blue', tooltip: 'Votre capacité de travail sur la période sélectionnée.', action: () => {} },
          { label: 'Tâches', value: `${formatHeures(stats.taches)}h`, sub: `${stats.nbTaches} tâche(s)`, color: 'amber', tooltip: 'Heures de tâches qui vous sont assignées.', action: () => setSection('taches') },
          { label: 'Blocages', value: `${formatHeures(stats.blocages)}h`, sub: `${blocages.length} bloc.`, color: 'red', tooltip: 'Temps bloqué (réunions, formations, etc.).', action: () => setSection('blocages') },
          { label: 'Disponible', value: `${formatHeures(stats.libre)}h`, color: percentageUtilise >= 100 ? 'red' : percentageUtilise >= 75 ? 'orange' : 'green', tooltip: 'Heures encore disponibles pour de nouvelles tâches.', action: () => {} },
          { label: 'En cours', value: stats.tachesEnCours, color: 'blue', tooltip: 'Tâches actuellement en cours de réalisation.', action: () => setSection('taches') },
          { label: 'Terminées', value: stats.tachesTerminees, color: 'green', tooltip: 'Tâches complétées.', action: () => setSection('statistiques') },
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
          <span className="text-sm font-medium">Utilisation globale</span>
          <span className="text-sm font-bold">{percentageUtilise.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              percentageUtilise >= 100 ? 'bg-red-600' : 
              percentageUtilise >= 75 ? 'bg-orange-500' : 
              percentageUtilise >= 50 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentageUtilise, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>📝 {stats.taches.toFixed(1)}h tâches</span>
          <span>🚫 {stats.blocages.toFixed(1)}h blocages</span>
          <span>✅ {stats.libre.toFixed(1)}h disponible</span>
        </div>
      </div>

      {/* Calendrier compact */}
      <div className="bg-white border rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">📅 Ma planification</span>
          <div className="flex items-center gap-2">
            <Select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="text-sm py-1"
            >
              <option value="7">7 jours</option>
              <option value="14">14 jours</option>
              <option value="30">30 jours</option>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setOuvrirBlocage(true)}>
              + Blocage
            </Button>
          </div>
        </div>
        {renderCalendrier()}
        {errorPlanif && <p className="text-xs text-red-600 mt-2">{errorPlanif}</p>}
      </div>

      {/* Tâches à venir - compact */}
      <div className="bg-white border rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">📋 Mes prochaines tâches</span>
          <Button size="sm" variant="outline" onClick={() => setSection('taches')}>
            Voir tout ({mesTaches.length})
          </Button>
        </div>
        {loadingTaches ? (
          <LoadingSpinner message="Chargement..." />
        ) : mesTaches.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            Aucune tâche assignée
          </div>
        ) : (
          <div className="space-y-2">
            {mesTaches.slice(0, 3).map(tache => (
              <TacheCard 
                key={tache.id} 
                tache={tache} 
                compact 
                onTerminer={demanderTerminerTache}
              />
            ))}
            {mesTaches.length > 3 && (
              <p className="text-center text-xs text-gray-500 pt-1">
                + {mesTaches.length - 3} autres
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderTaches = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap text-xs">
          <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            Planifiées: {stats.tachesPlanifiees}
          </span>
          <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            En cours: {stats.tachesEnCours}
          </span>
          {stats.tachesEnRetard > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded font-medium">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              En retard: {stats.tachesEnRetard}
            </span>
          )}
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Terminées: {stats.tachesTerminees}
          </span>
        </div>
        <span className="text-xs text-gray-500">{mesTaches.length} tâche(s)</span>
      </div>

      {loadingTaches ? (
        <LoadingSpinner message="Chargement des tâches..." />
      ) : mesTaches.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Aucune tâche assignée"
          description="Vous n'avez actuellement aucune tâche assignée"
        />
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {mesTaches.map(tache => (
            <TacheCard 
              key={tache.id} 
              tache={tache} 
              onTerminer={demanderTerminerTache}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderBlocages = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{blocages.length} blocage(s)</span>
        <Button size="sm" onClick={() => setOuvrirBlocage(true)}>
          + Nouveau blocage
        </Button>
      </div>

      {blocages.length === 0 ? (
        <EmptyState
          icon="🚫"
          title="Aucun blocage"
          description="Vous n'avez pas de blocage de temps prévu"
          action={{
            label: 'Créer un blocage',
            onClick: () => setOuvrirBlocage(true)
          }}
        />
      ) : (
        <div className="space-y-2">
          {blocages.map((blocage: any) => (
            <div 
              key={blocage.id} 
              className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🚫</span>
                <div>
                  <div className="font-medium text-sm">
                    {new Date(blocage.date).toLocaleDateString('fr-CA', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {blocage.heureDebut} - {blocage.heureFin} • {blocage.heures}h
                  </div>
                  {blocage.motif && (
                    <div className="text-xs text-gray-600 mt-0.5">💬 {blocage.motif}</div>
                  )}
                </div>
              </div>
              <Button 
                variant="danger" 
                size="sm"
                onClick={() => demanderSuppressionBlocage(blocage.id)}
              >
                Supprimer
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderParametres = () => (
    <div className="space-y-4">
      {/* Informations personnelles */}
      <div className="p-3 bg-gray-50 rounded-lg border">
        <h3 className="font-semibold text-sm mb-2">👤 Informations</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-gray-500">Nom:</span>
            <span className="ml-1 font-medium">{traducteur?.nom || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500">Division(s):</span>
            <span className="ml-1 font-medium">{traducteur?.divisions?.join(', ') || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500">Catégorie:</span>
            <span className="ml-1 font-medium">{traducteur?.categorie ? `TR-0${traducteur.categorie.slice(-1)}` : '-'}</span>
          </div>
          <div>
            <span className="text-gray-500">Capacité/jour:</span>
            <span className="ml-1 font-medium">{traducteur?.capaciteHeuresParJour || 7.5}h</span>
          </div>
        </div>
      </div>

      {/* Horaire de travail */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-sm mb-3">🕐 Horaire de travail</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FormField label="Début">
            <Input
              type="time"
              value={parametresForm.horaireDebut}
              onChange={e => setParametresForm(prev => ({ ...prev, horaireDebut: e.target.value }))}
              className="text-sm py-1"
            />
          </FormField>
          <FormField label="Fin">
            <Input
              type="time"
              value={parametresForm.horaireFin}
              onChange={e => setParametresForm(prev => ({ ...prev, horaireFin: e.target.value }))}
              className="text-sm py-1"
            />
          </FormField>
          <FormField label="Pause début">
            <Input
              type="time"
              value={parametresForm.pauseMidiDebut}
              onChange={e => setParametresForm(prev => ({ ...prev, pauseMidiDebut: e.target.value }))}
              className="text-sm py-1"
            />
          </FormField>
          <FormField label="Pause fin">
            <Input
              type="time"
              value={parametresForm.pauseMidiFin}
              onChange={e => setParametresForm(prev => ({ ...prev, pauseMidiFin: e.target.value }))}
              className="text-sm py-1"
            />
          </FormField>
        </div>
        <div className="mt-3">
          <Button size="sm" onClick={sauvegarderParametres} disabled={savingParametres}>
            {savingParametres ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {/* Spécialisations et domaines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {traducteur?.specialisations && traducteur.specialisations.length > 0 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <h3 className="font-semibold text-sm mb-2">📝 Spécialisations</h3>
            <div className="flex flex-wrap gap-1">
              {traducteur.specialisations.map((spec, i) => (
                <span key={i} className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}

        {traducteur?.domaines && traducteur.domaines.length > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-sm mb-2">📂 Domaines</h3>
            <div className="flex flex-wrap gap-1">
              {traducteur.domaines.map((dom, i) => (
                <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                  {dom}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Paires linguistiques */}
      {traducteur?.pairesLinguistiques && traducteur.pairesLinguistiques.length > 0 && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-sm mb-2">🌐 Paires linguistiques</h3>
          <div className="flex flex-wrap gap-1">
            {traducteur.pairesLinguistiques.map((pl, i) => (
              <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                {pl.langueSource} → {pl.langueCible}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStatistiques = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-blue-50 rounded-lg text-center border border-blue-100">
          <div className="text-3xl font-bold text-blue-600">{mesTaches.length}</div>
          <div className="text-sm text-gray-600">Tâches totales</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg text-center border border-green-100">
          <div className="text-3xl font-bold text-green-600">{stats.tachesTerminees}</div>
          <div className="text-sm text-gray-600">Terminées</div>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg text-center border border-orange-100">
          <div className="text-3xl font-bold text-orange-600">
            {mesTaches.reduce((sum, t) => sum + t.heuresTotal, 0).toFixed(0)}h
          </div>
          <div className="text-sm text-gray-600">Heures totales</div>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg text-center border border-purple-100">
          <div className="text-3xl font-bold text-purple-600">
            {mesTaches.filter(t => t.compteMots).reduce((sum, t) => sum + (t.compteMots || 0), 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Mots traduits</div>
        </div>
      </div>
      
      <EmptyState
        icon="📈"
        title="Statistiques détaillées à venir"
        description="Des graphiques et analyses avancées seront disponibles prochainement"
      />
    </div>
  );

  // ============ Rendu principal ============
  if (loadingTraducteur) {
    return (
      <AppLayout titre="Chargement...">
        <LoadingSpinner message="Chargement de votre profil..." />
      </AppLayout>
    );
  }

  // Si pas de profil traducteur associé
  if (!traducteur) {
    return (
      <AppLayout titre="Profil manquant">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-6xl mb-4">🔗</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Profil traducteur non configuré</h2>
          <p className="text-gray-500 text-center max-w-md">
            Votre compte utilisateur n'est pas lié à un profil traducteur. 
            Contactez un administrateur pour configurer votre accès.
          </p>
        </div>
      </AppLayout>
    );
  }

  const renderContent = () => {
    switch (section) {
      case 'taches':
        return renderTaches();
      case 'blocages':
        return renderBlocages();
      case 'parametres':
        return renderParametres();
      case 'statistiques':
        return renderStatistiques();
      case 'overview':
      default:
        return renderOverview();
    }
  };

  return (
    <AppLayout titre="Mon espace">
      <div className="space-y-4">
        {/* Bannière mode admin */}
        {isViewingAsAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">👁️</span>
              <div>
                <p className="font-medium text-amber-800 text-sm">Mode visualisation administrateur</p>
                <p className="text-xs text-amber-600">Vous consultez le portail de {traducteur.nom}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
              ← Retour
            </Button>
          </div>
        )}

        {/* En-tête compact style Admin */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{isViewingAsAdmin ? traducteur.nom : `Bonjour, ${traducteur?.nom || 'Traducteur'}`} 👋</h1>
              <p className="text-sm text-muted">
                {traducteur?.divisions?.join(', ')} • {traducteur?.categorie ? `TR-0${traducteur.categorie.slice(-1)}` : ''} • {traducteur?.horaire || '9h-17h'}
              </p>
            </div>
            
            {/* Actions rapides */}
            <div className="flex flex-wrap items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                disponibiliteActive 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {disponibiliteActive ? '✋ Disponible' : '📋 En service'}
              </div>
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
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-semibold">{stats.nbTaches} tâche(s)</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{stats.tachesEnCours} en cours</span>
            {stats.tachesEnRetard > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">{stats.tachesEnRetard} en retard</span>
            )}
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">{stats.libre.toFixed(0)}h disponible</span>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">{percentageUtilise.toFixed(0)}% utilisé</span>
          </div>
          <div className={`text-xs flex items-center gap-1 ${percentageUtilise >= 100 ? 'text-red-600' : percentageUtilise >= 75 ? 'text-orange-600' : 'text-green-600'}`}>
            {percentageUtilise >= 100 ? '⚠️ Complet' : percentageUtilise >= 75 ? '🔶 Chargé' : '✅ OK'}
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="px-4 py-2 border-b bg-gray-50/50 flex flex-wrap items-center gap-1">
            {[
              { id: 'overview' as Section, icon: '🏠', label: 'Vue d\'ensemble' },
              { id: 'taches' as Section, icon: '📋', label: 'Mes tâches' },
              { id: 'blocages' as Section, icon: '🚫', label: 'Blocages' },
              { id: 'statistiques' as Section, icon: '📊', label: 'Statistiques' },
              { id: 'parametres' as Section, icon: '⚙️', label: 'Paramètres' },
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
        titre="🚫 Bloquer du temps"
        ouvert={ouvrirBlocage}
        onFermer={() => setOuvrirBlocage(false)}
        ariaDescription="Formulaire pour bloquer des heures sur une journée"
      >
        <form onSubmit={creerBlocage} className="space-y-4">
          {erreurBlocage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {erreurBlocage}
            </div>
          )}
          
          <p className="text-sm text-muted">
            Bloquez du temps pour vos activités (formations, réunions, rendez-vous, etc.)
          </p>

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
              id="journeeComplete"
              checked={blocageData.journeeComplete}
              onChange={e => setBlocageData({ ...blocageData, journeeComplete: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="journeeComplete" className="text-sm">
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
              placeholder="Ex: Rendez-vous médical, Formation..."
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOuvrirBlocage(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submittingBlocage}>
              {submittingBlocage ? 'Création...' : 'Créer le blocage'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Dialogue de confirmation suppression */}
      <ConfirmDialog
        isOpen={confirmDeleteBlocage.isOpen}
        onClose={annulerSuppressionBlocage}
        onConfirm={executerSuppressionBlocage}
        title="Supprimer le blocage"
        message="Voulez-vous vraiment supprimer ce blocage ? Cette action est irréversible."
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      />

      {/* Dialogue de confirmation terminaison de tâche avec commentaire */}
      <Modal
        ouvert={confirmTerminerTache.isOpen}
        onFermer={annulerTerminerTache}
        titre="Terminer la tâche"
      >
        <div className="space-y-4">
          {confirmTerminerTache.tacheStatut === 'EN_RETARD' && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-medium">⚠️ Cette tâche est en retard</p>
              <p className="text-sm mt-1">Merci d'indiquer un commentaire expliquant le retard.</p>
            </div>
          )}
          
          <p className="text-gray-600">
            Voulez-vous marquer cette tâche comme terminée ? Les heures futures seront libérées de votre calendrier.
          </p>
          
          <FormField label={confirmTerminerTache.tacheStatut === 'EN_RETARD' ? 'Commentaire (recommandé)' : 'Commentaire (optionnel)'}>
            <textarea
              value={commentaireTerminaison}
              onChange={(e) => setCommentaireTerminaison(e.target.value)}
              placeholder={confirmTerminerTache.tacheStatut === 'EN_RETARD' 
                ? "Expliquez brièvement la raison du retard..." 
                : "Commentaire sur la réalisation de la tâche..."
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </FormField>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={annulerTerminerTache}
            >
              Annuler
            </Button>
            <Button 
              onClick={confirmerTerminerTache}
              disabled={terminerLoading}
              className={confirmTerminerTache.tacheStatut === 'EN_RETARD' ? 'bg-orange-600 hover:bg-orange-700' : ''}
            >
              {terminerLoading ? 'Terminaison...' : 'Terminer la tâche'}
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
};

export default DashboardTraducteur;
