import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { utilisateurService, divisionService } from '../../services/utilisateurService';
import { Utilisateur, Division } from '../../types';

interface DivisionAccess {
  divisionId: string;
  divisionNom: string;
  peutLire: boolean;
  peutEcrire: boolean;
  peutGerer: boolean;
}

interface DivisionPermissionsProps {
  utilisateur?: Utilisateur;
  onSauvegarder?: () => void;
}

/**
 * Composant pour gérer les permissions d'accès aux divisions d'un utilisateur
 * À utiliser directement dans une modale
 */
export const DivisionPermissions: React.FC<DivisionPermissionsProps> = ({ utilisateur, onSauvegarder }) => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [accesActuels, setAccesActuels] = useState<DivisionAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    chargerDivisions();
  }, []);

  useEffect(() => {
    if (utilisateur && divisions.length > 0) {
      chargerAccesUtilisateur();
    }
  }, [utilisateur, divisions]);

  const chargerDivisions = async () => {
    try {
      const data = await divisionService.obtenirDivisions(true); // Seulement les divisions actives
      setDivisions(data);
    } catch (err: any) {
      console.error('Erreur chargement divisions:', err);
      setError('Erreur lors du chargement des divisions');
    }
  };

  const chargerAccesUtilisateur = async () => {
    if (!utilisateur) return;

    try {
      setLoading(true);
      
      // Charger les accès de l'utilisateur
      const userWithAccess = await utilisateurService.obtenirUtilisateurParId(utilisateur.id);
      
      // Créer une map des accès existants
      const accesMap = new Map(
        (userWithAccess.divisionAccess || []).map(a => [
          a.divisionId,
          {
            divisionId: a.divisionId,
            divisionNom: divisions.find(d => d.id === a.divisionId)?.nom || '',
            peutLire: a.peutLire,
            peutEcrire: a.peutEcrire,
            peutGerer: a.peutGerer,
          }
        ])
      );

      // Si l'utilisateur n'a aucun accès configuré, par défaut lui donner accès en lecture à toutes les divisions
      const aDesAcces = userWithAccess.divisionAccess && userWithAccess.divisionAccess.length > 0;
      
      // Ajouter toutes les divisions
      const accesComplets = divisions.map(div => 
        accesMap.get(div.id) || {
          divisionId: div.id,
          divisionNom: div.nom,
          // Par défaut, si l'utilisateur n'a aucun accès, donner lecture à toutes les divisions
          peutLire: !aDesAcces,
          peutEcrire: false,
          peutGerer: false,
        }
      );

      setAccesActuels(accesComplets);
    } catch (err: any) {
      console.error('Erreur chargement accès:', err);
      setError('Erreur lors du chargement des accès');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAcces = (divisionId: string) => {
    setAccesActuels(prev => {
      const existe = prev.find(a => a.divisionId === divisionId);
      if (existe) {
        // Toggle: si déjà présent, on le désactive
        if (existe.peutLire || existe.peutEcrire || existe.peutGerer) {
          return prev.map(a =>
            a.divisionId === divisionId
              ? { ...a, peutLire: false, peutEcrire: false, peutGerer: false }
              : a
          );
        } else {
          // Sinon, on l'active avec lecture seule
          return prev.map(a =>
            a.divisionId === divisionId
              ? { ...a, peutLire: true }
              : a
          );
        }
      } else {
        // Ajouter un nouvel accès
        const division = divisions.find(d => d.id === divisionId);
        return [
          ...prev,
          {
            divisionId,
            divisionNom: division?.nom || '',
            peutLire: true,
            peutEcrire: false,
            peutGerer: false,
          }
        ];
      }
    });
  };

  const handleTogglePermission = (
    divisionId: string,
    permission: 'peutLire' | 'peutEcrire' | 'peutGerer'
  ) => {
    setAccesActuels(prev =>
      prev.map(a => {
        if (a.divisionId === divisionId) {
          const nouvelAcces = { ...a, [permission]: !a[permission] };
          // Si on désactive "lecture", désactiver aussi écriture et gestion
          if (permission === 'peutLire' && !nouvelAcces.peutLire) {
            nouvelAcces.peutEcrire = false;
            nouvelAcces.peutGerer = false;
          }
          // Si on active "écriture" ou "gestion", activer aussi lecture
          if ((permission === 'peutEcrire' || permission === 'peutGerer') && nouvelAcces[permission]) {
            nouvelAcces.peutLire = true;
          }
          return nouvelAcces;
        }
        return a;
      })
    );
  };

  const handleSauvegarder = async () => {
    if (!utilisateur) return;

    try {
      setLoading(true);
      setError(null);

      // Filtrer seulement les accès avec au moins une permission active
      const accesActifs = accesActuels.filter(
        a => a.peutLire || a.peutEcrire || a.peutGerer
      );

      // Formater pour l'API
      const accesData = accesActifs.map(a => ({
        divisionId: a.divisionId,
        peutLire: a.peutLire,
        peutEcrire: a.peutEcrire,
        peutGerer: a.peutGerer,
      }));

      await utilisateurService.gererAccesDivisions(utilisateur.id, accesData);
      setSuccess('Permissions sauvegardées avec succès');
      if (onSauvegarder) {
        onSauvegarder();
      }
    } catch (err: any) {
      console.error('Erreur sauvegarde:', err);
      setError(err.response?.data?.erreur || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  if (!utilisateur) {
    return (
      <p className="text-sm text-gray-500 italic p-4">
        Sélectionnez un utilisateur pour gérer ses accès aux divisions
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Types de permissions</h4>
        <div className="text-xs text-blue-800 space-y-1">
          <p>• <strong>Lecture</strong> : Peut voir les données de la division</p>
          <p>• <strong>Écriture</strong> : Peut modifier les données de la division</p>
          <p>• <strong>Gestion</strong> : Peut gérer complètement la division (y compris les utilisateurs)</p>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {divisions.map(division => {
          const acces = accesActuels.find(a => a.divisionId === division.id) || {
            divisionId: division.id,
            divisionNom: division.nom,
            peutLire: false,
            peutEcrire: false,
            peutGerer: false,
          };

          const estActif = acces.peutLire || acces.peutEcrire || acces.peutGerer;

          return (
            <Card key={division.id} className={estActif ? 'border-blue-300 bg-blue-50' : ''}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{division.nom}</h4>
                    <p className="text-xs text-gray-600">{division.code}</p>
                    {division.description && (
                      <p className="text-xs text-gray-500 mt-1">{division.description}</p>
                    )}
                  </div>
                  <Button
                    variant={estActif ? 'primaire' : 'outline'}
                    onClick={() => handleToggleAcces(division.id)}
                    className="py-1 px-3 text-sm shrink-0"
                  >
                    {estActif ? '✓ Accès actif' : 'Activer l\'accès'}
                  </Button>
                </div>

                {estActif && (
                  <div className="flex gap-4 pt-3 border-t">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acces.peutLire}
                        onChange={() => handleTogglePermission(division.id, 'peutLire')}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Lecture</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acces.peutEcrire}
                        onChange={() => handleTogglePermission(division.id, 'peutEcrire')}
                        disabled={!acces.peutLire}
                        className="w-4 h-4 text-blue-600 rounded disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-700">Écriture</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acces.peutGerer}
                        onChange={() => handleTogglePermission(division.id, 'peutGerer')}
                        disabled={!acces.peutLire}
                        className="w-4 h-4 text-blue-600 rounded disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-700">Gestion</span>
                    </label>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          type="button"
          onClick={handleSauvegarder}
          disabled={loading}
          variant="primaire"
        >
          {loading ? 'Sauvegarde...' : 'Sauvegarder les permissions'}
        </Button>
      </div>
    </div>
  );
};
