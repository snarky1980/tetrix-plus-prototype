import React, { useState, useEffect } from 'react';
import { 
  Calendar, Plus, Edit2, Trash2, Save, X, RefreshCw, 
  ChevronLeft, ChevronRight, AlertCircle, Check, Download
} from 'lucide-react';
import joursFerieService, { JourFerie, CreateJourFerieData, UpdateJourFerieData } from '../../services/joursFerieService';

type TypeJourFerie = 'FEDERAL' | 'PROVINCIAL' | 'ORGANISATIONNEL';

interface FormData {
  date: string;
  nom: string;
  description: string;
  type: TypeJourFerie;
}

const initialFormData: FormData = {
  date: '',
  nom: '',
  description: '',
  type: 'FEDERAL',
};

const typeLabels: Record<TypeJourFerie, string> = {
  FEDERAL: 'Fédéral',
  PROVINCIAL: 'Provincial',
  ORGANISATIONNEL: 'Organisationnel',
};

const typeColors: Record<TypeJourFerie, string> = {
  FEDERAL: 'bg-red-100 text-red-800 border-red-200',
  PROVINCIAL: 'bg-blue-100 text-blue-800 border-blue-200',
  ORGANISATIONNEL: 'bg-purple-100 text-purple-800 border-purple-200',
};

