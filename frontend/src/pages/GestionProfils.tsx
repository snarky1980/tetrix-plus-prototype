import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  utilisateurService,
  divisionService,
  CreateUtilisateurData,
  UpdateUtilisateurData,
} from '../services/utilisateurService';
import { Utilisateur, Division } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DivisionPermissions } from '../components/admin/DivisionPermissions';
import { Breadcrumbs } from '../components/navigation/Breadcrumbs';

type TabType = 'utilisateurs' | 'divisions';

export const GestionProfils: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('utilisateurs');
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  
  // États pour les dialogues de confirmation
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États pour les modales
  const [showModalUtilisateur, setShowModalUtilisateur] = useState(false);
  const [showModalDivision, setShowModalDivision] = useState(false);
  const [showModalAcces, setShowModalAcces] = useState(false);
  const [utilisateurEnCours, setUtilisateurEnCours] = useState<Utilisateur | null>(null);
  const [divisionEnCours, setDivisionEnCours] = useState<Division | null>(null);

  // Filtres
  const [filtreRole, setFiltreRole] = useState<string>('');
  const [filtreActif, setFiltreActif] = useState<string>('');

  // Formulaire utilisateur
  const [formUtilisateur, setFormUtilisateur] = useState<CreateUtilisateurData>({
    email: '',
    motDePasse: '',
    nom: '',
    prenom: '',
    role: 'CONSEILLER',
    divisions: [],
  });

  // Formulaire division
  const [formDivision, setFormDivision] = useState({
    nom: '',
    code: '',
    description: '',
  });

  // Gestion des accès - maintenant géré par le composant DivisionPermissions
  // const [accesSelectionnes, setAccesSelectionnes] = useState<DivisionAccessData[]>([]);

  useEffect(() => {
    chargerDonnees();
  }, [tab, filtreRole, filtreActif]);

  const chargerDonnees = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'utilisateurs') {
        const params: any = {};
        if (filtreRole) params.role = filtreRole;
        if (filtreActif) params.actif = filtreActif === 'true';
        const data = await utilisateurService.obtenirUtilisateurs(params);
        setUtilisateurs(data);
      } else {
        const data = await divisionService.obtenirDivisions();
        setDivisions(data);
      }

      // Toujours charger les divisions pour les formulaires
      const divsData = await divisionService.obtenirDivisions(true);
      setDivisions(divsData);
    } catch (err: any) {
      setError(err.response?.data?.erreur || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreerUtilisateur = () => {
    setUtilisateurEnCours(null);
    // Par défaut, donner accès à toutes les divisions actives
    const toutesLesDivisions = divisions.filter(d => d.actif !== false).map(d => d.id);
    setFormUtilisateur({
      email: '',
      motDePasse: '',
      nom: '',
      prenom: '',
      role: 'CONSEILLER',
      divisions: toutesLesDivisions,
    });
    setShowModalUtilisateur(true);
  };

  const handleModifierUtilisateur = (utilisateur: Utilisateur) => {
    setUtilisateurEnCours(utilisateur);
    setFormUtilisateur({
      email: utilisateur.email,
      motDePasse: '', // Ne pas pré-remplir le mot de passe
      nom: utilisateur.nom || '',
      prenom: utilisateur.prenom || '',
      role: utilisateur.role,
      divisions: utilisateur.divisionAccess?.map((a) => a.divisionId) || [],
    });
    setShowModalUtilisateur(true);
  };

  const handleSoumettreUtilisateur = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (utilisateurEnCours) {
        // Mise à jour
        const updateData: UpdateUtilisateurData = {
          email: formUtilisateur.email,
          nom: formUtilisateur.nom,
          prenom: formUtilisateur.prenom,
          role: formUtilisateur.role,
        };
        if (formUtilisateur.motDePasse) {
          updateData.motDePasse = formUtilisateur.motDePasse;
        }
        await utilisateurService.mettreAJourUtilisateur(utilisateurEnCours.id, updateData);

        // Mettre à jour les accès aux divisions
        const acces = formUtilisateur.divisions!.map((divId) => ({
          divisionId: divId,
          peutLire: true,
          peutEcrire: formUtilisateur.role === 'GESTIONNAIRE' || formUtilisateur.role === 'ADMIN',
          peutGerer: formUtilisateur.role === 'ADMIN',
        }));
        await utilisateurService.gererAccesDivisions(utilisateurEnCours.id, acces);
      } else {
        // Création
        await utilisateurService.creerUtilisateur(formUtilisateur);
      }

      setShowModalUtilisateur(false);
      chargerDonnees();
    } catch (err: any) {
      setError(err.response?.data?.erreur || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleSupprimerUtilisateur = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer l\'utilisateur',
      message: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await utilisateurService.supprimerUtilisateur(id);
          chargerDonnees();
        } catch (err: any) {
          setError(err.response?.data?.erreur || 'Erreur lors de la suppression');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Les fonctions de gestion des accès sont maintenant gérées par le composant DivisionPermissions

  const handleCreerDivision = () => {
    setDivisionEnCours(null);
    setFormDivision({ nom: '', code: '', description: '' });
    setShowModalDivision(true);
  };

  const handleModifierDivision = (division: Division) => {
    setDivisionEnCours(division);
    setFormDivision({
      nom: division.nom,
      code: division.code,
      description: division.description || '',
    });
    setShowModalDivision(true);
  };

  const handleSoumettreDiv = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (divisionEnCours) {
        await divisionService.mettreAJourDivision(divisionEnCours.id, formDivision);
      } else {
        await divisionService.creerDivision(formDivision);
      }
      setShowModalDivision(false);
      chargerDonnees();
    } catch (err: any) {
      setError(err.response?.data?.erreur || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleSupprimerDivision = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer la division',
      message: 'Êtes-vous sûr de vouloir supprimer cette division ? Cette action est irréversible.',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await divisionService.supprimerDivision(id);
          chargerDonnees();
        } catch (err: any) {
          setError(err.response?.data?.erreur || 'Erreur lors de la suppression');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'GESTIONNAIRE':
        return 'bg-purple-100 text-purple-800';
      case 'CONSEILLER':
        return 'bg-blue-100 text-blue-800';
      case 'TRADUCTEUR':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumbs et retour */}
      <div className="mb-4 flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/admin')} className="text-sm">
          ← Retour Admin
        </Button>
        <Breadcrumbs items={[
          { label: 'Administration', path: '/admin' },
          { label: 'Gestion des profils' }
        ]} />
      </div>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Profils</h1>
        <p className="text-gray-600 mt-2">
          Gérez les utilisateurs, leurs rôles et leurs accès aux divisions
        </p>
      </div>
      
      {/* Dialogue de confirmation */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant || 'warning'}
        confirmText="Supprimer"
        cancelText="Annuler"
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setTab('utilisateurs')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              tab === 'utilisateurs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Utilisateurs
          </button>
          <button
            onClick={() => setTab('divisions')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              tab === 'divisions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Divisions
          </button>
        </div>
      </div>

      {/* Contenu des tabs */}
      {tab === 'utilisateurs' && (
        <div>
          {/* Filtres et actions */}
          <div className="mb-4 flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
              <Select
                value={filtreRole}
                onChange={(e) => setFiltreRole(e.target.value)}
                className="w-full"
              >
                <option value="">Tous les rôles</option>
                <option value="ADMIN">Admin</option>
                <option value="GESTIONNAIRE">Gestionnaire</option>
                <option value="CONSEILLER">Conseiller</option>
                <option value="TRADUCTEUR">Traducteur</option>
              </Select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <Select
                value={filtreActif}
                onChange={(e) => setFiltreActif(e.target.value)}
                className="w-full"
              >
                <option value="">Tous</option>
                <option value="true">Actifs</option>
                <option value="false">Inactifs</option>
              </Select>
            </div>

            <Button onClick={handleCreerUtilisateur} className="shrink-0">
              + Nouvel Utilisateur
            </Button>
          </div>

          {/* Liste des utilisateurs */}
          <Card>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : utilisateurs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Aucun utilisateur trouvé</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Nom
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Rôle
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Divisions
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {utilisateurs.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {user.nom && user.prenom
                            ? `${user.prenom} ${user.nom}`
                            : user.nom || user.prenom || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                              user.role
                            )}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.divisionAccess && user.divisionAccess.length > 0
                            ? `${user.divisionAccess.length} division(s)`
                            : 'Aucune'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.actif
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.actif ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right space-x-2">
                          <button
                            onClick={() => {
                              setUtilisateurEnCours(user);
                              setShowModalAcces(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Permissions
                          </button>
                          <button
                            onClick={() => handleModifierUtilisateur(user)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleSupprimerUtilisateur(user.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'divisions' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button onClick={handleCreerDivision}>+ Nouvelle Division</Button>
          </div>

          <Card>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : divisions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Aucune division trouvée</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Nom
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Utilisateurs
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {divisions.map((div) => (
                      <tr key={div.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {div.nom}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-gray-100 rounded font-mono text-xs">
                            {div.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {div.description || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {div.acces ? `${div.acces.length} utilisateur(s)` : '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right space-x-2">
                          <button
                            onClick={() => handleModifierDivision(div)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleSupprimerDivision(div.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modal Utilisateur */}
      {showModalUtilisateur && (
        <Modal
          ouvert={showModalUtilisateur}
          onFermer={() => setShowModalUtilisateur(false)}
          titre={utilisateurEnCours ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        >
          <form onSubmit={handleSoumettreUtilisateur} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <Input
                  value={formUtilisateur.prenom}
                  onChange={(e) =>
                    setFormUtilisateur({ ...formUtilisateur, prenom: e.target.value })
                  }
                  placeholder="Jean"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <Input
                  value={formUtilisateur.nom}
                  onChange={(e) => setFormUtilisateur({ ...formUtilisateur, nom: e.target.value })}
                  placeholder="Dupont"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={formUtilisateur.email}
                onChange={(e) => setFormUtilisateur({ ...formUtilisateur, email: e.target.value })}
                required
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe {!utilisateurEnCours && <span className="text-red-500">*</span>}
              </label>
              <Input
                type="password"
                value={formUtilisateur.motDePasse}
                onChange={(e) =>
                  setFormUtilisateur({ ...formUtilisateur, motDePasse: e.target.value })
                }
                required={!utilisateurEnCours}
                placeholder={utilisateurEnCours ? 'Laisser vide pour ne pas changer' : ''}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rôle <span className="text-red-500">*</span>
              </label>
              <Select
                value={formUtilisateur.role}
                onChange={(e) =>
                  setFormUtilisateur({
                    ...formUtilisateur,
                    role: e.target.value as any,
                  })
                }
                required
              >
                <option value="CONSEILLER">Conseiller</option>
                <option value="GESTIONNAIRE">Gestionnaire</option>
                <option value="ADMIN">Admin</option>
                <option value="TRADUCTEUR">Traducteur</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Divisions accessibles
              </label>
              {!utilisateurEnCours && (
                <p className="text-xs text-blue-600 mb-2">
                  ℹ️ Par défaut, toutes les divisions sont sélectionnées pour un nouvel utilisateur
                </p>
              )}
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {divisions.map((div) => (
                  <label key={div.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formUtilisateur.divisions?.includes(div.id)}
                      onChange={(e) => {
                        const current = formUtilisateur.divisions || [];
                        if (e.target.checked) {
                          setFormUtilisateur({
                            ...formUtilisateur,
                            divisions: [...current, div.id],
                          });
                        } else {
                          setFormUtilisateur({
                            ...formUtilisateur,
                            divisions: current.filter((id) => id !== div.id),
                          });
                        }
                      }}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{div.nom}</span>
                    <span className="text-xs text-gray-500">({div.code})</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                onClick={() => setShowModalUtilisateur(false)}
                variant="secondaire"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Accès aux Divisions */}
      {showModalAcces && (
        <Modal
          ouvert={showModalAcces}
          onFermer={() => {
            setShowModalAcces(false);
            setUtilisateurEnCours(null);
            chargerDonnees(); // Recharger pour voir les modifications
          }}
          titre="Gérer les permissions"
        >
          <DivisionPermissions utilisateur={utilisateurEnCours || undefined} />
        </Modal>
      )}

      {/* Modal Division */}
      {showModalDivision && (
        <Modal
          ouvert={showModalDivision}
          onFermer={() => setShowModalDivision(false)}
          titre={divisionEnCours ? 'Modifier la division' : 'Nouvelle division'}
        >
          <form onSubmit={handleSoumettreDiv} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <Input
                value={formDivision.nom}
                onChange={(e) => setFormDivision({ ...formDivision, nom: e.target.value })}
                required
                placeholder="Ex: Division Droit"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <Input
                value={formDivision.code}
                onChange={(e) =>
                  setFormDivision({
                    ...formDivision,
                    code: e.target.value.toUpperCase(),
                  })
                }
                required
                placeholder="Ex: DROIT"
                className="font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formDivision.description}
                onChange={(e) => setFormDivision({ ...formDivision, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Description de la division..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                onClick={() => setShowModalDivision(false)}
                variant="secondaire"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
