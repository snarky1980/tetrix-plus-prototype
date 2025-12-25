import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { useToast } from '../../contexts/ToastContext';
import { Utilisateur, Division, Traducteur } from '../../types';
import { utilisateurService, divisionService, CreateUtilisateurData } from '../../services/utilisateurService';
import { traducteurService } from '../../services/traducteurService';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type Role = 'ADMIN' | 'CONSEILLER' | 'GESTIONNAIRE' | 'TRADUCTEUR';

interface RoleTemplate {
  role: Role;
  label: string;
  icon: string;
  description: string;
  color: string;
  defaultDivisions: 'all' | 'none' | 'select';
  permissions: {
    peutLire: boolean;
    peutEcrire: boolean;
    peutGerer: boolean;
  };
}

interface UserFormData {
  prenom: string;
  nom: string;
  email: string;
  motDePasse: string;
  role: Role;
  divisions: string[];
  traducteurId?: string;
}

interface QuickUserCreationProps {
  ouvert: boolean;
  onFermer: () => void;
  onSuccess: () => void;
  utilisateurACopier?: Utilisateur;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_PASSWORD = 'password123';
const EMAIL_DOMAIN = '@tetrix.com';

const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    role: 'ADMIN',
    label: 'Administrateur',
    icon: '👑',
    description: 'Accès complet au système, gestion des utilisateurs et paramètres',
    color: 'bg-red-100 text-red-800 border-red-200',
    defaultDivisions: 'all',
    permissions: { peutLire: true, peutEcrire: true, peutGerer: true },
  },
  {
    role: 'GESTIONNAIRE',
    label: 'Gestionnaire',
    icon: '👔',
    description: 'Gère les équipes et la planification des divisions assignées',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    defaultDivisions: 'all',
    permissions: { peutLire: true, peutEcrire: true, peutGerer: true },
  },
  {
    role: 'CONSEILLER',
    label: 'Conseiller',
    icon: '📋',
    description: 'Planification globale, création et assignation des tâches',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    defaultDivisions: 'all',
    permissions: { peutLire: true, peutEcrire: true, peutGerer: false },
  },
  {
    role: 'TRADUCTEUR',
    label: 'Traducteur',
    icon: '🔤',
    description: 'Vue personnelle, gestion de sa disponibilité et ses tâches',
    color: 'bg-green-100 text-green-800 border-green-200',
    defaultDivisions: 'none',
    permissions: { peutLire: true, peutEcrire: false, peutGerer: false },
  },
];

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Génère un email à partir du prénom et nom
 */
const generateEmail = (prenom: string, nom: string): string => {
  if (!prenom && !nom) return '';
  
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
      .replace(/[^a-z0-9]/g, '') // Supprime les caractères spéciaux
      .trim();

  const prenomNorm = normalize(prenom);
  const nomNorm = normalize(nom);

  if (prenomNorm && nomNorm) {
    return `${prenomNorm}.${nomNorm}${EMAIL_DOMAIN}`;
  }
  return `${prenomNorm || nomNorm}${EMAIL_DOMAIN}`;
};

/**
 * Génère un mot de passe aléatoire
 */
