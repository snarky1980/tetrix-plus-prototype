import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { LoadingSpinner } from '../ui/Spinner';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { notificationService, DemandeRessource, TraducteurDisponible } from '../../services/notificationService';
import { traducteurService } from '../../services/traducteurService';
import { useNotifications } from '../../contexts/NotificationContext';

const urgenceOptions = [
  { value: 'FAIBLE', label: '🟢 Faible', color: 'bg-green-100 text-green-800' },
  { value: 'NORMALE', label: '🟡 Normale', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HAUTE', label: '🟠 Haute', color: 'bg-orange-100 text-orange-800' },
  { value: 'CRITIQUE', label: '🔴 Critique', color: 'bg-red-100 text-red-800' },
];

interface DemandesRessourcesProps {
  divisions?: string[];
}

export const DemandesRessources: React.FC<DemandesRessourcesProps> = ({ divisions = [] }) => {
  const { rafraichirCompteurs } = useNotifications();
  const [demandes, setDemandes] = useState<DemandeRessource[]>([]);
  const [traducteursDispo, setTraducteursDispo] = useState<TraducteurDisponible[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Options de filtres - toutes les divisions/classifications de tous les traducteurs
  const [toutesLesDivisions, setToutesLesDivisions] = useState<string[]>([]);
  const [toutesLesClassifications, setToutesLesClassifications] = useState<string[]>([]);
  
  // Filtres pour les traducteurs disponibles (multi-sélection)
  const [filtresDivisions, setFiltresDivisions] = useState<string[]>([]);
  const [filtresClassifications, setFiltresClassifications] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    heuresEstimees: '',
    langueSource: '',
    langueCible: '',
    division: '',
    urgence: 'NORMALE',
  });

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const [demandesData, traducteursData, tousTraducteurs] = await Promise.all([
        notificationService.obtenirDemandesRessources(),
        notificationService.obtenirTraducteursDisponibles(),
        traducteurService.obtenirTraducteurs({ actif: true }),
      ]);
      setDemandes(demandesData);
      setTraducteursDispo(traducteursData);
      
      // Extraire toutes les divisions et classifications de tous les traducteurs
      const divisions = Array.from(new Set(tousTraducteurs.flatMap(t => t.divisions || []))).filter(Boolean).sort();
      const classifications = Array.from(new Set(tousTraducteurs.map(t => t.categorie).filter(Boolean))).sort();
      setToutesLesDivisions(divisions);
      setToutesLesClassifications(classifications);
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
      await notificationService.creerDemandeRessource({
        titre: formData.titre,
        description: formData.description || undefined,
        heuresEstimees: formData.heuresEstimees ? parseFloat(formData.heuresEstimees) : undefined,
        langueSource: formData.langueSource || undefined,
        langueCible: formData.langueCible || undefined,
        division: formData.division || undefined,
        urgence: formData.urgence as any,
      });
      
      setFormData({
        titre: '',
        description: '',
        heuresEstimees: '',
        langueSource: '',
        langueCible: '',
        division: '',
        urgence: 'NORMALE',
      });
      setShowForm(false);
      chargerDonnees();
      rafraichirCompteurs();
    } catch (error) {
      console.error('Erreur création demande:', error);
    } finally {
      setSubmitting(false);
    }
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
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? '✕' : '➕ Nouvelle'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {/* Formulaire de création */}
          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium mb-4">Publier une demande de ressources</h4>
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
                
                {divisions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Division préférée</label>
                    <Select
                      value={formData.division}
                      onChange={e => setFormData({ ...formData, division: e.target.value })}
                    >
                      <option value="">Toutes divisions</option>
                      {divisions.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting || !formData.titre}>
                  {submitting ? 'Publication...' : 'Publier la demande'}
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
                        {demande.division && (
                          <span>🏢 {demande.division}</span>
                        )}
                        <span>👤 {demande.conseiller?.prenom || demande.conseiller?.email}</span>
                        <span>📅 {new Date(demande.creeLe).toLocaleDateString('fr-CA')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
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
