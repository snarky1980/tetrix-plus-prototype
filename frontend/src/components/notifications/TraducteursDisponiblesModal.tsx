import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { traducteurService } from '../../services/traducteurService';
import { Traducteur } from '../../types';
import { useNavigate } from 'react-router-dom';

interface TraducteursDisponiblesModalProps {
  ouvert: boolean;
  onFermer: () => void;
}

/**
 * Modal affichant la liste des traducteurs qui cherchent du travail
 * (ceux qui ont activé le flag `disponiblePourTravail`)
 */
export const TraducteursDisponiblesModal: React.FC<TraducteursDisponiblesModalProps> = ({
  ouvert,
  onFermer,
}) => {
  const navigate = useNavigate();
  const [traducteurs, setTraducteurs] = useState<Traducteur[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ouvert) {
      chargerTraducteurs();
    }
  }, [ouvert]);

  const chargerTraducteurs = async () => {
    setLoading(true);
    try {
      const data = await traducteurService.obtenirTraducteurs({});
      // Filtrer seulement ceux qui cherchent du travail
      const disponibles = data.filter(t => t.actif && t.disponiblePourTravail);
      setTraducteurs(disponibles);
    } catch (error) {
      console.error('Erreur chargement traducteurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const voirPlanification = (traducteurId: string) => {
    onFermer();
    navigate(`/planification-globale?highlight=${traducteurId}`);
  };

  const creerTachePour = (traducteurId: string) => {
    onFermer();
    navigate(`/conseiller/creation-tache?traducteurId=${traducteurId}`);
  };

  const getCategorieColor = (categorie: string) => {
    switch (categorie) {
      case 'TR01': return 'bg-amber-100 text-amber-800';
      case 'TR02': return 'bg-blue-100 text-blue-800';
      case 'TR03': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Modal 
      titre="✋ Traducteurs disponibles" 
      ouvert={ouvert} 
      onFermer={onFermer}
      extraWide
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Ces traducteurs ont signalé qu'ils cherchent du travail et sont disponibles pour recevoir de nouvelles tâches.
        </p>

        {loading ? (
          <LoadingSpinner message="Chargement..." />
        ) : traducteurs.length === 0 ? (
          <EmptyState
            icon="😴"
            title="Aucun traducteur disponible"
            description="Aucun traducteur n'a activé son statut de disponibilité pour le moment."
          />
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {traducteurs.map(traducteur => (
              <div 
                key={traducteur.id} 
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">✋</span>
                      <h3 className="font-semibold text-lg">{traducteur.nom}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategorieColor(traducteur.categorie)}`}>
                        {traducteur.categorie}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      {/* Divisions */}
                      {traducteur.divisions && traducteur.divisions.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">📂 Divisions:</span>
                          <div className="flex flex-wrap gap-1">
                            {traducteur.divisions.map((div, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                {div}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Capacité */}
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">⏱️ Capacité:</span>
                        <span className="font-medium">{traducteur.capaciteHeuresParJour}h/jour</span>
                      </div>

                      {/* Paires linguistiques */}
                      {traducteur.pairesLinguistiques && traducteur.pairesLinguistiques.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">🌐 Langues:</span>
                          <div className="flex flex-wrap gap-1">
                            {traducteur.pairesLinguistiques.map((pl, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                {pl.langueSource} → {pl.langueCible}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Spécialisations */}
                      {traducteur.specialisations && traducteur.specialisations.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">🎯 Spécialisations:</span>
                          <div className="flex flex-wrap gap-1">
                            {traducteur.specialisations.slice(0, 3).map((spec, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                {spec}
                              </span>
                            ))}
                            {traducteur.specialisations.length > 3 && (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                +{traducteur.specialisations.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t">
                  <Button 
                    variant="primaire" 
                    size="sm"
                    onClick={() => creerTachePour(traducteur.id)}
                  >
                    📝 Créer une tâche
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => voirPlanification(traducteur.id)}
                  >
                    📅 Voir planning
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onFermer}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
