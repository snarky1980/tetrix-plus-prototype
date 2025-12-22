import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/Spinner';
import { chargerPlanificationTraducteur, JourPlanification } from '../../utils/planificationTraducteur';

interface PlanificationTraducteurModalProps {
  traducteurId: string;
  ouvert: boolean;
  onFermer: () => void;
}

// Formater la date en français
const formatDateFr = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  };
  return date.toLocaleDateString('fr-CA', options);
};

// Obtenir la couleur de la barre de progression
const getCouleurBarre = (pourcentage: number): string => {
  if (pourcentage >= 100) return 'bg-red-500';
  if (pourcentage >= 80) return 'bg-orange-500';
  if (pourcentage >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
};

/**
 * Modal affichant la planification d'un traducteur sur les prochains jours
 */
export const PlanificationTraducteurModal: React.FC<PlanificationTraducteurModalProps> = ({
  traducteurId,
  ouvert,
  onFermer,
}) => {
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [traducteur, setTraducteur] = useState<any>(null);
  const [planification, setPlanification] = useState<JourPlanification[]>([]);

  useEffect(() => {
    if (ouvert && traducteurId) {
      chargerDonnees();
    }
  }, [ouvert, traducteurId]);

  const chargerDonnees = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const { traducteur: trad, planification: plan } = await chargerPlanificationTraducteur(traducteurId, 14);
      setTraducteur(trad);
      setPlanification(plan);
    } catch (err: any) {
      setErreur(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  if (!ouvert) return null;

  return (
    <Modal
      titre={traducteur ? `📅 Planification - ${traducteur.nom}` : '📅 Planification'}
      ouvert={ouvert}
      onFermer={onFermer}
      wide={true}
    >
      {loading ? (
        <div className="py-12">
          <LoadingSpinner message="Chargement de la planification..." />
        </div>
      ) : erreur ? (
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">❌ {erreur}</p>
          <Button onClick={chargerDonnees}>Réessayer</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Info traducteur */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{traducteur?.nom}</h3>
                <p className="text-sm text-muted">
                  {traducteur?.divisions?.join(', ') || 'Division non spécifiée'}
                  {traducteur?.horaire && ` • Horaire: ${traducteur.horaire}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted">Capacité/jour</p>
                <p className="text-xl font-bold text-blue-600">
                  {traducteur?.capaciteHeuresParJour || 7}h
                </p>
              </div>
            </div>
          </div>

          {/* Calendrier des jours */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {planification.length === 0 ? (
              <p className="text-center text-muted py-8">Aucun jour à afficher</p>
            ) : (
              planification.map((jour) => {
                const pourcentage = jour.capacite > 0 
                  ? Math.round((jour.heuresUtilisees / jour.capacite) * 100) 
                  : 0;
                const heuresRestantes = Math.max(0, jour.capacite - jour.heuresUtilisees);
                
                return (
                  <div 
                    key={jour.date} 
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                  >
                    {/* En-tête du jour */}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium capitalize">
                          {formatDateFr(jour.jour)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className={`font-semibold ${pourcentage >= 100 ? 'text-red-600' : 'text-gray-700'}`}>
                          {jour.heuresUtilisees.toFixed(1)}h / {jour.capacite}h
                        </span>
                        {heuresRestantes > 0 && (
                          <span className="text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded">
                            {heuresRestantes.toFixed(1)}h libre
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Barre de progression */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${getCouleurBarre(pourcentage)}`}
                        style={{ width: `${Math.min(pourcentage, 100)}%` }}
                      />
                    </div>

                    {/* Liste des tâches */}
                    {jour.taches.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {jour.taches.map((tache, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1"
                          >
                            <span className="font-medium text-primary">
                              {tache.numeroProjet}
                            </span>
                            <div className="flex items-center gap-2 text-muted">
                              <span>{tache.typeTache}</span>
                              {/* Afficher les plages horaires */}
                              {tache.plages && tache.plages.length > 1 ? (
                                // Plages fractionnées (avec pause dîner)
                                <span className="text-gray-600">
                                  {tache.plages.map((p, i) => (
                                    <span key={i}>
                                      {i > 0 && ' • '}
                                      {p.debut}-{p.fin}
                                    </span>
                                  ))}
                                </span>
                              ) : tache.heureDebut && tache.heureFin ? (
                                <span>{tache.heureDebut}-{tache.heureFin}</span>
                              ) : null}
                              <span className="font-semibold text-gray-700">
                                {tache.heures}h
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {jour.taches.length === 0 && (
                      <p className="text-xs text-muted italic">Aucune tâche planifiée</p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" onClick={onFermer}>
              Fermer
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PlanificationTraducteurModal;
