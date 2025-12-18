import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { FormField } from '../ui/FormField';
import { DataTable } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { SkeletonTable } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../../contexts/ToastContext';
import { Utilisateur, Traducteur } from '../../types';
import { utilisateurService } from '../../services/utilisateurService';
import { traducteurService } from '../../services/traducteurService';

export const UserManagement: React.FC = () => {
  const { addToast } = useToast();
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [modalPermissionsOuvert, setModalPermissionsOuvert] = useState(false);
  const [utilisateurSelectionne, setUtilisateurSelectionne] = useState<Utilisateur | undefined>();

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
    setUtilisateurSelectionne(undefined);
    setModalOuvert(true);
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
    if (!confirm('Êtes-vous sûr de vouloir désactiver cet utilisateur ?')) return;
    try {
      await utilisateurService.mettreAJourUtilisateur(id, { actif: false });
      await chargerDonnees();
      addToast('Utilisateur désactivé avec succès', 'success');
    } catch (err) {
      addToast('Erreur lors de la désactivation de l\'utilisateur', 'error');
    }
  };

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrateur',
    CONSEILLER: 'Conseiller',
    TRADUCTEUR: 'Traducteur',
  };

  const roleVariants: Record<string, 'danger' | 'warning' | 'info'> = {
    ADMIN: 'danger',
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
        <div className="flex gap-2">
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
            <Button variant="primaire" onClick={handleNouvelUtilisateur}>
              + Nouvel utilisateur
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonTable />
          ) : utilisateurs.length === 0 ? (
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
                {utilisateurs.length} utilisateur(s)
              </div>
              <DataTable
                data={utilisateurs}
                columns={columns}
                emptyMessage="Aucun utilisateur"
              />
            </>
          )}
        </CardContent>
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

        <FormField label="Email" required helper="Adresse email unique pour la connexion">
          <Input
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required
            disabled={!!utilisateur}
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
                    {t.nom} ({t.division})
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

// Modal de gestion des permissions de divisions
const DivisionPermissionsModal: React.FC<{
  utilisateur?: Utilisateur;
  ouvert: boolean;
  onFermer: () => void;
  onSauvegarder: () => void;
}> = ({ utilisateur, ouvert, onFermer, onSauvegarder }) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<Map<string, {
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
      const [divisionsData, permissionsData] = await Promise.all([
        import('../../services/divisionService').then(m => m.divisionService.obtenirDivisions()),
        import('../../services/divisionAccessService').then(m => 
          m.divisionAccessService.obtenirPermissions(utilisateur.id)
        ),
      ]);
      
      setDivisions(divisionsData);
      
      const permMap = new Map();
      permissionsData.forEach((perm: any) => {
        permMap.set(perm.divisionId, {
          peutLire: perm.peutLire,
          peutEcrire: perm.peutEcrire,
          peutGerer: perm.peutGerer,
        });
      });
      setPermissions(permMap);
    } catch (err) {
      console.error('Erreur chargement permissions:', err);
      addToast('Erreur lors du chargement des permissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (divisionId: string, type: 'peutLire' | 'peutEcrire' | 'peutGerer') => {
    const newPermissions = new Map(permissions);
    const current = newPermissions.get(divisionId) || {
      peutLire: false,
      peutEcrire: false,
      peutGerer: false,
    };
    
    // Si on désactive peutLire, désactiver aussi les autres
    if (type === 'peutLire' && current.peutLire) {
      newPermissions.set(divisionId, {
        peutLire: false,
        peutEcrire: false,
        peutGerer: false,
      });
    } else {
      // Si on active peutEcrire ou peutGerer, activer aussi peutLire
      const newValue = !current[type];
      newPermissions.set(divisionId, {
        ...current,
        [type]: newValue,
        peutLire: type !== 'peutLire' && newValue ? true : current.peutLire,
      });
    }
    
    setPermissions(newPermissions);
  };

  const handleSauvegarder = async () => {
    if (!utilisateur) return;
    
    setLoading(true);
    try {
      const permissionsArray = Array.from(permissions.entries())
        .filter(([_, perm]) => perm.peutLire) // Sauvegarder seulement celles où peutLire est true
        .map(([divisionId, perm]) => ({
          divisionId,
          ...perm,
        }));
      
      await import('../../services/divisionAccessService').then(m =>
        m.divisionAccessService.definirPermissions(utilisateur.id, permissionsArray)
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
      titre={`Permissions de divisions - ${utilisateur.email}`}
      ouvert={ouvert}
      onFermer={onFermer}
      wide
    >
      <div className="space-y-4">
        <p className="text-sm text-muted mb-4">
          Définissez les divisions auxquelles cet utilisateur a accès et les actions qu'il peut effectuer.
        </p>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-surface-100 rounded font-medium text-sm">
              <div>Division</div>
              <div className="text-center">Lecture</div>
              <div className="text-center">Écriture</div>
              <div className="text-center">Gestion</div>
            </div>
            
            {divisions.map((division) => {
              const perm = permissions.get(division.id) || {
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
                      onChange={() => togglePermission(division.id, 'peutLire')}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </div>
                  <div className="text-center">
                    <input
                      type="checkbox"
                      checked={perm.peutEcrire}
                      onChange={() => togglePermission(division.id, 'peutEcrire')}
                      disabled={!perm.peutLire}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="text-center">
                    <input
                      type="checkbox"
                      checked={perm.peutGerer}
                      onChange={() => togglePermission(division.id, 'peutGerer')}
                      disabled={!perm.peutLire}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              );
            })}
          </div>
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
