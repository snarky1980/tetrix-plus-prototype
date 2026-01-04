import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/Spinner';
import { divisionService, type Division } from '../../services/divisionService';
import { exporterDivisions } from '../../utils/exportUtils';

/**
 * Gestion complète des divisions (CRUD)
 * Permet de créer, modifier, activer/désactiver les divisions
 */
export const DivisionManagement: React.FC = () => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Formulaire
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    code: '',
    description: ''
  });
  const [showForm, setShowForm] = useState(false);

  // Charger les divisions
  const chargerDivisions = async () => {
    setLoading(true);
    try {
      const data = await divisionService.obtenirDivisions();
      setDivisions(data);
    } catch (err) {
      setError('Erreur lors du chargement des divisions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDivisions();
  }, []);

  // Ouvrir le formulaire pour création
  const handleNouveau = () => {
    setEditingId(null);
    setFormData({ nom: '', code: '', description: '' });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  // Ouvrir le formulaire pour modification
  const handleEditer = (division: Division) => {
    setEditingId(division.id);
    setFormData({
      nom: division.nom,
      code: division.code,
      description: division.description || ''
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  // Sauvegarder (création ou modification)
  const handleSauvegarder = async () => {
    if (!formData.nom.trim() || !formData.code.trim()) {
      setError('Le nom et le code sont requis');
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      if (editingId) {
        await divisionService.modifierDivision(editingId, formData);
        setSuccess('Division modifiée avec succès');
      } else {
        await divisionService.creerDivision(formData);
        setSuccess('Division créée avec succès');
      }
      setShowForm(false);
      setFormData({ nom: '', code: '', description: '' });
      setEditingId(null);
      await chargerDivisions();
    } catch (err: any) {
      setError(err.response?.data?.erreur || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Toggle actif/inactif
  const handleToggleActif = async (division: Division) => {
    try {
      await divisionService.modifierDivision(division.id, { actif: !division.actif });
      setSuccess(`Division ${division.actif ? 'désactivée' : 'activée'}`);
      await chargerDivisions();
    } catch (err: any) {
      setError(err.response?.data?.erreur || 'Erreur lors de la modification');
    }
  };

  // Annuler le formulaire
  const handleAnnuler = () => {
    setShowForm(false);
    setFormData({ nom: '', code: '', description: '' });
    setEditingId(null);
    setError(null);
  };

  // Supprimer une division
  const handleSupprimer = async (division: Division) => {
    if (!confirm(`Supprimer la division "${division.nom}" (${division.code}) ?\n\nCette action est irréversible.`)) {
      return;
    }
    
    try {
      await divisionService.supprimerDivision(division.id);
      setSuccess(`Division "${division.nom}" supprimée`);
      await chargerDivisions();
    } catch (err: any) {
      setError(err.response?.data?.erreur || err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Chargement des divisions..." />;
  }

  return (
    <div className="space-y-4">
      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gestion des divisions</h2>
          <p className="text-sm text-gray-500">
            {divisions.length} division(s) • {divisions.filter(d => d.actif).length} active(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => exporterDivisions(divisions)}
            title="Exporter la liste en CSV"
          >
            📥 Export CSV
          </Button>
          <Button onClick={handleNouveau} size="sm">
            ➕ Nouvelle division
          </Button>
        </div>
      </div>

      {/* Formulaire création/modification */}
      {showForm && (
        <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <h3 className="font-medium">
            {editingId ? 'Modifier la division' : 'Nouvelle division'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Ex: Direction des finances"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Ex: FINANCE"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Description optionnelle..."
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSauvegarder} disabled={saving} size="sm">
              {saving ? 'Sauvegarde...' : editingId ? 'Modifier' : 'Créer'}
            </Button>
            <Button onClick={handleAnnuler} variant="outline" size="sm">
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Liste des divisions */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Code</th>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Nom</th>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Description</th>
              <th className="text-center px-4 py-2 text-sm font-medium text-gray-600">Statut</th>
              <th className="text-right px-4 py-2 text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {divisions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Aucune division configurée
                </td>
              </tr>
            ) : (
              divisions.map((division) => (
                <tr key={division.id} className={`hover:bg-gray-50 ${!division.actif ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-mono">
                      {division.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{division.nom}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {division.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      division.actif 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {division.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleEditer(division)}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                      >
                        ✏️ Modifier
                      </button>
                      <button
                        onClick={() => handleToggleActif(division)}
                        className={`px-2 py-1 text-xs rounded ${
                          division.actif 
                            ? 'text-red-600 hover:bg-red-50' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {division.actif ? '🚫 Désactiver' : '✅ Activer'}
                      </button>
                      <button
                        onClick={() => handleSupprimer(division)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                        title="Supprimer définitivement"
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
        💡 <strong>Note :</strong> Les divisions permettent d'organiser les traducteurs par unité. 
        Chaque traducteur peut être assigné à une ou plusieurs divisions. 
        Les conseillers peuvent filtrer par division dans la planification.
      </div>
    </div>
  );
};
