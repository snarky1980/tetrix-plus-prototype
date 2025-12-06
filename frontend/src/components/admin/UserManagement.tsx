import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { FormField } from '../ui/FormField';
import { DataTable } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/Spinner';
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

  const handleDesactiverUtilisateur = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver cet utilisateur ?')) return;
    try {
      await utilisateurService.desactiverUtilisateur(id);
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
            <LoadingSpinner message="Chargement des utilisateurs..." />
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
    role: 'TRADUCTEUR' as 'ADMIN' | 'CONSEILLER' | 'TRADUCTEUR',
    traducteurId: '',
  });
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

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
          role: formData.role,
          traducteurId: formData.traducteurId || undefined,
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
          traducteurId: formData.traducteurId || undefined,
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

        <FormField label="Email" required>
          <Input
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required
            disabled={!!utilisateur}
            placeholder="utilisateur@tetrix.com"
          />
        </FormField>

        {!utilisateur && (
          <FormField label="Mot de passe" required>
            <Input
              type="password"
              value={formData.motDePasse}
              onChange={e => setFormData({ ...formData, motDePasse: e.target.value })}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </FormField>
        )}

        <FormField label="Rôle" required>
          <Select
            value={formData.role}
            onChange={e =>
              setFormData({
                ...formData,
                role: e.target.value as 'ADMIN' | 'CONSEILLER' | 'TRADUCTEUR',
              })
            }
            required
          >
            <option value="TRADUCTEUR">Traducteur</option>
            <option value="CONSEILLER">Conseiller</option>
            <option value="ADMIN">Administrateur</option>
          </Select>
        </FormField>

        {formData.role === 'TRADUCTEUR' && (
          <FormField label="Traducteur associé">
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
          <Button type="button" variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