const generatePassword = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export const QuickUserCreation: React.FC<QuickUserCreationProps> = ({
  ouvert,
  onFermer,
  onSuccess,
  utilisateurACopier,
}) => {
  const { addToast } = useToast();
  
  // États
  const [step, setStep] = useState<'role' | 'details' | 'divisions' | 'review'>('role');
  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [autoEmail, setAutoEmail] = useState(true);
  const [useDefaultPassword, setUseDefaultPassword] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  // Formulaire
  const [formData, setFormData] = useState<UserFormData>({
    prenom: '',
    nom: '',
    email: '',
    motDePasse: DEFAULT_PASSWORD,
    role: 'CONSEILLER',
    divisions: [],
    traducteurId: undefined,
  });

  // Charger les données
  useEffect(() => {
    if (ouvert) {
      loadData();
    }
  }, [ouvert]);

  // Pré-remplir si on copie un utilisateur
  useEffect(() => {
    if (utilisateurACopier && ouvert) {
      setFormData({
        prenom: '',
        nom: '',
        email: '',
        motDePasse: DEFAULT_PASSWORD,
        role: utilisateurACopier.role,
        divisions: utilisateurACopier.divisionAccess?.map(d => d.divisionId) || [],
        traducteurId: undefined,
      });
      setStep('details');
      setAutoEmail(true);
      setUseDefaultPassword(true);
    }
  }, [utilisateurACopier, ouvert]);

  // Reset à la fermeture
  useEffect(() => {
    if (!ouvert) {
      setStep('role');
      setFormData({
        prenom: '',
        nom: '',
        email: '',
        motDePasse: DEFAULT_PASSWORD,
        role: 'CONSEILLER',
        divisions: [],
        traducteurId: undefined,
      });
      setAutoEmail(true);
      setUseDefaultPassword(true);
    }
  }, [ouvert]);

  // Auto-générer l'email
  useEffect(() => {
    if (autoEmail) {
      const newEmail = generateEmail(formData.prenom, formData.nom);
      setFormData(prev => ({ ...prev, email: newEmail }));
    }
  }, [formData.prenom, formData.nom, autoEmail]);

  const loadData = async () => {
    try {
      const [divsData, tradsData] = await Promise.all([
        divisionService.obtenirDivisions(true),
        traducteurService.obtenirTraducteurs(),
      ]);
      setDivisions(divsData);
      setTraducteurs(tradsData.filter((t: Traducteur) => t.actif && !t.utilisateurId));
    } catch (err) {
      console.error('Erreur chargement données:', err);
    }
  };

  // Template du rôle sélectionné
  const selectedTemplate = useMemo(
    () => ROLE_TEMPLATES.find(t => t.role === formData.role),
    [formData.role]
  );

  // Sélectionner un rôle
  const handleSelectRole = (role: Role) => {
    const template = ROLE_TEMPLATES.find(t => t.role === role);
    let defaultDivs: string[] = [];
    
    if (template?.defaultDivisions === 'all') {
      defaultDivs = divisions.map(d => d.id);
    }
    
    setFormData(prev => ({
      ...prev,
      role,
      divisions: defaultDivs,
      traducteurId: undefined,
    }));
    setStep('details');
  };

  // Validation du formulaire
  const isFormValid = useMemo(() => {
    if (!formData.email || !formData.motDePasse) return false;
    if (formData.motDePasse.length < 6) return false;
    if (!formData.email.includes('@')) return false;
    return true;
  }, [formData]);

  // Soumettre
  const handleSubmit = async () => {
    if (!isFormValid) return;
    
    setLoading(true);
    try {
      // Créer l'utilisateur
      const userData: CreateUtilisateurData = {
        email: formData.email,
        motDePasse: formData.motDePasse,
        nom: formData.nom || undefined,
        prenom: formData.prenom || undefined,
        role: formData.role,
        divisions: formData.divisions,
      };

      const newUser = await utilisateurService.creerUtilisateur(userData);

      // Configurer les accès aux divisions
      if (formData.divisions.length > 0 && selectedTemplate) {
        const acces = formData.divisions.map(divId => ({
          divisionId: divId,
          ...selectedTemplate.permissions,
        }));
        await utilisateurService.gererAccesDivisions(newUser.id, acces);
      }

      addToast(`Utilisateur ${formData.email} créé avec succès!`, 'success');
      onSuccess();
      onFermer();
    } catch (err: any) {
      const message = err.response?.data?.erreur || 'Erreur lors de la création';
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle toutes les divisions
  const toggleAllDivisions = () => {
    if (formData.divisions.length === divisions.length) {
      setFormData(prev => ({ ...prev, divisions: [] }));
    } else {
      setFormData(prev => ({ ...prev, divisions: divisions.map(d => d.id) }));
    }
  };

  // Render des étapes
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {['role', 'details', 'divisions', 'review'].map((s, i) => {
        const steps = ['role', 'details', 'divisions', 'review'];
        const currentIndex = steps.indexOf(step);
        const isActive = s === step;
        const isPast = i < currentIndex;
        
        return (
          <React.Fragment key={s}>
            <button
              onClick={() => isPast && setStep(s as typeof step)}
              disabled={!isPast}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                ${isActive ? 'bg-blue-600 text-white scale-110' : ''}
                ${isPast ? 'bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200' : ''}
                ${!isActive && !isPast ? 'bg-gray-100 text-gray-400' : ''}
              `}
            >
              {isPast ? '✓' : i + 1}
            </button>
            {i < 3 && (
              <div className={`w-12 h-0.5 ${i < currentIndex ? 'bg-blue-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // Étape 1: Sélection du rôle
  const renderRoleSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Choisir le type de compte</h3>
        <p className="text-sm text-gray-500 mt-1">
          Sélectionnez le rôle qui correspond le mieux aux responsabilités de l'utilisateur
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ROLE_TEMPLATES.map(template => (
          <button
            key={template.role}
            onClick={() => handleSelectRole(template.role)}
            className={`
              p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] hover:shadow-md
              ${formData.role === template.role 
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{template.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{template.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${template.color}`}>
                    {template.role}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                <div className="flex gap-2 mt-2">
                  {template.permissions.peutLire && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Lecture</span>
                  )}
                  {template.permissions.peutEcrire && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Écriture</span>
                  )}
                  {template.permissions.peutGerer && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Gestion</span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {utilisateurACopier && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            📋 Vous copiez le profil de <strong>{utilisateurACopier.email}</strong>
          </p>
        </div>
      )}
    </div>
  );

  // Étape 2: Détails de l'utilisateur
  const renderDetails = () => (
    <div className="space-y-5">
      <div className="text-center mb-4">
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${selectedTemplate?.color}`}>
          {selectedTemplate?.icon} {selectedTemplate?.label}
        </span>
      </div>

      {/* Nom et Prénom */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
          <Input
            value={formData.prenom}
            onChange={e => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
            placeholder="Jean"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
          <Input
            value={formData.nom}
            onChange={e => setFormData(prev => ({ ...prev, nom: e.target.value }))}
            placeholder="Dupont"
          />
        </div>
      </div>

      {/* Email avec auto-génération */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Email <span className="text-red-500">*</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={autoEmail}
              onChange={e => setAutoEmail(e.target.checked)}
              className="rounded text-blue-600 w-3.5 h-3.5"
            />
            Générer automatiquement
          </label>
        </div>
        <Input
          type="email"
          value={formData.email}
          onChange={e => {
            setAutoEmail(false);
            setFormData(prev => ({ ...prev, email: e.target.value }));
          }}
          placeholder="email@tetrix.com"
          className={autoEmail && formData.email ? 'bg-blue-50 border-blue-200' : ''}
        />
        {autoEmail && formData.email && (
          <p className="text-xs text-blue-600 mt-1">✨ Email généré automatiquement</p>
        )}
      </div>

      {/* Mot de passe */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Mot de passe <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={useDefaultPassword}
                onChange={e => {
                  setUseDefaultPassword(e.target.checked);
                  if (e.target.checked) {
                    setFormData(prev => ({ ...prev, motDePasse: DEFAULT_PASSWORD }));
                  }
                }}
                className="rounded text-blue-600 w-3.5 h-3.5"
              />
              Par défaut
            </label>
            <button
              type="button"
              onClick={() => {
                setUseDefaultPassword(false);
                setFormData(prev => ({ ...prev, motDePasse: generatePassword() }));
              }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              🎲 Générer
            </button>
          </div>
        </div>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={formData.motDePasse}
            onChange={e => {
              setUseDefaultPassword(false);
              setFormData(prev => ({ ...prev, motDePasse: e.target.value }));
            }}
            placeholder="Minimum 6 caractères"
            className={`pr-20 ${useDefaultPassword ? 'bg-green-50 border-green-200' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            {showPassword ? '🙈 Masquer' : '👁️ Voir'}
          </button>
        </div>
        {useDefaultPassword && (
          <p className="text-xs text-green-600 mt-1">🔒 Mot de passe par défaut: {DEFAULT_PASSWORD}</p>
        )}
      </div>

      {/* Lier à un profil traducteur (si role = TRADUCTEUR) */}
      {formData.role === 'TRADUCTEUR' && traducteurs.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lier à un profil traducteur existant
          </label>
          <Select
            value={formData.traducteurId || ''}
            onChange={e => setFormData(prev => ({ ...prev, traducteurId: e.target.value || undefined }))}
          >
            <option value="">Créer un nouveau profil plus tard...</option>
            {traducteurs.map(t => (
              <option key={t.id} value={t.id}>
                {t.nom} - {t.divisions?.join(', ') || 'Sans division'}
              </option>
            ))}
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            Optionnel : liez ce compte à un profil traducteur déjà existant
          </p>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep('role')}>
          ← Retour
        </Button>
        <Button
          onClick={() => setStep('divisions')}
          disabled={!formData.email || formData.motDePasse.length < 6}
        >
          Continuer →
        </Button>
      </div>
    </div>
  );

  // Étape 3: Sélection des divisions
  const renderDivisions = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Accès aux divisions</h3>
        <p className="text-sm text-gray-500 mt-1">
          Sélectionnez les divisions auxquelles l'utilisateur aura accès
        </p>
      </div>

      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="text-sm">
          <span className="font-medium">{formData.divisions.length}</span>
          <span className="text-gray-500"> / {divisions.length} divisions sélectionnées</span>
        </div>
        <Button
          variant="outline"
          onClick={toggleAllDivisions}
          className="text-sm py-1"
        >
          {formData.divisions.length === divisions.length ? 'Tout désélectionner' : 'Tout sélectionner'}
        </Button>
      </div>

      <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
        {divisions.map(div => {
          const isSelected = formData.divisions.includes(div.id);
          return (
            <label
              key={div.id}
              className={`
                flex items-center gap-3 p-3 cursor-pointer transition-colors
                ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
              `}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={e => {
                  if (e.target.checked) {
                    setFormData(prev => ({
                      ...prev,
                      divisions: [...prev.divisions, div.id],
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      divisions: prev.divisions.filter(id => id !== div.id),
                    }));
                  }
                }}
                className="w-4 h-4 rounded text-blue-600"
              />
              <div className="flex-1">
                <span className="font-medium text-gray-900">{div.nom}</span>
                <span className="ml-2 text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                  {div.code}
                </span>
              </div>
              {isSelected && selectedTemplate && (
                <div className="flex gap-1">
                  {selectedTemplate.permissions.peutLire && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">R</span>
                  )}
                  {selectedTemplate.permissions.peutEcrire && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">W</span>
                  )}
                  {selectedTemplate.permissions.peutGerer && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">G</span>
                  )}
                </div>
              )}
            </label>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep('details')}>
          ← Retour
        </Button>
        <Button onClick={() => setStep('review')}>
          Réviser →
        </Button>
      </div>
    </div>
  );

  // Étape 4: Révision finale
  const renderReview = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Vérification finale</h3>
        <p className="text-sm text-gray-500 mt-1">
          Vérifiez les informations avant de créer le compte
        </p>
      </div>

      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 space-y-4">
        {/* En-tête avec rôle */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
          <span className="text-3xl">{selectedTemplate?.icon}</span>
          <div>
            <h4 className="font-semibold text-gray-900">
              {formData.prenom && formData.nom 
                ? `${formData.prenom} ${formData.nom}`
                : formData.email
              }
            </h4>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${selectedTemplate?.color}`}>
              {selectedTemplate?.label}
            </span>
          </div>
        </div>

        {/* Détails */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Email</span>
            <p className="font-medium text-gray-900">{formData.email}</p>
          </div>
          <div>
            <span className="text-gray-500">Mot de passe</span>
            <p className="font-medium text-gray-900 font-mono">
              {showPassword ? formData.motDePasse : '••••••••'}
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="ml-2 text-blue-600 text-xs"
              >
                {showPassword ? 'masquer' : 'voir'}
              </button>
            </p>
          </div>
        </div>

        {/* Divisions */}
        <div>
          <span className="text-sm text-gray-500">Divisions ({formData.divisions.length})</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {formData.divisions.length === 0 ? (
              <span className="text-sm text-gray-400 italic">Aucune division</span>
            ) : formData.divisions.length === divisions.length ? (
              <Badge variant="info">Toutes les divisions</Badge>
            ) : (
              formData.divisions.slice(0, 5).map(divId => {
                const div = divisions.find(d => d.id === divId);
                return div ? (
                  <span key={divId} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                    {div.code}
                  </span>
                ) : null;
              })
            )}
            {formData.divisions.length > 5 && (
              <span className="text-xs text-gray-500">+{formData.divisions.length - 5} autres</span>
            )}
          </div>
        </div>

        {/* Permissions */}
        {selectedTemplate && (
          <div>
            <span className="text-sm text-gray-500">Permissions</span>
            <div className="flex gap-2 mt-1">
              <span className={`text-xs px-2 py-1 rounded ${selectedTemplate.permissions.peutLire ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                👁️ Lecture
              </span>
              <span className={`text-xs px-2 py-1 rounded ${selectedTemplate.permissions.peutEcrire ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400'}`}>
                ✏️ Écriture
              </span>
              <span className={`text-xs px-2 py-1 rounded ${selectedTemplate.permissions.peutGerer ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
                ⚙️ Gestion
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep('divisions')}>
          ← Retour
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !isFormValid}
          className="bg-green-600 hover:bg-green-700"
        >
          {loading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Création...
            </>
          ) : (
            <>✅ Créer le compte</>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      titre="Créer un nouvel utilisateur"
      ouvert={ouvert}
      onFermer={onFermer}
      wide
    >
      <div className="min-h-[400px]">
        {renderStepIndicator()}
        
        {step === 'role' && renderRoleSelection()}
        {step === 'details' && renderDetails()}
        {step === 'divisions' && renderDivisions()}
        {step === 'review' && renderReview()}
      </div>
    </Modal>
  );
};

// ============================================================================
// COMPOSANT CRÉATION RAPIDE (INLINE)
// ============================================================================

interface QuickCreateInlineProps {
  onCreated: () => void;
}

export const QuickCreateInline: React.FC<QuickCreateInlineProps> = ({ onCreated }) => {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('CONSEILLER');
  const [loading, setLoading] = useState(false);

  const handleQuickCreate = async () => {
    if (!email) return;
    
    setLoading(true);
    try {
      await utilisateurService.creerUtilisateur({
        email,
        motDePasse: DEFAULT_PASSWORD,
        role,
      });
      addToast(`Compte créé: ${email} (mdp: ${DEFAULT_PASSWORD})`, 'success');
      setEmail('');
      onCreated();
    } catch (err: any) {
      addToast(err.response?.data?.erreur || 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
      <Input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="email@tetrix.com"
        className="flex-1"
        onKeyDown={e => e.key === 'Enter' && handleQuickCreate()}
      />
      <Select
        value={role}
        onChange={e => setRole(e.target.value as Role)}
        className="w-40"
      >
        <option value="CONSEILLER">Conseiller</option>
        <option value="GESTIONNAIRE">Gestionnaire</option>
        <option value="ADMIN">Admin</option>
        <option value="TRADUCTEUR">Traducteur</option>
      </Select>
      <Button onClick={handleQuickCreate} disabled={loading || !email}>
        {loading ? '...' : '+ Créer'}
      </Button>
    </div>
  );
};

export default QuickUserCreation;
