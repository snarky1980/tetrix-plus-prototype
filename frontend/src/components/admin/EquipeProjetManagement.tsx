import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { InfoTooltip } from '../ui/Tooltip';
import { equipeProjetService, EquipeProjet, COULEURS_EQUIPE } from '../../services/equipeProjetService';
import { traducteurService } from '../../services/traducteurService';
import { clientService } from '../../services/clientService';
import { Traducteur } from '../../types';

interface Client {
  id: string;
  nom: string;
}

export const EquipeProjetManagement: React.FC = () => {
  const [equipes, setEquipes] = useState<EquipeProjet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [modalMembres, setModalMembres] = useState(false);
  const [equipeSelectionnee, setEquipeSelectionnee] = useState<EquipeProjet | null>(null);
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filtreActif, setFiltreActif] = useState<'tous' | 'actif' | 'inactif' | 'archive'>('actif');
  
  // Form state
  const [formData, setFormData] = useState({
    nom: '',
    code: '',
    description: '',
    couleur: '#3B82F6',
    clientId: '',
    clientNom: '',
    objectif: '',
    dateDebut: '',
    dateFin: '',
  });
  
  const [ajoutMembre, setAjoutMembre] = useState({
    traducteurId: '',
    role: 'MEMBRE' as 'RESPONSABLE' | 'MEMBRE' | 'REVISEUR',
  });

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const [equipesData, traducteursData, clientsData] = await Promise.all([
        equipeProjetService.lister(),
        traducteurService.obtenirTraducteurs({}),
        clientService.obtenirClients(),
      ]);
      setEquipes(equipesData);
      setTraducteurs(traducteursData);
      setClients(clientsData);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  // Filtrer les équipes
  const equipesFiltrees = equipes.filter(e => {
    if (filtreActif === 'tous') return true;
    if (filtreActif === 'archive') return e.archive;
    if (filtreActif === 'actif') return e.actif && !e.archive;
    if (filtreActif === 'inactif') return !e.actif && !e.archive;
    return true;
  });

  const ouvrirCreation = () => {
    setEquipeSelectionnee(null);
    setFormData({
      nom: '',
      code: '',
      description: '',
      couleur: '#3B82F6',
      clientId: '',
      clientNom: '',
      objectif: '',
      dateDebut: '',
      dateFin: '',
    });
    setModalOuvert(true);
  };

  const ouvrirEdition = (equipe: EquipeProjet) => {
    setEquipeSelectionnee(equipe);
    setFormData({
      nom: equipe.nom,
      code: equipe.code,
      description: equipe.description || '',
      couleur: equipe.couleur,
      clientId: equipe.clientId || '',
      clientNom: equipe.clientNom || '',
      objectif: equipe.objectif || '',
      dateDebut: equipe.dateDebut ? equipe.dateDebut.split('T')[0] : '',
      dateFin: equipe.dateFin ? equipe.dateFin.split('T')[0] : '',
    });
    setModalOuvert(true);
  };

  const ouvrirGestionMembres = (equipe: EquipeProjet) => {
    setEquipeSelectionnee(equipe);
    setAjoutMembre({ traducteurId: '', role: 'MEMBRE' });
    setModalMembres(true);
  };

  const handleSauvegarder = async () => {
    try {
      // Trouver le nom du client si un clientId est sélectionné
      let clientNom = formData.clientNom;
      if (formData.clientId) {
        const client = clients.find(c => c.id === formData.clientId);
        clientNom = client?.nom || '';
      }
      
      const data = {
        ...formData,
        clientNom,
        clientId: formData.clientId || undefined,
        dateDebut: formData.dateDebut || undefined,
        dateFin: formData.dateFin || undefined,
      };
      
      if (equipeSelectionnee) {
        await equipeProjetService.modifier(equipeSelectionnee.id, data);
      } else {
        await equipeProjetService.creer(data);
      }
      
      setModalOuvert(false);
      chargerDonnees();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erreur lors de la sauvegarde');
    }
  };

  const handleToggleActif = async (equipe: EquipeProjet) => {
    try {
      await equipeProjetService.toggleActif(equipe.id, !equipe.actif);
      chargerDonnees();
    } catch (error) {
      console.error('Erreur toggle actif:', error);
    }
  };

  const handleArchiver = async (equipe: EquipeProjet) => {
    if (!confirm(`Archiver l'équipe "${equipe.nom}" ? Elle ne sera plus modifiable.`)) return;
    try {
      await equipeProjetService.archiver(equipe.id);
      chargerDonnees();
    } catch (error) {
      console.error('Erreur archivage:', error);
    }
  };

  const handleDesarchiver = async (equipe: EquipeProjet) => {
    try {
      await equipeProjetService.desarchiver(equipe.id);
      chargerDonnees();
    } catch (error) {
      console.error('Erreur désarchivage:', error);
    }
  };

  const handleSupprimer = async (equipe: EquipeProjet) => {
    if (!confirm(`Supprimer définitivement l'équipe "${equipe.nom}" ?`)) return;
    try {
      await equipeProjetService.supprimer(equipe.id);
      chargerDonnees();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const handleAjouterMembre = async () => {
    if (!equipeSelectionnee || !ajoutMembre.traducteurId) return;
    try {
      await equipeProjetService.ajouterMembre(equipeSelectionnee.id, ajoutMembre);
      setAjoutMembre({ traducteurId: '', role: 'MEMBRE' });
      chargerDonnees();
      // Rafraîchir l'équipe sélectionnée
      const updated = await equipeProjetService.obtenir(equipeSelectionnee.id);
      setEquipeSelectionnee({ ...equipeSelectionnee, membres: updated.membres as any });
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erreur lors de l\'ajout');
    }
  };

  const handleRetirerMembre = async (membreId: string) => {
    if (!equipeSelectionnee) return;
    try {
      await equipeProjetService.retirerMembre(equipeSelectionnee.id, membreId);
      chargerDonnees();
      const updated = await equipeProjetService.obtenir(equipeSelectionnee.id);
      setEquipeSelectionnee({ ...equipeSelectionnee, membres: updated.membres as any });
    } catch (error) {
      console.error('Erreur retrait membre:', error);
    }
  };

  const handleChangerRole = async (membreId: string, role: string) => {
    if (!equipeSelectionnee) return;
    try {
      await equipeProjetService.modifierMembre(equipeSelectionnee.id, membreId, { role });
      chargerDonnees();
      const updated = await equipeProjetService.obtenir(equipeSelectionnee.id);
      setEquipeSelectionnee({ ...equipeSelectionnee, membres: updated.membres as any });
    } catch (error) {
      console.error('Erreur changement rôle:', error);
    }
  };

  // Traducteurs disponibles (pas encore dans l'équipe)
  const traducteursDisponibles = traducteurs.filter(t => 
    t.actif && !equipeSelectionnee?.membres.some(m => m.traducteurId === t.id)
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Équipes-projet</CardTitle>
                <InfoTooltip 
                  content="Groupes temporaires de traducteurs pour des projets spéciaux (ex: backlog SATG, projet urgent). Une équipe peut regrouper des traducteurs de différentes divisions."
                  size="md"
                />
              </div>
              <p className="text-sm text-muted mt-1">
                Regroupements flexibles de traducteurs pour projets spéciaux
              </p>
            </div>
            <Button variant="primaire" onClick={ouvrirCreation}>
              + Nouvelle équipe
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtres */}
          <div className="flex gap-2 mb-4 items-center">
            <span className="text-xs text-gray-500 flex items-center gap-1 mr-2">
              Statut
              <InfoTooltip 
                content="Active = en cours d'utilisation. Inactive = en pause. Archivée = terminée (lecture seule)."
                size="sm"
              />
            </span>
            {(['tous', 'actif', 'inactif', 'archive'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltreActif(f)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  filtreActif === f
                    ? 'bg-primaire text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'tous' ? 'Toutes' : f === 'actif' ? 'Actives' : f === 'inactif' ? 'Inactives' : 'Archivées'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted">Chargement...</div>
          ) : equipesFiltrees.length === 0 ? (
            <div className="text-center py-8 text-muted">
              Aucune équipe-projet {filtreActif !== 'tous' ? `(${filtreActif})` : ''}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {equipesFiltrees.map(equipe => (
                <div
                  key={equipe.id}
                  className={`border rounded-lg p-4 ${
                    equipe.archive ? 'bg-gray-50 opacity-75' : !equipe.actif ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  {/* Header avec couleur */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: equipe.couleur }}
                      />
                      <span className="font-semibold">{equipe.nom}</span>
                    </div>
                    <Badge variant={equipe.archive ? 'default' : equipe.actif ? 'success' : 'warning'}>
                      {equipe.archive ? 'Archivée' : equipe.actif ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  {/* Code */}
                  <div className="text-xs text-gray-500 mb-2">
                    Code: <span className="font-mono">{equipe.code}</span>
                  </div>
                  
                  {/* Client/Objectif */}
                  {equipe.clientNom && (
                    <div className="text-sm mb-1">
                      <span className="text-gray-500">Client:</span> {equipe.clientNom}
                    </div>
                  )}
                  {equipe.objectif && (
                    <div className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {equipe.objectif}
                    </div>
                  )}
                  
                  {/* Membres */}
                  <div className="mb-3">
                    <div className="text-sm text-gray-500 mb-1">
                      {equipe.membresCount} membre(s)
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {equipe.membres.slice(0, 4).map(m => (
                        <span 
                          key={m.id}
                          className="text-xs px-1.5 py-0.5 bg-gray-100 rounded"
                          title={`${m.nom} (${m.role})`}
                        >
                          {m.nom.split(' ')[0]}
                          {m.role === 'RESPONSABLE' && ' ★'}
                        </span>
                      ))}
                      {equipe.membres.length > 4 && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-200 rounded">
                          +{equipe.membres.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-wrap gap-1 pt-2 border-t">
                    <button
                      onClick={() => ouvrirGestionMembres(equipe)}
                      className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      👥 Membres
                    </button>
                    {!equipe.archive && (
                      <>
                        <button
                          onClick={() => ouvrirEdition(equipe)}
                          className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          ✏️ Modifier
                        </button>
                        <button
                          onClick={() => handleToggleActif(equipe)}
                          className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          {equipe.actif ? '⏸️ Désactiver' : '▶️ Activer'}
                        </button>
                        <button
                          onClick={() => handleArchiver(equipe)}
                          className="text-xs px-2 py-1 text-orange-600 hover:bg-orange-50 rounded"
                        >
                          📦 Archiver
                        </button>
                      </>
                    )}
                    {equipe.archive && (
                      <button
                        onClick={() => handleDesarchiver(equipe)}
                        className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        📤 Désarchiver
                      </button>
                    )}
                    <button
                      onClick={() => handleSupprimer(equipe)}
                      className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal création/édition */}
      <Modal
        ouvert={modalOuvert}
        onFermer={() => setModalOuvert(false)}
        titre={equipeSelectionnee ? 'Modifier l\'équipe' : 'Nouvelle équipe-projet'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                Nom *
                <InfoTooltip content="Nom descriptif de l'équipe, visible partout dans le système" size="sm" />
              </label>
              <Input
                value={formData.nom}
                onChange={e => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Équipe SATG"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                Code *
                <InfoTooltip content="Identifiant court unique pour références rapides (ex: filtres, exports)" size="sm" />
              </label>
              <Input
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Ex: SATG-BL"
                className="font-mono"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm"
              rows={2}
              placeholder="Description de l'équipe..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Objectif</label>
            <Input
              value={formData.objectif}
              onChange={e => setFormData({ ...formData, objectif: e.target.value })}
              placeholder="Ex: Rattrapage backlog Q4 2025"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Client (optionnel)</label>
              <select
                value={formData.clientId}
                onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              >
                <option value="">-- Aucun --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Couleur</label>
              <div className="flex flex-wrap gap-1">
                {COULEURS_EQUIPE.map(c => (
                  <button
                    key={c.hex}
                    onClick={() => setFormData({ ...formData, couleur: c.hex })}
                    className={`w-6 h-6 rounded-full border-2 ${
                      formData.couleur === c.hex ? 'border-gray-800' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.nom}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date début</label>
              <Input
                type="date"
                value={formData.dateDebut}
                onChange={e => setFormData({ ...formData, dateDebut: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date fin (optionnel)</label>
              <Input
                type="date"
                value={formData.dateFin}
                onChange={e => setFormData({ ...formData, dateFin: e.target.value })}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setModalOuvert(false)}>
              Annuler
            </Button>
            <Button 
              variant="primaire" 
              onClick={handleSauvegarder}
              disabled={!formData.nom || !formData.code}
            >
              {equipeSelectionnee ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal gestion des membres */}
      <Modal
        ouvert={modalMembres}
        onFermer={() => setModalMembres(false)}
        titre={`Membres - ${equipeSelectionnee?.nom || ''}`}
      >
        {equipeSelectionnee && (
          <div className="space-y-4">
            {/* Ajouter un membre */}
            {!equipeSelectionnee.archive && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium mb-2">Ajouter un membre</div>
                <div className="flex gap-2">
                  <select
                    value={ajoutMembre.traducteurId}
                    onChange={e => setAjoutMembre({ ...ajoutMembre, traducteurId: e.target.value })}
                    className="flex-1 border rounded-lg p-2 text-sm"
                  >
                    <option value="">-- Sélectionner --</option>
                    {traducteursDisponibles.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nom} ({t.categorie ? `TR-0${t.categorie.slice(-1)}` : ''})
                      </option>
                    ))}
                  </select>
                  <select
                    value={ajoutMembre.role}
                    onChange={e => setAjoutMembre({ ...ajoutMembre, role: e.target.value as any })}
                    className="w-32 border rounded-lg p-2 text-sm"
                  >
                    <option value="MEMBRE">Membre</option>
                    <option value="RESPONSABLE">Responsable</option>
                    <option value="REVISEUR">Réviseur</option>
                  </select>
                  <Button
                    variant="primaire"
                    onClick={handleAjouterMembre}
                    disabled={!ajoutMembre.traducteurId}
                  >
                    +
                  </Button>
                </div>
              </div>
            )}
            
            {/* Liste des membres */}
            <div>
              <div className="text-sm font-medium mb-2">
                {equipeSelectionnee.membres.length} membre(s)
              </div>
              {equipeSelectionnee.membres.length === 0 ? (
                <div className="text-center py-4 text-muted">Aucun membre</div>
              ) : (
                <div className="space-y-2">
                  {equipeSelectionnee.membres.map(membre => (
                    <div
                      key={membre.id}
                      className="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium text-sm">{membre.nom}</div>
                          <div className="text-xs text-gray-500">
                            {membre.classification} • {membre.divisions?.join(', ') || '-'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={membre.role}
                          onChange={e => handleChangerRole(membre.id, e.target.value)}
                          disabled={equipeSelectionnee.archive}
                          className="text-xs border rounded p-1"
                        >
                          <option value="MEMBRE">Membre</option>
                          <option value="RESPONSABLE">Responsable</option>
                          <option value="REVISEUR">Réviseur</option>
                        </select>
                        {!equipeSelectionnee.archive && (
                          <button
                            onClick={() => handleRetirerMembre(membre.id)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                            title="Retirer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setModalMembres(false)}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default EquipeProjetManagement;
