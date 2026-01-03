import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { FormField } from '../components/ui/FormField';
import { StatCard } from '../components/ui/StatCard';
import { SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/Spinner';
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
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    
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
    
    // Refresh
    refresh,
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
    <div className="space-y-6">
      {/* Statut de disponibilité */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                disponibiliteActive ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                <span className="text-2xl">{disponibiliteActive ? '✋' : '😴'}</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">
                  {disponibiliteActive ? 'Je cherche du travail' : 'Statut normal'}
                </h3>
                <p className="text-sm text-muted">
                  {disponibiliteActive 
                    ? 'Les conseillers sont notifiés que vous êtes disponible'
                    : 'Activez pour signaler que vous avez besoin de tâches'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleDisponibilite}
              disabled={savingDisponibilite}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                disponibiliteActive ? 'bg-green-500' : 'bg-gray-300'
              } ${savingDisponibilite ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              role="switch"
              aria-checked={disponibiliteActive}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                  disponibiliteActive ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {disponibiliteActive && (
            <div className="mt-4 pt-4 border-t border-blue-200 space-y-4">
              {/* Commentaire */}
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={commentaireDisponibilite}
                  onChange={e => setCommentaireDisponibilite(e.target.value)}
                  placeholder="Commentaire optionnel pour les conseillers..."
                  className="flex-1"
                  maxLength={200}
                />
              </div>
              
              {/* Section ciblage */}
              <div className="p-3 bg-white/50 rounded-lg border border-blue-100">
                <h5 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                  🎯 Ciblage (optionnel)
                  <span className="text-xs font-normal text-blue-600">Restreindre qui verra votre disponibilité</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <MultiSelectDropdown
                    label="Divisions"
                    options={toutesLesDivisions}
                    selected={ciblageDisponibilite.divisions}
                    onChange={(val) => setCiblageDisponibilite({ ...ciblageDisponibilite, divisions: val })}
                    placeholder="Toutes divisions"
                    minWidth="100%"
                  />
                  
                  <MultiSelectDropdown
                    label="Catégories de tâches"
                    options={categorieOptions}
                    selected={ciblageDisponibilite.categories}
                    onChange={(val) => setCiblageDisponibilite({ ...ciblageDisponibilite, categories: val })}
                    placeholder="Toutes catégories"
                    minWidth="100%"
                  />
                  
                  {equipesProjet.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Équipe-projet</label>
                      <Select
                        value={ciblageDisponibilite.equipeProjetId}
                        onChange={e => setCiblageDisponibilite({ ...ciblageDisponibilite, equipeProjetId: e.target.value })}
                      >
                        <option value="">Toutes équipes</option>
                        {equipesProjet.map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.nom} ({eq.code})</option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>
                
                {/* Résumé du ciblage */}
                {(ciblageDisponibilite.divisions.length > 0 || ciblageDisponibilite.categories.length > 0 || ciblageDisponibilite.equipeProjetId) && (
                  <div className="mt-2 text-xs text-blue-700 bg-blue-100 p-2 rounded">
                    <strong>Ciblage actif :</strong>{' '}
                    {ciblageDisponibilite.divisions.length > 0 && `${ciblageDisponibilite.divisions.length} division(s)`}
                    {ciblageDisponibilite.categories.length > 0 && ` • ${ciblageDisponibilite.categories.join(', ')}`}
                    {ciblageDisponibilite.equipeProjetId && ` • Équipe: ${equipesProjet.find(e => e.id === ciblageDisponibilite.equipeProjetId)?.code}`}
                  </div>
                )}
              </div>
              
              {/* Bouton sauvegarder */}
              <div className="flex justify-end">
                <Button
                  variant="secondaire"
                  onClick={sauvegarderCiblageDisponibilite}
                  disabled={savingDisponibilite}
                >
                  {savingDisponibilite ? '⏳' : '💾'} Enregistrer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demandes de ressources actives des conseillers */}
      <DemandesRessourcesTraducteur />

      {/* Statistiques principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Capacité" 
          value={formatHeures(stats.capacite)} 
          icon="📊" 
          variant="info"
          suffix="h"
          subtitle={`sur ${viewMode === '1' ? '1 jour' : `${viewMode} jours`}`}
        />
        <StatCard 
          title="Tâches assignées" 
          value={formatHeures(stats.taches)} 
          icon="📝" 
          variant="warning"
          suffix="h"
          subtitle={`${stats.nbTaches} tâche(s)`}
        />
        <StatCard 
          title="Temps bloqué" 
          value={formatHeures(stats.blocages)} 
          icon="🚫" 
          variant="default"
          suffix="h"
          subtitle={`${blocages.length} blocage(s)`}
        />
        <StatCard 
          title="Disponible" 
          value={formatHeures(stats.libre)} 
          icon="✅" 
          variant={percentageUtilise >= 100 ? 'danger' : percentageUtilise >= 75 ? 'warning' : 'success'}
          suffix="h"
          subtitle={`${(100 - percentageUtilise).toFixed(0)}% libre`}
        />
      </div>

      {/* Barre de progression globale */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Utilisation globale</span>
            <span className="text-sm font-bold">{percentageUtilise.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all ${
                percentageUtilise >= 100 ? 'bg-red-600' : 
                percentageUtilise >= 75 ? 'bg-orange-500' : 
                percentageUtilise >= 50 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(percentageUtilise, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted">
            <span>📝 Tâches: {stats.taches.toFixed(1)}h</span>
            <span>🚫 Blocages: {stats.blocages.toFixed(1)}h</span>
            <span>✅ Libre: {stats.libre.toFixed(1)}h</span>
          </div>
        </CardContent>
      </Card>

      {/* Sélecteur de période et calendrier */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>📅 Ma planification</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as ViewMode)}
                className="w-auto"
              >
                <option value="1">Aujourd'hui</option>
                <option value="7">7 jours</option>
                <option value="14">14 jours</option>
                <option value="30">30 jours</option>
                <option value="custom">Personnalisé</option>
              </Select>
              <Button variant="secondaire" onClick={() => setOuvrirBlocage(true)}>
                + Bloquer du temps
              </Button>
            </div>
          </div>
          
          {viewMode === 'custom' && (
            <div className="flex gap-2 mt-3">
              <Input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="w-auto"
              />
              <span className="self-center">à</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="w-auto"
              />
              <Button onClick={refresh}>Appliquer</Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {renderCalendrier()}
          {errorPlanif && <p className="text-xs text-red-600 mt-2">{errorPlanif}</p>}
        </CardContent>
      </Card>

      {/* Tâches à venir (aperçu) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>📋 Mes prochaines tâches</CardTitle>
            <Button variant="outline" onClick={() => setSection('taches')}>
              Voir tout →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTaches ? (
            <LoadingSpinner message="Chargement..." />
          ) : mesTaches.length === 0 ? (
            <EmptyState
              icon="📋"
              title="Aucune tâche"
              description="Vous n'avez pas de tâches assignées actuellement"
            />
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
                <p className="text-center text-sm text-muted pt-2">
                  + {mesTaches.length - 3} autres tâches
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderTaches = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>📋 Toutes mes tâches ({mesTaches.length})</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs">
                <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                <span>Planifiées: {stats.tachesPlanifiees}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span>En cours: {stats.tachesEnCours}</span>
              </div>
              {stats.tachesEnRetard > 0 && (
                <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  <span>En retard: {stats.tachesEnRetard}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Terminées: {stats.tachesTerminees}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTaches ? (
            <LoadingSpinner message="Chargement des tâches..." />
          ) : mesTaches.length === 0 ? (
            <EmptyState
              icon="📋"
              title="Aucune tâche assignée"
              description="Vous n'avez actuellement aucune tâche assignée"
            />
          ) : (
            <div className="space-y-3">
              {mesTaches.map(tache => (
                <TacheCard 
                  key={tache.id} 
                  tache={tache} 
                  onTerminer={demanderTerminerTache}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderBlocages = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>🚫 Mes blocages</CardTitle>
            <Button onClick={() => setOuvrirBlocage(true)}>
              + Nouveau blocage
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                  className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">🚫</div>
                    <div>
                      <div className="font-medium">
                        {new Date(blocage.date).toLocaleDateString('fr-CA', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long' 
                        })}
                      </div>
                      <div className="text-sm text-muted">
                        {blocage.heureDebut} - {blocage.heureFin} 
                        <span className="mx-2">•</span>
                        {blocage.heures}h
                      </div>
                      {blocage.motif && (
                        <div className="text-sm text-gray-600 mt-1">
                          💬 {blocage.motif}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="danger" 
                    onClick={() => demanderSuppressionBlocage(blocage.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderParametres = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>⚙️ Mes paramètres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Informations personnelles */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">👤 Informations</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted">Nom:</span>
                  <span className="ml-2 font-medium">{traducteur?.nom || '-'}</span>
                </div>
                <div>
                  <span className="text-muted">Division(s):</span>
                  <span className="ml-2 font-medium">{traducteur?.divisions?.join(', ') || '-'}</span>
                </div>
                <div>
                  <span className="text-muted">Catégorie:</span>
                  <span className="ml-2 font-medium">{traducteur?.categorie ? `TR-0${traducteur.categorie.slice(-1)}` : '-'}</span>
                </div>
                <div>
                  <span className="text-muted">Capacité/jour:</span>
                  <span className="ml-2 font-medium">{traducteur?.capaciteHeuresParJour || 7.5}h</span>
                </div>
              </div>
            </div>

            {/* Horaire de travail */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold mb-3">🕐 Horaire de travail</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Heure de début">
                  <Input
                    type="time"
                    value={parametresForm.horaireDebut}
                    onChange={e => setParametresForm(prev => ({ ...prev, horaireDebut: e.target.value }))}
                  />
                </FormField>
                <FormField label="Heure de fin">
                  <Input
                    type="time"
                    value={parametresForm.horaireFin}
                    onChange={e => setParametresForm(prev => ({ ...prev, horaireFin: e.target.value }))}
                  />
                </FormField>
              </div>
              
              <h4 className="font-medium mt-4 mb-2">🍽️ Pause midi</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Début pause">
                  <Input
                    type="time"
                    value={parametresForm.pauseMidiDebut}
                    onChange={e => setParametresForm(prev => ({ ...prev, pauseMidiDebut: e.target.value }))}
                  />
                </FormField>
                <FormField label="Fin pause">
                  <Input
                    type="time"
                    value={parametresForm.pauseMidiFin}
                    onChange={e => setParametresForm(prev => ({ ...prev, pauseMidiFin: e.target.value }))}
                  />
                </FormField>
              </div>
              
              <div className="mt-4">
                <Button onClick={sauvegarderParametres} disabled={savingParametres}>
                  {savingParametres ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
              </div>
            </div>

            {/* Spécialisations */}
            {traducteur?.specialisations && traducteur.specialisations.length > 0 && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold mb-3">📝 Spécialisations</h3>
                <div className="flex flex-wrap gap-2">
                  {traducteur.specialisations.map((spec, i) => (
                    <span key={i} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Domaines */}
            {traducteur?.domaines && traducteur.domaines.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold mb-3">📂 Domaines</h3>
                <div className="flex flex-wrap gap-2">
                  {traducteur.domaines.map((dom, i) => (
                    <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      {dom}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Paires linguistiques */}
            {traducteur?.pairesLinguistiques && traducteur.pairesLinguistiques.length > 0 && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold mb-3">🌐 Paires linguistiques</h3>
                <div className="flex flex-wrap gap-2">
                  {traducteur.pairesLinguistiques.map((pl, i) => (
                    <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      {pl.langueSource} → {pl.langueCible}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStatistiques = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📊 Mes statistiques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600">{mesTaches.length}</div>
              <div className="text-sm text-muted">Tâches totales</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600">{stats.tachesTerminees}</div>
              <div className="text-sm text-muted">Terminées</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-orange-600">
                {mesTaches.reduce((sum, t) => sum + t.heuresTotal, 0).toFixed(0)}h
              </div>
              <div className="text-sm text-muted">Heures totales</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-purple-600">
                {mesTaches.filter(t => t.compteMots).reduce((sum, t) => sum + (t.compteMots || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-muted">Mots traduits</div>
            </div>
          </div>
          
          <EmptyState
            icon="📈"
            title="Statistiques détaillées à venir"
            description="Des graphiques et analyses avancées seront disponibles prochainement"
          />
        </CardContent>
      </Card>
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

  return (
    <AppLayout titre="">
      <div className="space-y-6">
        {/* Bannière mode admin */}
        {isViewingAsAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👁️</span>
              <div>
                <p className="font-medium text-amber-800">Mode visualisation administrateur</p>
                <p className="text-sm text-amber-600">Vous consultez le portail de {traducteur.nom}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin')}>
              ← Retour à l'admin
            </Button>
          </div>
        )}

        {/* En-tête avec navigation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">{isViewingAsAdmin ? traducteur.nom : `Bonjour, ${traducteur?.nom || 'Traducteur'}`} 👋</h1>
              <p className="text-muted mt-1">
                {traducteur?.divisions?.join(', ')} • {traducteur?.categorie ? `TR-0${traducteur.categorie.slice(-1)}` : ''} • 
                Horaire: {traducteur?.horaire || '9h-17h'}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full ${
              disponibiliteActive 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {disponibiliteActive ? '✋ Cherche du travail' : '📋 En service'}
            </div>
          </div>
          
          {/* Menu de navigation */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Button 
              variant={section === 'overview' ? 'primaire' : 'outline'}
              onClick={() => setSection('overview')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">🏠</span>
              <span className="text-sm">Vue d'ensemble</span>
            </Button>
            <Button 
              variant={section === 'taches' ? 'primaire' : 'outline'}
              onClick={() => setSection('taches')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">📋</span>
              <span className="text-sm">Mes tâches</span>
            </Button>
            <Button 
              variant={section === 'blocages' ? 'primaire' : 'outline'}
              onClick={() => setSection('blocages')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">🚫</span>
              <span className="text-sm">Blocages</span>
            </Button>
            <Button 
              variant={section === 'statistiques' ? 'primaire' : 'outline'}
              onClick={() => setSection('statistiques')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">📊</span>
              <span className="text-sm">Statistiques</span>
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/mes-notes')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">📝</span>
              <span className="text-sm">Mes notes</span>
            </Button>
            <Button 
              variant={section === 'parametres' ? 'primaire' : 'outline'}
              onClick={() => setSection('parametres')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <span className="text-2xl">⚙️</span>
              <span className="text-sm">Paramètres</span>
            </Button>
          </div>
        </div>

        {/* Contenu de la section */}
        {section === 'overview' && renderOverview()}
        {section === 'taches' && renderTaches()}
        {section === 'blocages' && renderBlocages()}
        {section === 'parametres' && renderParametres()}
        {section === 'statistiques' && renderStatistiques()}
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
