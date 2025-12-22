import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { LoadingSpinner } from '../ui/Spinner';
import { notificationService, DemandeRessource, TraducteurDisponible } from '../../services/notificationService';
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
  
  // Filtres pour les traducteurs disponibles (multi-sélection)
  const [filtresDivisions, setFiltresDivisions] = useState<string[]>([]);
  const [filtresClassifications, setFiltresClassifications] = useState<string[]>([]);
  const [dropdownDivisionsOuvert, setDropdownDivisionsOuvert] = useState(false);
  const [dropdownClassificationsOuvert, setDropdownClassificationsOuvert] = useState(false);
  
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    heuresEstimees: '',
    langueSource: '',
    langueCible: '',
    division: '',
    urgence: 'NORMALE',
  });

  // Ref pour fermer les dropdowns en cliquant ailleurs
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chargerDonnees();
  }, []);

  // Fermer les dropdowns quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownDivisionsOuvert(false);
        setDropdownClassificationsOuvert(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const [demandesData, traducteursData] = await Promise.all([
        notificationService.obtenirDemandesRessources(),
        notificationService.obtenirTraducteursDisponibles(),
      ]);
      setDemandes(demandesData);
      setTraducteursDispo(traducteursData);
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

  // Extraire les divisions et classifications uniques des traducteurs disponibles
  const divisionsDisponibles = useMemo(() => 
    Array.from(new Set(traducteursDispo.flatMap(t => t.divisions))).sort(),
    [traducteursDispo]
  );
  
  const classificationsDisponibles = useMemo(() => 
    Array.from(new Set(traducteursDispo.map(t => t.classification))).sort(),
    [traducteursDispo]
  );

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
    <div className="space-y-6">
      {/* Traducteurs disponibles */}
      {traducteursDispo.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">✋</span>
              Traducteurs cherchant du travail ({traducteursFiltres.length}/{traducteursDispo.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filtres compacts avec menus déroulants */}
            <div ref={dropdownRef} className="flex flex-wrap items-center gap-3 mb-4">
              {/* Dropdown Divisions */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setDropdownDivisionsOuvert(!dropdownDivisionsOuvert); setDropdownClassificationsOuvert(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <span>📂 Divisions</span>
                  {filtresDivisions.length > 0 && (
                    <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">{filtresDivisions.length}</span>
                  )}
                  <svg className={`w-4 h-4 transition-transform ${dropdownDivisionsOuvert ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {dropdownDivisionsOuvert && (
                  <div className="absolute z-20 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg">
                    <div className="p-2 border-b border-gray-100">
                      <button
                        type="button"
                        onClick={() => setFiltresDivisions([])}
                        className="text-xs text-gray-500 hover:text-green-600"
                      >
                        Tout désélectionner
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      {divisionsDisponibles.map(d => (
                        <label
                          key={d}
                          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer rounded hover:bg-green-50 ${filtresDivisions.includes(d) ? 'bg-green-100' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={filtresDivisions.includes(d)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFiltresDivisions([...filtresDivisions, d]);
                              } else {
                                setFiltresDivisions(filtresDivisions.filter(x => x !== d));
                              }
                            }}
                            className="rounded text-green-600 focus:ring-green-500"
                          />
                          <span>{d}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dropdown Classifications */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setDropdownClassificationsOuvert(!dropdownClassificationsOuvert); setDropdownDivisionsOuvert(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <span>🏷️ Classifications</span>
                  {filtresClassifications.length > 0 && (
                    <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">{filtresClassifications.length}</span>
                  )}
                  <svg className={`w-4 h-4 transition-transform ${dropdownClassificationsOuvert ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {dropdownClassificationsOuvert && (
                  <div className="absolute z-20 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
                    <div className="p-2 border-b border-gray-100">
                      <button
                        type="button"
                        onClick={() => setFiltresClassifications([])}
                        className="text-xs text-gray-500 hover:text-green-600"
                      >
                        Tout désélectionner
                      </button>
                    </div>
                    <div className="p-1">
                      {classificationsDisponibles.map(c => (
                        <label
                          key={c}
                          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer rounded hover:bg-green-50 ${filtresClassifications.includes(c) ? 'bg-green-100' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={filtresClassifications.includes(c)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFiltresClassifications([...filtresClassifications, c]);
                              } else {
                                setFiltresClassifications(filtresClassifications.filter(x => x !== c));
                              }
                            }}
                            className="rounded text-green-600 focus:ring-green-500"
                          />
                          <span>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bouton réinitialiser */}
              {(filtresDivisions.length > 0 || filtresClassifications.length > 0) && (
                <button
                  type="button"
                  onClick={() => { setFiltresDivisions([]); setFiltresClassifications([]); }}
                  className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Réinitialiser
                </button>
              )}
            </div>

            {/* Badges des filtres actifs */}
            {(filtresDivisions.length > 0 || filtresClassifications.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filtresDivisions.map(d => (
                  <span key={d} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    📂 {d}
                    <button
                      type="button"
                      onClick={() => setFiltresDivisions(filtresDivisions.filter(x => x !== d))}
                      className="hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {filtresClassifications.map(c => (
                  <span key={c} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    🏷️ {c}
                    <button
                      type="button"
                      onClick={() => setFiltresClassifications(filtresClassifications.filter(x => x !== c))}
                      className="hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {traducteursFiltres.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>Aucun traducteur ne correspond aux filtres sélectionnés</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {traducteursFiltres.map(tr => (
                  <div key={tr.id} className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                        {tr.nom.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{tr.nom}</div>
                        <div className="text-xs text-muted">{tr.classification} • {tr.divisions.join(', ')}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      <span className="font-medium">Paires:</span>{' '}
                      {tr.pairesLinguistiques.map(p => `${p.langueSource}→${p.langueCible}`).join(', ')}
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Capacité:</span> {tr.capaciteHeuresParJour}h/jour
                    </div>
                    {tr.commentaireDisponibilite && (
                      <div className="mt-2 text-sm text-green-700 bg-green-100 p-2 rounded">
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📢</span>
              Demandes de ressources
            </CardTitle>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? '✕ Annuler' : '➕ Nouvelle demande'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
