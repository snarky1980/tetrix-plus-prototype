import React, { useState, useEffect, useMemo } from 'react';
import {
  liaisonService,
  LiaisonReviseur,
  TraducteurInfo,
  CategorieTraducteur,
  ResumeLiaisons,
} from '../../services/liaisonService';
import { ConfirmDialog } from '../ui/ConfirmDialog';

// Icônes SVG inline pour éviter les dépendances
const IconLink = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const IconUsers = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const IconStar = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const IconWarning = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const IconPlus = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

interface CategorieBadgeProps {
  categorie: CategorieTraducteur;
  size?: 'sm' | 'md' | 'lg';
}

const CategorieBadge: React.FC<CategorieBadgeProps> = ({ categorie, size = 'md' }) => {
  const config = {
    TR01: {
      label: 'TR-01',
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-300',
    },
    TR02: {
      label: 'TR-02',
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-300',
    },
    TR03: {
      label: 'TR-03',
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
    },
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const { label, bg, text, border } = config[categorie];

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${bg} ${text} ${border} ${sizeClasses[size]}`}>
      {label}
    </span>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]} transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs mt-1 opacity-70">{subtitle}</p>}
        </div>
        <div className="opacity-60">{icon}</div>
      </div>
    </div>
  );
};

interface LiaisonCardProps {
  liaison: LiaisonReviseur;
  mode: 'traducteur' | 'reviseur';
  onRemove: (id: string) => void;
}

const LiaisonCard: React.FC<LiaisonCardProps> = ({ liaison, mode, onRemove }) => {
  const person = mode === 'traducteur' ? liaison.reviseur : liaison.traducteur;
  if (!person) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border hover:border-indigo-300 transition-all group">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
          {person.nom.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{person.nom}</span>
            {liaison.estPrincipal && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                <IconStar /> Principal
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <CategorieBadge categorie={person.categorie} size="sm" />
            <span className="text-xs text-gray-500">{person.divisions?.join(', ')}</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => onRemove(liaison.id)}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
        title="Retirer cette liaison"
      >
        <IconTrash />
      </button>
    </div>
  );
};

interface AddLiaisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  traducteurs: TraducteurInfo[];
  reviseurs: TraducteurInfo[];
  onAdd: (traducteurId: string, reviseurId: string, estPrincipal: boolean, notes: string) => void;
}

const AddLiaisonModal: React.FC<AddLiaisonModalProps> = ({
  isOpen,
  onClose,
  traducteurs,
  reviseurs,
  onAdd,
}) => {
  const [selectedTraducteur, setSelectedTraducteur] = useState('');
  const [selectedReviseur, setSelectedReviseur] = useState('');
  const [estPrincipal, setEstPrincipal] = useState(true);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTraducteur && selectedReviseur) {
      onAdd(selectedTraducteur, selectedReviseur, estPrincipal, notes);
      setSelectedTraducteur('');
      setSelectedReviseur('');
      setEstPrincipal(true);
      setNotes('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b bg-gradient-to-r from-indigo-500 to-purple-600">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <IconLink /> Créer une liaison
          </h2>
          <p className="text-indigo-100 text-sm mt-1">Liez un traducteur à son réviseur attitré</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Traducteur (TR01/TR02)
            </label>
            <select
              value={selectedTraducteur}
              onChange={(e) => setSelectedTraducteur(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
              required
            >
              <option value="">Sélectionner un traducteur</option>
              {traducteurs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom} ({t.categorie}) - {t.divisions?.join(', ')}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Réviseur (TR03)
            </label>
            <select
              value={selectedReviseur}
              onChange={(e) => setSelectedReviseur(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
              required
            >
              <option value="">Sélectionner un réviseur</option>
              {reviseurs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nom} - {r.divisions?.join(', ')}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <input
              type="checkbox"
              id="estPrincipal"
              checked={estPrincipal}
              onChange={(e) => setEstPrincipal(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="estPrincipal" className="flex items-center gap-2 text-sm text-gray-700">
              <IconStar />
              Réviseur principal (attitré)
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 resize-none"
              placeholder="Informations complémentaires..."
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!selectedTraducteur || !selectedReviseur}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Créer la liaison
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface TraducteurRowProps {
  traducteur: TraducteurInfo;
  liaisons: LiaisonReviseur[];
  onRemoveLiaison: (liaisonId: string) => void;
  onUpdateCategorie: (traducteurId: string, categorie: CategorieTraducteur) => void;
}

const TraducteurRow: React.FC<TraducteurRowProps> = ({
  traducteur,
  liaisons,
  onRemoveLiaison,
  onUpdateCategorie,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const principalReviseur = liaisons.find((l) => l.estPrincipal)?.reviseur;
  const autresReviseurs = liaisons.filter((l) => !l.estPrincipal);

  return (
    <div className="bg-white rounded-xl border hover:shadow-md transition-all overflow-hidden">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
              {traducteur.nom.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{traducteur.nom}</h3>
              <div className="flex items-center gap-2 mt-1">
                <CategorieBadge categorie={traducteur.categorie} size="sm" />
                <span className="text-xs text-gray-500">{traducteur.divisions?.join(', ')}</span>
                {traducteur.necessiteRevision && (
                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                    Révision requise
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {principalReviseur ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg">
                <IconCheck />
                <span className="text-sm font-medium">{principalReviseur.nom}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg">
                <IconWarning />
                <span className="text-sm font-medium">Sans réviseur</span>
              </div>
            )}
            
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t bg-gray-50">
          <div className="pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Changer la catégorie</h4>
            <div className="flex gap-2">
              {(['TR01', 'TR02', 'TR03'] as CategorieTraducteur[]).map((cat) => (
                <button
                  key={cat}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateCategorie(traducteur.id, cat);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    traducteur.categorie === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border hover:border-indigo-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          {liaisons.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Réviseurs assignés</h4>
              <div className="space-y-2">
                {liaisons.map((liaison) => (
                  <LiaisonCard
                    key={liaison.id}
                    liaison={liaison}
                    mode="traducteur"
                    onRemove={onRemoveLiaison}
                  />
                ))}
              </div>
            </div>
          )}
          
          {autresReviseurs.length > 0 && (
            <div className="text-xs text-gray-500 pt-2">
              + {autresReviseurs.length} réviseur(s) supplémentaire(s)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const LiaisonManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resume, setResume] = useState<ResumeLiaisons | null>(null);
  const [traducteurs, setTraducteurs] = useState<TraducteurInfo[]>([]);
  const [reviseurs, setReviseurs] = useState<TraducteurInfo[]>([]);
  const [liaisons, setLiaisons] = useState<Map<string, LiaisonReviseur[]>>(new Map());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCategorie, setFilterCategorie] = useState<CategorieTraducteur | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const chargerDonnees = async () => {
    try {
      setLoading(true);
      setError(null);

      const [resumeData, traducteursData, reviseursData] = await Promise.all([
        liaisonService.obtenirResume(),
        liaisonService.obtenirTraducteursNecessitantRevision(),
        liaisonService.obtenirReviseursPotentiels(),
      ]);

      setResume(resumeData);
      setTraducteurs(traducteursData);
      setReviseurs(reviseursData);

      // Charger les liaisons pour chaque traducteur
      const liaisonsMap = new Map<string, LiaisonReviseur[]>();
      await Promise.all(
        traducteursData.map(async (t) => {
          const l = await liaisonService.obtenirLiaisonsTraducteur(t.id);
          liaisonsMap.set(t.id, l);
        })
      );
      setLiaisons(liaisonsMap);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  const handleAddLiaison = async (
    traducteurId: string,
    reviseurId: string,
    estPrincipal: boolean,
    notes: string
  ) => {
    try {
      await liaisonService.creerLiaison({
        traducteurId,
        reviseurId,
        estPrincipal,
        notes: notes || undefined,
      });
      await chargerDonnees();
    } catch (err) {
      console.error('Erreur lors de la création de la liaison:', err);
    }
  };

  const [confirmDeleteLiaison, setConfirmDeleteLiaison] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  const handleRemoveLiaison = async (liaisonId: string) => {
    setConfirmDeleteLiaison({ isOpen: true, id: liaisonId });
  };

  const executerSuppressionLiaison = async () => {
    if (!confirmDeleteLiaison.id) return;
    try {
      await liaisonService.supprimerLiaison(confirmDeleteLiaison.id);
      await chargerDonnees();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
    } finally {
      setConfirmDeleteLiaison({ isOpen: false, id: null });
    }
  };

  const handleUpdateCategorie = async (traducteurId: string, categorie: CategorieTraducteur) => {
    try {
      await liaisonService.mettreAJourCategorie(traducteurId, categorie);
      await chargerDonnees();
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
    }
  };

  const filteredTraducteurs = useMemo(() => {
    return traducteurs.filter((t) => {
      const matchCategorie = filterCategorie === 'all' || t.categorie === filterCategorie;
      const matchSearch =
        searchTerm === '' ||
        t.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.divisions?.some(d => d.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCategorie && matchSearch;
    });
  }, [traducteurs, filterCategorie, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Chargement des liaisons...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 text-red-700 p-6 rounded-xl max-w-md text-center">
          <IconWarning />
          <p className="mt-2">{error}</p>
          <button
            onClick={chargerDonnees}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Barre de navigation */}
        <div className="mb-6 flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-lg p-4">
          <button
            onClick={() => window.location.href = '/tetrix-plus-prototype/conseiller'}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Portail Conseiller
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.href = '/tetrix-plus-prototype/conseiller/creation-tache'}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ➕ Nouvelle tâche
            </button>
            <button
              onClick={() => window.location.href = '/tetrix-plus-prototype/planification-globale'}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              📅 Planification
            </button>
            <button
              onClick={() => window.location.href = '/tetrix-plus-prototype/statistiques-productivite'}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              📊 Statistiques
            </button>
            <button
              onClick={() => window.location.href = '/tetrix-plus-prototype/conflict-resolution'}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ⚠️ Conflits
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl">
                  <IconUsers />
                </span>
                Liaisons Traducteur-Réviseur
              </h1>
              <p className="mt-2 text-gray-600">
                Gérez les liaisons entre traducteurs (TR01/TR02) et réviseurs (TR03)
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-medium"
            >
              <IconPlus />
              Nouvelle liaison
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {resume && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard
              title="TR01 Débutants"
              value={resume.statistiques.tr01}
              icon={<IconUsers />}
              color="amber"
              subtitle="Révision obligatoire"
            />
            <StatCard
              title="TR02 Formation"
              value={resume.statistiques.tr02NecessiteRevision}
              icon={<IconUsers />}
              color="blue"
              subtitle="Révision requise"
            />
            <StatCard
              title="TR02 Autonomes"
              value={resume.statistiques.tr02Autonome}
              icon={<IconUsers />}
              color="blue"
            />
            <StatCard
              title="TR03 Réviseurs"
              value={resume.statistiques.tr03}
              icon={<IconStar />}
              color="green"
            />
            <StatCard
              title="Liaisons actives"
              value={resume.statistiques.liaisonsActives}
              icon={<IconLink />}
              color="purple"
            />
            <StatCard
              title="Liaisons attitrées"
              value={resume.statistiques.liaisonsAttitres}
              icon={<IconLink />}
              color="blue"
              subtitle="Attitrés"
            />
            <StatCard
              title="Liaisons ponctuelles"
              value={resume.statistiques.liaisonsPonctuelles}
              icon={<IconLink />}
              color="purple"
              subtitle="Affectations ponctuelles"
            />
            <StatCard
              title="Couverture obligatoire"
              value={resume.statistiques.tauxCouvertureObligatoire}
              icon={<IconCheck />}
              color="green"
              subtitle="% TR01/TR02 couverts"
            />
            <StatCard
              title="Sans réviseur"
              value={resume.statistiques.sansReviseur}
              icon={<IconWarning />}
              color="amber"
              subtitle="TR01/TR02 à couvrir"
            />
          </div>
        )}

        {/* Alerts */}
        {resume && resume.traducteursSansReviseur.length > 0 && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
              <IconWarning />
              Traducteurs sans réviseur attitré
            </div>
            <div className="flex flex-wrap gap-2">
              {resume.traducteursSansReviseur.map((t) => (
                <span
                  key={t.id}
                  className="px-3 py-1 bg-white border border-red-200 rounded-lg text-sm text-red-800"
                >
                  {t.nom} ({t.categorie})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Rechercher un traducteur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'TR01', 'TR02', 'TR03'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategorie(cat as CategorieTraducteur | 'all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterCategorie === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat === 'all' ? 'Tous' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Traducteurs List */}
        <div className="space-y-4">
          {filteredTraducteurs.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
              <IconUsers />
              <p className="mt-4">Aucun traducteur ne correspond aux critères</p>
            </div>
          ) : (
            filteredTraducteurs.map((traducteur) => (
              <TraducteurRow
                key={traducteur.id}
                traducteur={traducteur}
                liaisons={liaisons.get(traducteur.id) || []}
                onRemoveLiaison={handleRemoveLiaison}
                onUpdateCategorie={handleUpdateCategorie}
              />
            ))
          )}
        </div>
      </div>

      <AddLiaisonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        traducteurs={traducteurs}
        reviseurs={reviseurs}
        onAdd={handleAddLiaison}
      />

      {/* Dialogue de confirmation suppression liaison */}
      <ConfirmDialog
        isOpen={confirmDeleteLiaison.isOpen}
        onClose={() => setConfirmDeleteLiaison({ isOpen: false, id: null })}
        onConfirm={executerSuppressionLiaison}
        title="Supprimer la liaison"
        message="Voulez-vous vraiment supprimer cette liaison traducteur-réviseur ?"
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </div>
  );
};
