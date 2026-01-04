import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FormField } from '../ui/FormField';
import { DataTable } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { SkeletonTable } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { InfoTooltip } from '../ui/Tooltip';
import { useToast } from '../../contexts/ToastContext';
import { Utilisateur, Traducteur } from '../../types';
import { utilisateurService } from '../../services/utilisateurService';
import { traducteurService } from '../../services/traducteurService';
import { QuickUserCreation, QuickCreateInline } from './QuickUserCreation';
import { exporterUtilisateurs } from '../../utils/exportUtils';

export const UserManagement: React.FC = () => {
  const { addToast } = useToast();
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [modalPermissionsOuvert, setModalPermissionsOuvert] = useState(false);
  const [utilisateurSelectionne, setUtilisateurSelectionne] = useState<Utilisateur | undefined>();
  const [confirmDesactiver, setConfirmDesactiver] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });
  const [confirmSupprimer, setConfirmSupprimer] = useState<{ isOpen: boolean; id: string | null; email: string }>({
    isOpen: false,
    id: null,
    email: ''
  });
  const [quickCreateOuvert, setQuickCreateOuvert] = useState(false);
  const [utilisateurACopier, setUtilisateurACopier] = useState<Utilisateur | undefined>();
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showPlayground, setShowPlayground] = useState(false);
  const [playgroundModal, setPlaygroundModal] = useState(false);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const [usersData, traducsData] = await Promise.all([
        utilisateurService.obtenirUtilisateurs(),
        traducteurService.obtenirTraducteurs(),
      ]);
      setUtilisateurs(usersData);
      setTraducteurs(traducsData);
    } catch (err) {
      console.error('Erreur chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  const handleNouvelUtilisateur = () => {
    setUtilisateurACopier(undefined);
    setQuickCreateOuvert(true);
  };

  const handleCopierUtilisateur = (utilisateur: Utilisateur) => {
    setUtilisateurACopier(utilisateur);
    setQuickCreateOuvert(true);
  };

  const handleEditerUtilisateur = (utilisateur: Utilisateur) => {
    setUtilisateurSelectionne(utilisateur);
    setModalOuvert(true);
  };

  const handleGererPermissions = (utilisateur: Utilisateur) => {
    setUtilisateurSelectionne(utilisateur);
    setModalPermissionsOuvert(true);
  };

  const handleDesactiverUtilisateur = async (id: string) => {
    setConfirmDesactiver({ isOpen: true, id });
  };

  const handleSupprimerUtilisateur = (id: string, email: string) => {
    setConfirmSupprimer({ isOpen: true, id, email });
  };

  const executerDesactivation = async () => {
    if (!confirmDesactiver.id) return;
    try {
      await utilisateurService.mettreAJourUtilisateur(confirmDesactiver.id, { actif: false });
      await chargerDonnees();
      addToast('Utilisateur désactivé avec succès', 'success');
    } catch (err) {
      addToast('Erreur lors de la désactivation de l\'utilisateur', 'error');
    } finally {
      setConfirmDesactiver({ isOpen: false, id: null });
    }
  };

  const executerSuppression = async () => {
    if (!confirmSupprimer.id) return;
    try {
      await utilisateurService.supprimerUtilisateur(confirmSupprimer.id);
      await chargerDonnees();
      addToast('Utilisateur supprimé définitivement', 'success');
    } catch (err) {
      addToast('Erreur lors de la suppression de l\'utilisateur', 'error');
    } finally {
      setConfirmSupprimer({ isOpen: false, id: null, email: '' });
    }
  };

  // Séparer les utilisateurs normaux et playground
  const utilisateursNormaux = utilisateurs.filter(u => !u.isPlayground);
  const utilisateursPlayground = utilisateurs.filter(u => u.isPlayground);

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrateur',
    GESTIONNAIRE: 'Gestionnaire',
    CONSEILLER: 'Conseiller',
    TRADUCTEUR: 'Traducteur',
  };

  const roleVariants: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
    ADMIN: 'danger',
    GESTIONNAIRE: 'default',
    CONSEILLER: 'warning',
    TRADUCTEUR: 'info',
  };

  const columns = [
    {
      header: 'Email',
      accessor: 'email',
    },
    {
      header: 'Rôle',
      accessor: 'role',
      render: (val: string) => (
        <Badge variant={roleVariants[val] || 'default'}>
          {roleLabels[val] || val}
        </Badge>
      ),
    },
    {
      header: 'Traducteur lié',
      accessor: 'traducteurId',
      render: (val: string | undefined) => {
        if (!val) return '-';
        const trad = traducteurs.find(t => t.id === val);
        return trad ? trad.nom : val.substring(0, 8);
      },
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_: string, row: Utilisateur) => (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleCopierUtilisateur(row);
            }}
            className="py-1 px-2 text-xs"
            title="Créer un utilisateur similaire"
          >
            📋 Copier
          </Button>
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleEditerUtilisateur(row);
            }}
            className="py-1 px-2 text-xs"
          >
            Modifier
          </Button>
          {(row.role === 'GESTIONNAIRE' || row.role === 'CONSEILLER') && (
            <Button
              variant="secondaire"
              onClick={(e) => {
                e.stopPropagation();
                handleGererPermissions(row);
              }}
              className="py-1 px-2 text-xs"
            >
              Permissions
            </Button>
          )}
          <Button
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDesactiverUtilisateur(row.id);
            }}
            className="py-1 px-2 text-xs"
          >
            Désactiver
          </Button>
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleSupprimerUtilisateur(row.id, row.email);
            }}
            className="py-1 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50"
            title="Supprimer définitivement"
          >
            🗑️ Supprimer
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestion des utilisateurs</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exporterUtilisateurs(utilisateursNormaux)}
                title="Exporter la liste en CSV"
              >
                📥 Export CSV
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowQuickCreate(!showQuickCreate)}
                className="text-sm"
              >
                ⚡ Création rapide
              </Button>
              <Button variant="primaire" onClick={handleNouvelUtilisateur}>
                + Nouvel utilisateur
              </Button>
            </div>
          </div>
          
          {/* Barre de création rapide */}
          {showQuickCreate && (
            <div className="mt-4">
              <QuickCreateInline onCreated={chargerDonnees} />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonTable />
          ) : utilisateursNormaux.length === 0 ? (
            <EmptyState 
              icon="👤"
              title="Aucun utilisateur"
              description="Créez votre premier utilisateur pour commencer"
              action={{
                label: '+ Créer un utilisateur',
                onClick: handleNouvelUtilisateur
              }}
            />
          ) : (
            <>
              <div className="mb-2 text-sm text-muted">
                {utilisateursNormaux.length} utilisateur(s)
              </div>
              <DataTable
                data={utilisateursNormaux}
                columns={columns}
                emptyMessage="Aucun utilisateur"
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Section Comptes Playground */}
      <Card className="mt-4">
        <CardHeader>
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowPlayground(!showPlayground)}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🎮</span>
              <CardTitle className="text-base">Comptes Playground</CardTitle>
              <InfoTooltip 
                content="Comptes de démonstration pour présenter le système aux évaluateurs ou tester sans affecter les données réelles. Ces comptes utilisent des pseudonymes."
                size="md"
              />
              <Badge variant="info">{utilisateursPlayground.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setPlaygroundModal(true);
                }}
                className="text-sm"
              >
                + Nouveau compte Playground
              </Button>
              <span className="text-gray-400 transition-transform duration-200" style={{ transform: showPlayground ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </div>
          </div>
        </CardHeader>
        {showPlayground && (
          <CardContent>
            <p className="text-sm text-muted mb-4">
              Les comptes Playground permettent de démontrer le système, tester les fonctionnalités 
              et permettre aux évaluateurs de naviguer sans modifier les données de production.
            </p>
            {utilisateursPlayground.length === 0 ? (
              <div className="text-center py-4 text-muted">Aucun compte Playground</div>
            ) : (
              <div className="space-y-2">
                {utilisateursPlayground.map(user => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {user.prenom?.[0] || user.email[0].toUpperCase()}
                        {user.nom?.[0] || ''}
                      </div>
                      <div>
                        <div className="font-medium">
                          {user.prenom && user.nom 
                            ? `${user.prenom} ${user.nom}` 
                            : user.email.split('@')[0]}
                        </div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                        {user.playgroundNote && (
                          <div className="text-xs text-purple-600 mt-0.5">{user.playgroundNote}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={roleVariants[user.role] || 'default'}>
                        {roleLabels[user.role] || user.role}
                      </Badge>
                      <Badge variant={user.actif ? 'success' : 'default'}>
                        {user.actif ? 'Actif' : 'Inactif'}
                      </Badge>
                      <Button
                        variant="outline"
                        onClick={() => handleEditerUtilisateur(user)}
                        className="py-1 px-2 text-xs"
                      >
                        Modifier
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
              <strong>🔑 Mot de passe par défaut:</strong> <code className="bg-gray-200 px-1 rounded">playground123</code>
            </div>
          </CardContent>
        )}
      </Card>

      <UserForm
        utilisateur={utilisateurSelectionne}
        traducteurs={traducteurs}
        ouvert={modalOuvert}
        onFermer={() => setModalOuvert(false)}
        onSauvegarder={chargerDonnees}
      />

      <DivisionPermissionsModal
        utilisateur={utilisateurSelectionne}
        ouvert={modalPermissionsOuvert}
        onFermer={() => setModalPermissionsOuvert(false)}
        onSauvegarder={chargerDonnees}
      />

      {/* Dialogue de confirmation désactivation */}
      <ConfirmDialog
        isOpen={confirmDesactiver.isOpen}
        onClose={() => setConfirmDesactiver({ isOpen: false, id: null })}
        onConfirm={executerDesactivation}
        title="Désactiver l'utilisateur"
        message="Êtes-vous sûr de vouloir désactiver cet utilisateur ? Il ne pourra plus se connecter."
        variant="warning"
        confirmText="Désactiver"
        cancelText="Annuler"
      />

      {/* Dialogue de confirmation suppression */}
      <ConfirmDialog
        isOpen={confirmSupprimer.isOpen}
        onClose={() => setConfirmSupprimer({ isOpen: false, id: null, email: '' })}
        onConfirm={executerSuppression}
        title="🗑️ Supprimer définitivement"
        message={`Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur "${confirmSupprimer.email}" ? Cette action est IRRÉVERSIBLE et supprimera toutes les données associées.`}
        variant="danger"
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
      />

      {/* Modal de création rapide avec assistant */}
      <QuickUserCreation
        ouvert={quickCreateOuvert}
        onFermer={() => {
          setQuickCreateOuvert(false);
          setUtilisateurACopier(undefined);
        }}
        onSuccess={chargerDonnees}
        utilisateurACopier={utilisateurACopier}
      />

      {/* Modal création compte Playground */}
      <PlaygroundCreationModal
        ouvert={playgroundModal}
        onFermer={() => setPlaygroundModal(false)}
        onSuccess={chargerDonnees}
      />
    </>
  );
};

// Formulaire utilisateur
const UserForm: React.FC<{
  utilisateur?: Utilisateur;
  traducteurs: Traducteur[];
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
}> = ({ utilisateur, traducteurs, ouvert, onFermer, onSauvegarder }) => {
  const [formData, setFormData] = useState({
    email: '',
    motDePasse: '',
    role: 'TRADUCTEUR' as 'ADMIN' | 'CONSEILLER' | 'GESTIONNAIRE' | 'TRADUCTEUR',
    traducteurId: '',
  });
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [afficherMdp, setAfficherMdp] = useState(false);

  useEffect(() => {
    if (utilisateur) {
      setFormData({
        email: utilisateur.email,
        motDePasse: '',
        role: utilisateur.role,
        traducteurId: utilisateur.traducteurId || '',
      });
    } else {
      setFormData({
        email: '',
        motDePasse: '',
        role: 'TRADUCTEUR',
        traducteurId: '',
      });
    }
    setErreur('');
  }, [utilisateur, ouvert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErreur('');

    try {
      if (utilisateur) {
        await utilisateurService.mettreAJourUtilisateur(utilisateur.id, {
          email: formData.email,
          role: formData.role,
        });
      } else {
        if (!formData.motDePasse) {
          setErreur('Le mot de passe est requis');
          setLoading(false);
          return;
        }
        await utilisateurService.creerUtilisateur({
          email: formData.email,
          motDePasse: formData.motDePasse,
          role: formData.role,
        });
      }
      onSauvegarder();
      onFermer();
    } catch (err: any) {
      setErreur(err.response?.data?.erreur || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      titre={utilisateur ? 'Modifier utilisateur' : 'Nouvel utilisateur'}
      ouvert={ouvert}
      onFermer={onFermer}
    >
      <form onSubmit={handleSubmit}>
        {erreur && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {erreur}
          </div>
        )}

        <FormField label="Email" required helper={utilisateur ? "Vous pouvez modifier l'adresse email" : "Adresse email unique pour la connexion"}>
          <Input
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="utilisateur@tetrix.com"
            error={!formData.email && formData !== undefined}
          />
        </FormField>

        {!utilisateur && (
          <FormField label="Mot de passe" required helper="Minimum 6 caractères">
            <div className="relative">
              <Input
                type={afficherMdp ? 'text' : 'password'}
                value={formData.motDePasse}
                onChange={e => setFormData({ ...formData, motDePasse: e.target.value })}
                required
                minLength={6}
                placeholder="••••••••"
                error={!formData.motDePasse && formData !== undefined}
                className="pr-20"
              />
              <button
                type="button"
                onClick={() => setAfficherMdp(!afficherMdp)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-primary"
              >
                {afficherMdp ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </FormField>
        )}

        <FormField label="Rôle" required helper="Rôle de l'utilisateur dans le système">
          <Select
            value={formData.role}
            onChange={e =>
              setFormData({
                ...formData,
                role: e.target.value as 'ADMIN' | 'CONSEILLER' | 'GESTIONNAIRE' | 'TRADUCTEUR',
              })
            }
            required
          >
            <option value="TRADUCTEUR">Traducteur</option>
            <option value="CONSEILLER">Conseiller</option>
            <option value="GESTIONNAIRE">Gestionnaire</option>
            <option value="ADMIN">Administrateur</option>
          </Select>
        </FormField>

        {formData.role === 'TRADUCTEUR' && (
          <FormField label="Traducteur associé" helper="Sélectionner le profil de traducteur">
            <Select
              value={formData.traducteurId}
              onChange={e => setFormData({ ...formData, traducteurId: e.target.value })}
            >
              <option value="">Sélectionner un traducteur...</option>
              {traducteurs
                .filter(t => t.actif)
                .map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nom} ({t.divisions?.join(', ') || 'N/A'})
                  </option>
                ))}
            </Select>
          </FormField>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onFermer} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Modal de gestion des permissions de divisions et équipes projet
const DivisionPermissionsModal: React.FC<{
  utilisateur?: Utilisateur;
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
}> = ({ utilisateur, ouvert, onFermer, onSauvegarder }) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'divisions' | 'equipesProjet'>('divisions');
  
  // Données divisions
  const [divisions, setDivisions] = useState<any[]>([]);
  const [permissionsDivisions, setPermissionsDivisions] = useState<Map<string, {
    peutLire: boolean;
    peutEcrire: boolean;
    peutGerer: boolean;
  }>>(new Map());
  
  // Données équipes projet
  const [equipesProjet, setEquipesProjet] = useState<any[]>([]);
  const [permissionsEquipesProjet, setPermissionsEquipesProjet] = useState<Map<string, {
    peutLire: boolean;
    peutEcrire: boolean;
    peutGerer: boolean;
  }>>(new Map());

  useEffect(() => {
    if (ouvert && utilisateur) {
      chargerDonnees();
    }
  }, [ouvert, utilisateur]);

  const chargerDonnees = async () => {
    if (!utilisateur) return;
    
    setLoading(true);
    try {
      const [divisionsData, permissionsDivisionsData, equipesProjetData, permissionsEquipesProjetData] = await Promise.all([
        import('../../services/divisionService').then(m => m.divisionService.obtenirDivisions()),
        import('../../services/divisionAccessService').then(m => 
          m.divisionAccessService.obtenirPermissions(utilisateur.id)
        ),
        import('../../services/equipeProjetService').then(m => m.equipeProjetService.lister()).catch(() => []),
        import('../../services/equipeProjetAccessService').then(m => 
          m.equipeProjetAccessService.obtenirPermissions(utilisateur.id)
        ).catch(() => []),
      ]);
      
      setDivisions(divisionsData);
      setEquipesProjet(equipesProjetData);
      
      // Map des permissions divisions
      const permDivMap = new Map();
      permissionsDivisionsData.forEach((perm: any) => {
        permDivMap.set(perm.divisionId, {
          peutLire: perm.peutLire,
          peutEcrire: perm.peutEcrire,
          peutGerer: perm.peutGerer,
        });
      });
      setPermissionsDivisions(permDivMap);
      
      // Map des permissions équipes projet
      const permEqMap = new Map();
      permissionsEquipesProjetData.forEach((perm: any) => {
        permEqMap.set(perm.equipeProjetId, {
          peutLire: perm.peutLire,
          peutEcrire: perm.peutEcrire,
          peutGerer: perm.peutGerer,
        });
      });
      setPermissionsEquipesProjet(permEqMap);
    } catch (err) {
      console.error('Erreur chargement permissions:', err);
      addToast('Erreur lors du chargement des permissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePermissionDivision = (divisionId: string, type: 'peutLire' | 'peutEcrire' | 'peutGerer') => {
    const newPermissions = new Map(permissionsDivisions);
    const current = newPermissions.get(divisionId) || {
      peutLire: false,
      peutEcrire: false,
      peutGerer: false,
    };
    
    if (type === 'peutLire' && current.peutLire) {
      newPermissions.set(divisionId, {
        peutLire: false,
        peutEcrire: false,
        peutGerer: false,
      });
    } else {
      const newValue = !current[type];
      newPermissions.set(divisionId, {
        ...current,
        [type]: newValue,
        peutLire: type !== 'peutLire' && newValue ? true : current.peutLire,
      });
    }
    
    setPermissionsDivisions(newPermissions);
  };

  const togglePermissionEquipeProjet = (equipeId: string, type: 'peutLire' | 'peutEcrire' | 'peutGerer') => {
    const newPermissions = new Map(permissionsEquipesProjet);
    const current = newPermissions.get(equipeId) || {
      peutLire: false,
      peutEcrire: false,
      peutGerer: false,
    };
    
    if (type === 'peutLire' && current.peutLire) {
      newPermissions.set(equipeId, {
        peutLire: false,
        peutEcrire: false,
        peutGerer: false,
      });
    } else {
      const newValue = !current[type];
      newPermissions.set(equipeId, {
        ...current,
        [type]: newValue,
        peutLire: type !== 'peutLire' && newValue ? true : current.peutLire,
      });
    }
    
    setPermissionsEquipesProjet(newPermissions);
  };

  const handleSauvegarder = async () => {
    if (!utilisateur) return;
    
    setLoading(true);
    try {
      // Sauvegarder les permissions divisions
      const permissionsDivisionsArray = Array.from(permissionsDivisions.entries())
        .filter(([_, perm]) => perm.peutLire)
        .map(([divisionId, perm]) => ({
          divisionId,
          ...perm,
        }));
      
      await import('../../services/divisionAccessService').then(m =>
        m.divisionAccessService.definirPermissions(utilisateur.id, permissionsDivisionsArray)
      );
      
      // Sauvegarder les permissions équipes projet
      const permissionsEquipesProjetArray = Array.from(permissionsEquipesProjet.entries())
        .filter(([_, perm]) => perm.peutLire)
        .map(([equipeProjetId, perm]) => ({
          equipeProjetId,
          ...perm,
        }));
      
      await import('../../services/equipeProjetAccessService').then(m =>
        m.equipeProjetAccessService.definirPermissions(utilisateur.id, permissionsEquipesProjetArray)
      );
      
      addToast('Permissions mises à jour avec succès', 'success');
      onSauvegarder();
      onFermer();
    } catch (err) {
      console.error('Erreur sauvegarde permissions:', err);
      addToast('Erreur lors de la sauvegarde des permissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!utilisateur) return null;

  return (
    <Modal
      titre={`Permissions - ${utilisateur.email}`}
      ouvert={ouvert}
      onFermer={onFermer}
      wide
    >
      <div className="space-y-4">
        {/* Onglets */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('divisions')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'divisions'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            🏛️ Divisions ({divisions.length})
          </button>
          <button
            onClick={() => setActiveTab('equipesProjet')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'equipesProjet'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            🎯 Équipes projet ({equipesProjet.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Onglet Divisions */}
            {activeTab === 'divisions' && (
              <div className="space-y-2">
                <p className="text-sm text-muted mb-4">
                  Définissez les divisions auxquelles cet utilisateur a accès.
                </p>
                <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-surface-100 rounded font-medium text-sm">
                  <div>Division</div>
                  <div className="text-center">Lecture</div>
                  <div className="text-center">Écriture</div>
                  <div className="text-center">Gestion</div>
                </div>
                
                {divisions.length === 0 ? (
                  <div className="text-center py-4 text-muted">Aucune division disponible</div>
                ) : (
                  divisions.map((division) => {
                    const perm = permissionsDivisions.get(division.id) || {
                      peutLire: false,
                      peutEcrire: false,
                      peutGerer: false,
                    };
                    
                    return (
                      <div
                        key={division.id}
                        className="grid grid-cols-4 gap-2 px-4 py-3 border border-border rounded hover:bg-surface-50 transition-colors"
                      >
                        <div className="font-medium">{division.nom}</div>
                        <div className="text-center">
                          <input
                            type="checkbox"
                            checked={perm.peutLire}
                            onChange={() => togglePermissionDivision(division.id, 'peutLire')}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                        </div>
                        <div className="text-center">
                          <input
                            type="checkbox"
                            checked={perm.peutEcrire}
                            onChange={() => togglePermissionDivision(division.id, 'peutEcrire')}
                            disabled={!perm.peutLire}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div className="text-center">
                          <input
                            type="checkbox"
                            checked={perm.peutGerer}
                            onChange={() => togglePermissionDivision(division.id, 'peutGerer')}
                            disabled={!perm.peutLire}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Onglet Équipes Projet */}
            {activeTab === 'equipesProjet' && (
              <div className="space-y-2">
                <p className="text-sm text-muted mb-4">
                  Définissez les équipes de projet auxquelles cet utilisateur a accès.
                </p>
                <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-surface-100 rounded font-medium text-sm">
                  <div>Équipe projet</div>
                  <div className="text-center">Lecture</div>
                  <div className="text-center">Écriture</div>
                  <div className="text-center">Gestion</div>
                </div>
                
                {equipesProjet.length === 0 ? (
                  <div className="text-center py-4 text-muted">Aucune équipe de projet disponible</div>
                ) : (
                  equipesProjet.map((equipe) => {
                    const perm = permissionsEquipesProjet.get(equipe.id) || {
                      peutLire: false,
                      peutEcrire: false,
                      peutGerer: false,
                    };
                    
                    return (
                      <div
                        key={equipe.id}
                        className="grid grid-cols-4 gap-2 px-4 py-3 border border-border rounded hover:bg-surface-50 transition-colors"
                      >
                        <div className="font-medium">
                          {equipe.nom}
                          <span className="ml-2 text-xs text-muted">({equipe.code})</span>
                        </div>
                        <div className="text-center">
                          <input
                            type="checkbox"
                            checked={perm.peutLire}
                            onChange={() => togglePermissionEquipeProjet(equipe.id, 'peutLire')}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                        </div>
                        <div className="text-center">
                          <input
                            type="checkbox"
                            checked={perm.peutEcrire}
                            onChange={() => togglePermissionEquipeProjet(equipe.id, 'peutEcrire')}
                            disabled={!perm.peutLire}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div className="text-center">
                          <input
                            type="checkbox"
                            checked={perm.peutGerer}
                            onChange={() => togglePermissionEquipeProjet(equipe.id, 'peutGerer')}
                            disabled={!perm.peutLire}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onFermer} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSauvegarder} loading={loading}>
            Sauvegarder
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Modal de création de compte Playground
const PlaygroundCreationModal: React.FC<{
  ouvert: boolean;
  onFermer: () => void;
  onSuccess: () => void;
}> = ({ ouvert, onFermer, onSuccess }) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    role: 'CONSEILLER' as 'ADMIN' | 'CONSEILLER' | 'GESTIONNAIRE' | 'TRADUCTEUR',
    note: '',
  });

  const roleOptions = [
    { value: 'CONSEILLER', label: '📋 Conseiller (accès complet - recommandé)' },
    { value: 'ADMIN', label: '👑 Administrateur (accès total)' },
    { value: 'GESTIONNAIRE', label: '👔 Gestionnaire (accès limité)' },
    { value: 'TRADUCTEUR', label: '🔤 Traducteur (accès minimal)' },
  ];

  const genererEmail = () => {
    if (formData.prenom && formData.nom) {
      const email = `${formData.prenom.toLowerCase()}.${formData.nom.toLowerCase()}@playground.tetrix.com`
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Supprimer accents
      setFormData({ ...formData, email });
    }
  };

  const handleCreer = async () => {
    if (!formData.prenom || !formData.nom || !formData.email) {
      addToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    setLoading(true);
    try {
      await utilisateurService.creerUtilisateur({
        email: formData.email,
        motDePasse: 'playground123',
        nom: formData.nom,
        prenom: formData.prenom,
        role: formData.role,
        actif: true,
        isPlayground: true,
        playgroundNote: formData.note || `Compte démo ${formData.role}`,
      });
      
      addToast(`Compte Playground créé pour ${formData.prenom} ${formData.nom}`, 'success');
      setFormData({ prenom: '', nom: '', email: '', role: 'CONSEILLER', note: '' });
      onFermer();
      onSuccess();
    } catch (error: any) {
      addToast(error.response?.data?.erreur || 'Erreur lors de la création', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      titre="🎮 Nouveau compte Playground"
      ouvert={ouvert}
      onFermer={onFermer}
    >
      <div className="space-y-4">
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
          <p className="text-purple-800">
            <strong>Les comptes Playground permettent de :</strong>
          </p>
          <ul className="list-disc list-inside mt-1 text-purple-700 space-y-0.5">
            <li>Démontrer toutes les fonctionnalités du système</li>
            <li>Tester et explorer sans risque</li>
            <li>Permettre aux évaluateurs de faire des recommandations</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Prénom *">
            <Input
              value={formData.prenom}
              onChange={e => setFormData({ ...formData, prenom: e.target.value })}
              placeholder="Prénom"
              onBlur={genererEmail}
            />
          </FormField>
          <FormField label="Nom *">
            <Input
              value={formData.nom}
              onChange={e => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Nom"
              onBlur={genererEmail}
            />
          </FormField>
        </div>

        <FormField label="Email *">
          <div className="flex gap-2">
            <Input
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="prenom.nom@playground.tetrix.com"
              className="flex-1"
            />
            <Button variant="outline" onClick={genererEmail} type="button">
              Générer
            </Button>
          </div>
        </FormField>

        <FormField label="Rôle">
          <Select
            value={formData.role}
            onChange={e => setFormData({ ...formData, role: e.target.value as any })}
          >
            {roleOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
          <p className="text-xs text-muted mt-1">
            💡 Le rôle <strong>Conseiller</strong> donne accès aux 4 portails (Admin, Conseiller, Gestionnaire, Traducteur)
          </p>
        </FormField>

        <FormField label="Note / Description">
          <Input
            value={formData.note}
            onChange={e => setFormData({ ...formData, note: e.target.value })}
            placeholder="Ex: Gestionnaire - Évaluation Q1 2025"
          />
        </FormField>

        <div className="p-3 bg-gray-50 rounded-lg text-sm">
          <strong>🔑 Mot de passe:</strong> <code className="bg-gray-200 px-1 rounded">playground123</code>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onFermer} disabled={loading}>
            Annuler
          </Button>
          <Button 
            variant="primaire" 
            onClick={handleCreer} 
            loading={loading}
            disabled={!formData.prenom || !formData.nom || !formData.email}
          >
            🎮 Créer le compte Playground
          </Button>
        </div>
      </div>
    </Modal>
  );
};