export default function JoursFeriesManagement() {
  const [joursFeries, setJoursFeries] = useState<JourFerie[]>([]);
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // État du formulaire
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // État pour le pré-remplissage
  const [preremplissageEnCours, setPreremplissageEnCours] = useState(false);

  // Charger les jours fériés
  const chargerJoursFeries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await joursFerieService.obtenirTous(anneeSelectionnee);
      setJoursFeries(data);
    } catch (err: any) {
      setError(err.response?.data?.erreur || 'Erreur lors du chargement des jours fériés');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerJoursFeries();
  }, [anneeSelectionnee]);

  // Gestion du formulaire
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setError(null);
    
    try {
      if (editingId) {
        // Mise à jour
        await joursFerieService.mettreAJour(editingId, {
          date: formData.date,
          nom: formData.nom,
          description: formData.description || undefined,
          type: formData.type,
        } as UpdateJourFerieData);
        setSuccess('Jour férié mis à jour avec succès');
      } else {
        // Création
        await joursFerieService.creer({
          date: formData.date,
          nom: formData.nom,
          description: formData.description || undefined,
          type: formData.type,
        } as CreateJourFerieData);
        setSuccess('Jour férié créé avec succès');
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData(initialFormData);
      chargerJoursFeries();
    } catch (err: any) {
      setError(err.response?.data?.erreur || 'Erreur lors de la sauvegarde');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEdit = (jf: JourFerie) => {
    setFormData({
      date: jf.date.split('T')[0],
      nom: jf.nom,
      description: jf.description || '',
      type: jf.type,
    });
    setEditingId(jf.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce jour férié ?')) return;
    
    try {
      await joursFerieService.supprimer(id);
      setSuccess('Jour férié supprimé avec succès');
      chargerJoursFeries();
    } catch (err: any) {
      setError(err.response?.data?.erreur || 'Erreur lors de la suppression');
    }
  };

  const handleToggleActif = async (jf: JourFerie) => {
    try {
      await joursFerieService.mettreAJour(jf.id, { actif: !jf.actif });
      chargerJoursFeries();
    } catch (err: any) {
      setError(err.response?.data?.erreur || 'Erreur lors de la mise à jour');
    }
  };

  const handlePreremplir = async () => {
    if (!confirm(`Voulez-vous pré-remplir les jours fériés fédéraux pour ${anneeSelectionnee} ?`)) return;
    
    setPreremplissageEnCours(true);
    setError(null);
    
    try {
      const result = await joursFerieService.preremplirAnnee(anneeSelectionnee);
      setSuccess(`${result.crees} jours fériés créés, ${result.ignores} ignorés (déjà existants)`);
      chargerJoursFeries();
    } catch (err: any) {
      setError(err.response?.data?.erreur || 'Erreur lors du pré-remplissage');
    } finally {
      setPreremplissageEnCours(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Nom', 'Description', 'Type', 'Actif'];
    const rows = joursFeries.map(jf => [
      jf.date.split('T')[0],
      jf.nom,
      jf.description || '',
      typeLabels[jf.type],
      jf.actif ? 'Oui' : 'Non',
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jours-feries-${anneeSelectionnee}.csv`;
    a.click();
  };

  const anneeActuelle = new Date().getFullYear();
  const anneesDisponibles = [anneeActuelle - 1, anneeActuelle, anneeActuelle + 1, anneeActuelle + 2, anneeActuelle + 3];

  // Regrouper par mois pour affichage calendrier
  const joursFeriesParMois = joursFeries.reduce((acc, jf) => {
    const mois = new Date(jf.date).getMonth();
    if (!acc[mois]) acc[mois] = [];
    acc[mois].push(jf);
    return acc;
  }, {} as Record<number, JourFerie[]>);

  const nomsMois = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Effacer messages après 5 secondes
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-red-600" />
            Gestion des jours fériés
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configurez les jours fériés pour le calcul des disponibilités
          </p>
        </div>
        
        {/* Sélecteur d'année */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnneeSelectionnee(a => a - 1)}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Année précédente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <select
            value={anneeSelectionnee}
            onChange={(e) => setAnneeSelectionnee(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg font-medium text-lg"
          >
            {anneesDisponibles.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          
          <button
            onClick={() => setAnneeSelectionnee(a => a + 1)}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Année suivante"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            setFormData(initialFormData);
            setEditingId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter un jour férié
        </button>
        
        <button
          onClick={handlePreremplir}
          disabled={preremplissageEnCours}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${preremplissageEnCours ? 'animate-spin' : ''}`} />
          Pré-remplir {anneeSelectionnee}
        </button>
        
        <button
          onClick={handleExportCSV}
          disabled={joursFeries.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Exporter CSV
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-4">
            {editingId ? 'Modifier le jour férié' : 'Nouveau jour férié'}
          </h3>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom *
              </label>
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleInputChange}
                required
                placeholder="Ex: Fête du Canada"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="FEDERAL">Fédéral</option>
                <option value="PROVINCIAL">Provincial</option>
                <option value="ORGANISATIONNEL">Organisationnel</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Optionnel"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div className="md:col-span-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData(initialFormData);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {formSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
        </div>
      ) : joursFeries.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun jour férié configuré pour {anneeSelectionnee}</p>
          <p className="text-sm text-gray-400 mt-1">
            Utilisez le bouton "Pré-remplir" pour ajouter les jours fériés officiels
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {nomsMois.map((nomMois, index) => {
            const joursDuMois = joursFeriesParMois[index] || [];
            if (joursDuMois.length === 0) return null;
            
            return (
              <div key={index} className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h4 className="font-medium text-gray-900">{nomMois}</h4>
                  <span className="text-xs text-gray-500">{joursDuMois.length} jour(s) férié(s)</span>
                </div>
                <div className="divide-y">
                  {joursDuMois.map(jf => (
                    <div 
                      key={jf.id} 
                      className={`p-3 ${!jf.actif ? 'bg-gray-50 opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">
                              {new Date(jf.date).getDate()}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[jf.type]}`}>
                              {typeLabels[jf.type]}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1 truncate" title={jf.nom}>
                            {jf.nom}
                          </p>
                          {jf.description && (
                            <p className="text-xs text-gray-500 truncate" title={jf.description}>
                              {jf.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleToggleActif(jf)}
                            className={`p-1 rounded ${jf.actif ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                            title={jf.actif ? 'Désactiver' : 'Activer'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(jf)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(jf.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Résumé */}
      {joursFeries.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total:</span>{' '}
              <span className="font-medium">{joursFeries.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Actifs:</span>{' '}
              <span className="font-medium text-green-600">
                {joursFeries.filter(jf => jf.actif).length}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Fédéraux:</span>{' '}
              <span className="font-medium text-red-600">
                {joursFeries.filter(jf => jf.type === 'FEDERAL').length}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Provinciaux:</span>{' '}
              <span className="font-medium text-blue-600">
                {joursFeries.filter(jf => jf.type === 'PROVINCIAL').length}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Organisationnels:</span>{' '}
              <span className="font-medium text-purple-600">
                {joursFeries.filter(jf => jf.type === 'ORGANISATIONNEL').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
