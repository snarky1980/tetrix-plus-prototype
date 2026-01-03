import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { LoadingSpinner } from '../ui/Spinner';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { notificationService, DemandeRessource, TraducteurDisponible, InteretDemande } from '../../services/notificationService';
import { traducteurService } from '../../services/traducteurService';
import { divisionService } from '../../services/divisionService';
import { equipeProjetService } from '../../services/equipeProjetService';
import { useNotifications } from '../../contexts/NotificationContext';

const urgenceOptions = [
  { value: 'FAIBLE', label: '🟢 Faible', color: 'bg-green-100 text-green-800' },
  { value: 'NORMALE', label: '🟡 Normale', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HAUTE', label: '🟠 Haute', color: 'bg-orange-100 text-orange-800' },
  { value: 'CRITIQUE', label: '🔴 Critique', color: 'bg-red-100 text-red-800' },
];

const categorieOptions = ['TR01', 'TR02', 'TR03'];

interface DemandesRessourcesProps {
  divisions?: string[];
  showAll?: boolean;
}

export const DemandesRessources: React.FC<DemandesRessourcesProps> = ({ showAll: _showAll }) => {
  const { rafraichirCompteurs } = useNotifications();
  const [demandes, setDemandes] = useState<DemandeRessource[]>([]);
  const [traducteursDispo, setTraducteursDispo] = useState<TraducteurDisponible[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // Mode édition
  const [expandedInterets, setExpandedInterets] = useState<Set<string>>(new Set()); // IDs des demandes avec liste intérêts dépliée
  const [interetsParDemande, setInteretsParDemande] = useState<Record<string, InteretDemande[]>>({});
  const [loadingInterets, setLoadingInterets] = useState<Set<string>>(new Set());
  
  // Options de filtres - toutes les divisions/classifications de tous les traducteurs
  const [toutesLesDivisions, setToutesLesDivisions] = useState<string[]>([]);
  const [toutesLesClassifications, setToutesLesClassifications] = useState<string[]>([]);
  const [toutesLesSpecialisations, setToutesLesSpecialisations] = useState<string[]>([]);
  const [tousLesDomaines, setTousLesDomaines] = useState<string[]>([]);
  const [equipesProjet, setEquipesProjet] = useState<Array<{ id: string; nom: string; code: string }>>([]);
  
  // Filtres pour les traducteurs disponibles (multi-sélection)
  const [filtresDivisions, setFiltresDivisions] = useState<string[]>([]);
  const [filtresClassifications, setFiltresClassifications] = useState<string[]>([]);
  
  const initialFormData = {
    titre: '',
    description: '',
    heuresEstimees: '',
    langueSource: '',
    langueCible: '',
    urgence: 'NORMALE',
    // Nouveaux champs de ciblage
    divisions: [] as string[],
    categories: [] as string[],
    specialisations: [] as string[],
    domaines: [] as string[],
    equipeProjetId: '',
  };
  
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const [demandesData, traducteursData, tousTraducteurs, divisionsData, equipesData] = await Promise.all([
        notificationService.obtenirDemandesRessources(),
        notificationService.obtenirTraducteursDisponibles(),
        traducteurService.obtenirTraducteurs({ actif: true }),
        divisionService.obtenirDivisions().catch(() => []),
        equipeProjetService.lister({ actif: true }).catch(() => []),
      ]);
      setDemandes(demandesData);
      setTraducteursDispo(traducteursData);
      setEquipesProjet(equipesData);
      
      // Extraire toutes les divisions depuis le service divisions (plus fiable)
      const divisionNames = divisionsData.map((d: any) => d.nom).filter(Boolean).sort();
      setToutesLesDivisions(divisionNames);
      
      // Extraire toutes les classifications (catégories) et spécialisations des traducteurs
      const classifications = Array.from(new Set(tousTraducteurs.map((t: any) => t.categorie).filter(Boolean))).sort() as string[];
      const specialisations = Array.from(new Set(tousTraducteurs.flatMap((t: any) => t.specialisations || []))).filter(Boolean).sort() as string[];
      const domaines = Array.from(new Set(tousTraducteurs.flatMap((t: any) => t.domaines || []))).filter(Boolean).sort() as string[];
      
      setToutesLesClassifications(classifications);
      setToutesLesSpecialisations(specialisations);
      setTousLesDomaines(domaines);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const payload = {
        titre: formData.titre,
        description: formData.description || undefined,
        heuresEstimees: formData.heuresEstimees ? parseFloat(formData.heuresEstimees) : undefined,
        langueSource: formData.langueSource || undefined,
        langueCible: formData.langueCible || undefined,
        urgence: formData.urgence as any,
        // Critères de ciblage
        divisions: formData.divisions.length > 0 ? formData.divisions : [],
        categories: formData.categories.length > 0 ? formData.categories : [],
        specialisations: formData.specialisations.length > 0 ? formData.specialisations : [],
        domaines: formData.domaines.length > 0 ? formData.domaines : [],
        equipeProjetId: formData.equipeProjetId || undefined,
      };
      
      if (editingId) {
        // Mode modification
        await notificationService.modifierDemandeRessource(editingId, payload);
      } else {
        // Mode création
        await notificationService.creerDemandeRessource(payload);
      }
      
      resetForm();
      chargerDonnees();
      rafraichirCompteurs();
    } catch (error) {
      console.error('Erreur sauvegarde demande:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setFormData(initialFormData);
    setShowForm(false);
    setEditingId(null);
  };
  
  const handleEdit = (demande: DemandeRessource) => {
    setFormData({
      titre: demande.titre,
      description: demande.description || '',
      heuresEstimees: demande.heuresEstimees?.toString() || '',
      langueSource: demande.langueSource || '',
      langueCible: demande.langueCible || '',
      urgence: demande.urgence,
      divisions: demande.divisions || [],
      categories: demande.categories || [],
      specialisations: demande.specialisations || [],
      domaines: demande.domaines || [],
      equipeProjetId: demande.equipeProjetId || '',
    });
    setEditingId(demande.id);
    setShowForm(true);
  };

  const handleFermer = async (id: string) => {
    try {
      await notificationService.fermerDemandeRessource(id);
      chargerDonnees();
      rafraichirCompteurs();
    } catch (error) {
      console.error('Erreur fermeture:', error);
    }
  };

  const handleSupprimer = async (id: string) => {
    if (!confirm('Supprimer cette demande ?')) return;
    
    try {
      await notificationService.supprimerDemandeRessource(id);
      chargerDonnees();
      rafraichirCompteurs();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  // Charger/afficher les intérêts pour une demande
  const toggleInterets = async (demandeId: string) => {
    const newExpanded = new Set(expandedInterets);
    
    if (newExpanded.has(demandeId)) {
      // Fermer la liste
      newExpanded.delete(demandeId);
    } else {
      // Ouvrir et charger les intérêts si pas déjà chargés
      newExpanded.add(demandeId);
      
      if (!interetsParDemande[demandeId]) {
        setLoadingInterets(prev => new Set(prev).add(demandeId));
        try {
          const interets = await notificationService.obtenirInterets(demandeId);
          setInteretsParDemande(prev => ({ ...prev, [demandeId]: interets }));
        } catch (error) {
          console.error('Erreur chargement intérêts:', error);
        } finally {
          setLoadingInterets(prev => {
            const next = new Set(prev);
            next.delete(demandeId);
            return next;
          });
        }
      }
    }
    
    setExpandedInterets(newExpanded);
  };

  const getUrgenceStyle = (urgence: string) => {
    return urgenceOptions.find(u => u.value === urgence)?.color || '';
  };

  // Filtrer les traducteurs (multi-sélection avec OR logic)
  const traducteursFiltres = useMemo(() => {
    return traducteursDispo.filter(tr => {
      // Si des divisions sont sélectionnées, le traducteur doit avoir AU MOINS UNE des divisions
      if (filtresDivisions.length > 0 && !tr.divisions.some(d => filtresDivisions.includes(d))) return false;
      // Si des classifications sont sélectionnées, le traducteur doit avoir AU MOINS UNE
      if (filtresClassifications.length > 0 && !filtresClassifications.includes(tr.classification)) return false;
      return true;
    });
  }, [traducteursDispo, filtresDivisions, filtresClassifications]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      {/* Traducteurs disponibles */}
      {traducteursDispo.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <span>✋</span>
                Traducteurs cherchant du travail ({traducteursFiltres.length}/{traducteursDispo.length})
              </CardTitle>
              {/* Filtres dropdown inline - affiche TOUTES les divisions et classifications */}
              <div className="flex items-center gap-2">
                <MultiSelectDropdown
                  label=""
                  options={toutesLesDivisions}
                  selected={filtresDivisions}
                  onChange={setFiltresDivisions}
                  placeholder="Divisions"
                  minWidth="140px"
                />
                <MultiSelectDropdown
                  label=""
                  options={toutesLesClassifications}
                  selected={filtresClassifications}
                  onChange={setFiltresClassifications}
                  placeholder="Classifications"
                  minWidth="140px"
                />
                {(filtresDivisions.length > 0 || filtresClassifications.length > 0) && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => { setFiltresDivisions([]); setFiltresClassifications([]); }}
                  >
                    ✕
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {traducteursFiltres.length === 0 ? (
              <div className="text-center py-3 text-gray-500 text-sm">
                Aucun traducteur ne correspond aux filtres
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {traducteursFiltres.map(tr => (
                  <div key={tr.id} className="p-2 bg-white rounded border border-green-200 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                        {tr.nom.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{tr.nom}</div>
                        <div className="text-gray-500 truncate">{tr.classification} • {tr.divisions.join(', ')}</div>
                      </div>
                    </div>
                    <div className="text-gray-500">
                      {tr.pairesLinguistiques.map(p => `${p.langueSource}→${p.langueCible}`).join(', ')} • {tr.capaciteHeuresParJour}h/j
                    </div>
                    {tr.commentaireDisponibilite && (
                      <div className="mt-1 text-green-700 bg-green-100 p-1 rounded text-xs truncate" title={tr.commentaireDisponibilite}>
                        💬 {tr.commentaireDisponibilite}
                      </div>
                    )}
                    {/* Affichage du ciblage du traducteur */}
                    {tr.ciblage && ((tr.ciblage.divisions?.length ?? 0) > 0 || (tr.ciblage.categories?.length ?? 0) > 0 || tr.ciblage.equipeProjetId) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {tr.ciblage.divisions?.map(d => (
                          <span key={d} className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
                            🏢 {d}
                          </span>
                        ))}
                        {tr.ciblage.categories?.map(c => (
                          <span key={c} className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">
                            {c}
                          </span>
                        ))}
                        {tr.ciblage.equipeProjetId && (
                          <span className="px-1 py-0.5 bg-cyan-100 text-cyan-700 rounded text-[10px]">
                            👥 Équipe
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Demandes de ressources */}
      <Card>
        <CardHeader className="py-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <span>📢</span>
              Demandes de ressources ({demandes.length})
            </CardTitle>
            <Button size="sm" onClick={() => { 
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}>
              {showForm ? '✕' : '➕ Nouvelle'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {/* Formulaire de création/modification */}
          {showForm && (
            <form onSubmit={handleSubmit} className={`mb-6 p-4 rounded-lg border ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
              <h4 className="font-medium mb-4 flex items-center gap-2">
                {editingId ? '✏️ Modifier la demande' : '📢 Publier une demande de ressources'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Titre *</label>
                  <Input
                    value={formData.titre}
                    onChange={e => setFormData({ ...formData, titre: e.target.value })}
                    placeholder="Ex: Besoin urgent traducteur EN→FR"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Détails supplémentaires..."
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    rows={2}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Heures estimées</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.heuresEstimees}
                    onChange={e => setFormData({ ...formData, heuresEstimees: e.target.value })}
                    placeholder="Ex: 10"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Urgence</label>
                  <Select
                    value={formData.urgence}
                    onChange={e => setFormData({ ...formData, urgence: e.target.value })}
                  >
                    {urgenceOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Langue source</label>
                  <Input
                    value={formData.langueSource}
                    onChange={e => setFormData({ ...formData, langueSource: e.target.value.toUpperCase() })}
                    placeholder="EN, FR..."
                    maxLength={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Langue cible</label>
                  <Input
                    value={formData.langueCible}
                    onChange={e => setFormData({ ...formData, langueCible: e.target.value.toUpperCase() })}
                    placeholder="EN, FR..."
                    maxLength={3}
                  />
                </div>
              </div>
              
              {/* Section ciblage */}
              <div className="mt-4 p-3 bg-white/50 rounded-lg border border-blue-100">
                <h5 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                  🎯 Ciblage (optionnel)
                  <span className="text-xs font-normal text-blue-600">Restreindre qui verra cette demande</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <MultiSelectDropdown
                    label="Divisions"
                    options={toutesLesDivisions}
                    selected={formData.divisions}
                    onChange={(val) => setFormData({ ...formData, divisions: val })}
                    placeholder="Toutes divisions"
                    minWidth="100%"
                  />
                  
                  <MultiSelectDropdown
                    label="Catégories"
                    options={categorieOptions}
                    selected={formData.categories}
                    onChange={(val) => setFormData({ ...formData, categories: val })}
                    placeholder="Toutes catégories"
                    minWidth="100%"
                  />
                  
                  {equipesProjet.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Équipe-projet</label>
                      <Select
                        value={formData.equipeProjetId}
                        onChange={e => setFormData({ ...formData, equipeProjetId: e.target.value })}
                      >
                        <option value="">Toutes équipes</option>
                        {equipesProjet.map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.nom} ({eq.code})</option>
                        ))}
                      </Select>
                    </div>
                  )}
                  
                  {toutesLesSpecialisations.length > 0 && (
                    <MultiSelectDropdown
                      label="Spécialisations"
                      options={toutesLesSpecialisations}
                      selected={formData.specialisations}
                      onChange={(val) => setFormData({ ...formData, specialisations: val })}
                      placeholder="Toutes spécialisations"
                      minWidth="100%"
                    />
                  )}
                  
                  {tousLesDomaines.length > 0 && (
                    <MultiSelectDropdown
                      label="Domaines"
                      options={tousLesDomaines}
                      selected={formData.domaines}
                      onChange={(val) => setFormData({ ...formData, domaines: val })}
                      placeholder="Tous domaines"
                      minWidth="100%"
                    />
                  )}
                </div>
                
                {/* Résumé du ciblage */}
                {(formData.divisions.length > 0 || formData.categories.length > 0 || formData.equipeProjetId || formData.specialisations.length > 0 || formData.domaines.length > 0) && (
                  <div className="mt-2 text-xs text-blue-700 bg-blue-100 p-2 rounded">
                    <strong>Ciblage actif :</strong>{' '}
                    {formData.divisions.length > 0 && `${formData.divisions.length} division(s)`}
                    {formData.categories.length > 0 && ` • ${formData.categories.join(', ')}`}
                    {formData.equipeProjetId && ` • Équipe: ${equipesProjet.find(e => e.id === formData.equipeProjetId)?.code}`}
                    {formData.specialisations.length > 0 && ` • ${formData.specialisations.length} spécialisation(s)`}
                    {formData.domaines.length > 0 && ` • ${formData.domaines.length} domaine(s)`}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting || !formData.titre}>
                  {submitting ? 'Enregistrement...' : (editingId ? '💾 Enregistrer' : 'Publier la demande')}
                </Button>
              </div>
            </form>
          )}

          {/* Liste des demandes */}
          {demandes.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <span className="text-4xl block mb-2">📋</span>
              <p>Aucune demande de ressources active</p>
            </div>
          ) : (
            <div className="space-y-3">
              {demandes.map(demande => (
                <div 
                  key={demande.id} 
                  className="p-4 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getUrgenceStyle(demande.urgence)}`}>
                          {urgenceOptions.find(u => u.value === demande.urgence)?.label}
                        </span>
                        <h4 className="font-medium">{demande.titre}</h4>
                      </div>
                      {demande.description && (
                        <p className="text-sm text-gray-600 mb-2">{demande.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted">
                        {demande.heuresEstimees && (
                          <span>⏱️ {demande.heuresEstimees}h</span>
                        )}
                        {demande.langueSource && demande.langueCible && (
                          <span>🌐 {demande.langueSource}→{demande.langueCible}</span>
                        )}
                        <span>👤 {demande.conseiller?.prenom || demande.conseiller?.email}</span>
                        <span>📅 {new Date(demande.creeLe).toLocaleDateString('fr-CA')}</span>
                      </div>
                      {/* Affichage des critères de ciblage */}
                      {(demande.divisions?.length > 0 || demande.categories?.length > 0 || demande.specialisations?.length > 0 || demande.domaines?.length > 0 || demande.equipeProjetId) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {demande.divisions?.map(d => (
                            <span key={d} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              🏢 {d}
                            </span>
                          ))}
                          {demande.categories?.map(c => (
                            <span key={c} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                              {c}
                            </span>
                          ))}
                          {demande.specialisations?.map(s => (
                            <span key={s} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                              {s}
                            </span>
                          ))}
                          {demande.domaines?.map(d => (
                            <span key={d} className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                              {d}
                            </span>
                          ))}
                          {demande.equipeProjetId && (
                            <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs">
                              👥 Équipe
                            </span>
                          )}
                        </div>
                      )}
                      {/* Bouton pour voir les traducteurs intéressés */}
                      {(demande.nbInterets ?? 0) > 0 && (
                        <button
                          onClick={() => toggleInterets(demande.id)}
                          className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 transition-colors"
                        >
                          <span className="px-2 py-1 bg-emerald-100 rounded-full font-medium">
                            🙋 {demande.nbInterets} intéressé{(demande.nbInterets ?? 0) > 1 ? 's' : ''}
                          </span>
                          <span>{expandedInterets.has(demande.id) ? '▲' : '▼'}</span>
                        </button>
                      )}
                      {/* Liste des traducteurs intéressés */}
                      {expandedInterets.has(demande.id) && (
                        <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                          {loadingInterets.has(demande.id) ? (
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              <LoadingSpinner /> Chargement...
                            </div>
                          ) : interetsParDemande[demande.id]?.length > 0 ? (
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-emerald-800 mb-1">Traducteurs intéressés :</div>
                              {interetsParDemande[demande.id].map(interet => (
                                <div key={interet.id} className="flex items-center gap-2 p-2 bg-white rounded border border-emerald-100">
                                  <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    {interet.traducteur?.nom?.charAt(0) || '?'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm">{interet.traducteur?.nom || 'Traducteur'}</div>
                                    <div className="text-xs text-gray-500">
                                      {interet.traducteur?.categorie} • {interet.traducteur?.divisions?.join(', ')}
                                    </div>
                                  </div>
                                  {interet.message && (
                                    <div className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded max-w-[200px] truncate" title={interet.message}>
                                      💬 {interet.message}
                                    </div>
                                  )}
                                  <div className="text-[10px] text-gray-400">
                                    {new Date(interet.creeLe).toLocaleDateString('fr-CA')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">Aucun intérêt pour le moment</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => handleEdit(demande)}
                        className="text-xs px-2 py-1"
                        title="Modifier"
                      >
                        ✏️
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleFermer(demande.id)}
                        className="text-xs px-2 py-1"
                        title="Marquer comme satisfaite"
                      >
                        ✅ Satisfaite
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleSupprimer(demande.id)}
                        className="text-xs px-2 py-1 text-red-600 hover:bg-red-50"
                        title="Supprimer"
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
