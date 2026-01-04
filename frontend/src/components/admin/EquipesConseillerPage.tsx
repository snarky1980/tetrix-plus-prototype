import { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  UserPlus, 
  Crown, 
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import * as equipeConseillerService from '../../services/equipeConseillerService';
import type { EquipeConseiller, EquipeConseillerMembre } from '../../services/equipeConseillerService';

interface EquipesConseillerPageProps {
  peutGerer: boolean;
}

export default function EquipesConseillerPage({ peutGerer }: EquipesConseillerPageProps) {
  const [equipes, setEquipes] = useState<EquipeConseiller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // États du formulaire
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingEquipe, setEditingEquipe] = useState<EquipeConseiller | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    code: '',
    description: '',
    couleur: '#8B5CF6'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // État d'expansion des équipes
  const [expandedEquipes, setExpandedEquipes] = useState<Set<string>>(new Set());
  
  // Modal ajout membre
  const [ajoutMembreEquipe, setAjoutMembreEquipe] = useState<string | null>(null);
  const [utilisateursDisponibles, setUtilisateursDisponibles] = useState<Array<{
    id: string;
    email: string;
    nom?: string;
    prenom?: string;
    role: string;
  }>>([]);
  const [selectedUtilisateur, setSelectedUtilisateur] = useState('');
  const [selectedRole, setSelectedRole] = useState<'CHEF' | 'MEMBRE'>('MEMBRE');
  const [loadingUtilisateurs, setLoadingUtilisateurs] = useState(false);

  useEffect(() => {
    chargerEquipes();
  }, []);

  async function chargerEquipes() {
    try {
      setLoading(true);
      const data = await equipeConseillerService.listerEquipesConseiller(peutGerer);
      setEquipes(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des équipes');
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(equipeId: string) {
    const newExpanded = new Set(expandedEquipes);
    if (newExpanded.has(equipeId)) {
      newExpanded.delete(equipeId);
    } else {
      newExpanded.add(equipeId);
    }
    setExpandedEquipes(newExpanded);
  }

  function openCreateForm() {
    setFormMode('create');
    setFormData({ nom: '', code: '', description: '', couleur: '#8B5CF6' });
    setFormError(null);
    setEditingEquipe(null);
    setShowForm(true);
  }

  function openEditForm(equipe: EquipeConseiller) {
    setFormMode('edit');
    setFormData({
      nom: equipe.nom,
      code: equipe.code,
      description: equipe.description || '',
      couleur: equipe.couleur
    });
    setFormError(null);
    setEditingEquipe(equipe);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!formData.nom.trim() || !formData.code.trim()) {
      setFormError('Le nom et le code sont requis');
      return;
    }

    try {
      setSaving(true);
      if (formMode === 'create') {
        await equipeConseillerService.creerEquipeConseiller(formData);
      } else if (editingEquipe) {
        await equipeConseillerService.modifierEquipeConseiller(editingEquipe.id, formData);
      }
      setShowForm(false);
      chargerEquipes();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(equipe: EquipeConseiller) {
    if (!confirm(`Supprimer l'équipe "${equipe.nom}" ?`)) return;
    
    try {
      await equipeConseillerService.supprimerEquipeConseiller(equipe.id);
      chargerEquipes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  }

  async function openAjoutMembre(equipeId: string) {
    setAjoutMembreEquipe(equipeId);
    setSelectedUtilisateur('');
    setSelectedRole('MEMBRE');
    setLoadingUtilisateurs(true);
    
    try {
      const users = await equipeConseillerService.utilisateursDisponibles(equipeId);
      setUtilisateursDisponibles(users);
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
    } finally {
      setLoadingUtilisateurs(false);
    }
  }

  async function handleAjouterMembre() {
    if (!ajoutMembreEquipe || !selectedUtilisateur) return;
    
    try {
      await equipeConseillerService.ajouterMembreEquipe(ajoutMembreEquipe, {
        utilisateurId: selectedUtilisateur,
        role: selectedRole
      });
      setAjoutMembreEquipe(null);
      chargerEquipes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'ajout du membre');
    }
  }

  async function handleRetirerMembre(equipeId: string, utilisateurId: string, nomMembre: string) {
    if (!confirm(`Retirer "${nomMembre}" de l'équipe ?`)) return;
    
    try {
      await equipeConseillerService.retirerMembreEquipe(equipeId, utilisateurId);
      chargerEquipes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du retrait');
    }
  }

  async function handleChangerRole(equipeId: string, membre: EquipeConseillerMembre) {
    const nouveauRole = membre.role === 'CHEF' ? 'MEMBRE' : 'CHEF';
    
    try {
      await equipeConseillerService.modifierRoleMembre(equipeId, membre.utilisateurId, nouveauRole);
      chargerEquipes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du changement de rôle');
    }
  }

  function getNomComplet(utilisateur: { nom?: string; prenom?: string; email: string }) {
    if (utilisateur.prenom && utilisateur.nom) {
      return `${utilisateur.prenom} ${utilisateur.nom}`;
    }
    return utilisateur.nom || utilisateur.prenom || utilisateur.email;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
            <Users className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Équipes Conseillers
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gérez les équipes de conseillers pour le partage de notes et la collaboration
            </p>
          </div>
        </div>
        
        {peutGerer && (
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nouvelle équipe
          </button>
        )}
      </div>

      {/* Erreur globale */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Liste des équipes */}
      {equipes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune équipe conseiller
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Créez une équipe pour commencer à collaborer
          </p>
          {peutGerer && (
            <button
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              Créer une équipe
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {equipes.map(equipe => (
            <div
              key={equipe.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* En-tête équipe */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
                onClick={() => toggleExpand(equipe.id)}
              >
                <button className="text-gray-400">
                  {expandedEquipes.has(equipe.id) ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>
                
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: equipe.couleur }}
                />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {equipe.nom}
                    </h3>
                    <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                      {equipe.code}
                    </span>
                    {!equipe.actif && (
                      <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  {equipe.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {equipe.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Users className="h-4 w-4" />
                  {equipe.membres.length} membre{equipe.membres.length > 1 ? 's' : ''}
                </div>

                {peutGerer && (
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => openEditForm(equipe)}
                      className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg"
                      title="Modifier"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(equipe)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Liste des membres (si expanded) */}
              {expandedEquipes.has(equipe.id) && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Membres
                    </h4>
                    {peutGerer && (
                      <button
                        onClick={() => openAjoutMembre(equipe.id)}
                        className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700"
                      >
                        <UserPlus className="h-4 w-4" />
                        Ajouter
                      </button>
                    )}
                  </div>

                  {equipe.membres.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      Aucun membre dans cette équipe
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {equipe.membres.map(membre => (
                        <div
                          key={membre.id}
                          className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                            {membre.role === 'CHEF' ? (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                                {(membre.utilisateur.prenom || membre.utilisateur.email)[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {getNomComplet(membre.utilisateur)}
                              </span>
                              {membre.role === 'CHEF' && (
                                <span className="px-1.5 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
                                  Chef
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {membre.utilisateur.email}
                            </span>
                          </div>

                          {peutGerer && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleChangerRole(equipe.id, membre)}
                                className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded"
                                title={membre.role === 'CHEF' ? 'Rétrograder en membre' : 'Promouvoir chef'}
                              >
                                <Crown className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleRetirerMembre(equipe.id, membre.utilisateurId, getNomComplet(membre.utilisateur))}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                title="Retirer de l'équipe"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal formulaire création/édition */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {formMode === 'create' ? 'Nouvelle équipe conseiller' : 'Modifier l\'équipe'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {formError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom de l'équipe *
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={e => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Ex: Équipe Immigration"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono"
                  placeholder="Ex: EQ-IMM"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Description optionnelle..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Couleur
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.couleur}
                    onChange={e => setFormData({ ...formData, couleur: e.target.value })}
                    className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {formData.couleur}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {formMode === 'create' ? 'Créer' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ajout membre */}
      {ajoutMembreEquipe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Ajouter un membre
              </h2>
              <button onClick={() => setAjoutMembreEquipe(null)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {loadingUtilisateurs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                </div>
              ) : utilisateursDisponibles.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Aucun utilisateur disponible à ajouter
                </p>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Utilisateur
                    </label>
                    <select
                      value={selectedUtilisateur}
                      onChange={e => setSelectedUtilisateur(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="">Sélectionner un utilisateur...</option>
                      {utilisateursDisponibles.map(u => (
                        <option key={u.id} value={u.id}>
                          {getNomComplet(u)} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Rôle
                    </label>
                    <select
                      value={selectedRole}
                      onChange={e => setSelectedRole(e.target.value as 'CHEF' | 'MEMBRE')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="MEMBRE">Membre</option>
                      <option value="CHEF">Chef d'équipe</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setAjoutMembreEquipe(null)}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleAjouterMembre}
                      disabled={!selectedUtilisateur}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                    >
                      <UserPlus className="h-4 w-4" />
                      Ajouter
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
