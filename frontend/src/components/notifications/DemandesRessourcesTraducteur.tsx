import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/Spinner';
import { notificationService, DemandeRessource } from '../../services/notificationService';

const urgenceColors: Record<string, string> = {
  FAIBLE: 'bg-green-100 text-green-800 border-green-300',
  NORMALE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  HAUTE: 'bg-orange-100 text-orange-800 border-orange-300',
  CRITIQUE: 'bg-red-100 text-red-800 border-red-300 animate-pulse',
};

const urgenceIcons: Record<string, string> = {
  FAIBLE: '🟢',
  NORMALE: '🟡',
  HAUTE: '🟠',
  CRITIQUE: '🔴',
};

interface InteretState {
  [demandeId: string]: {
    interesse: boolean;
    loading: boolean;
    message: string;
  };
}

/**
 * Affiche les demandes de ressources actives pour les traducteurs
 * Permet aux traducteurs de manifester leur intérêt directement
 */
export const DemandesRessourcesTraducteur: React.FC = () => {
  const [demandes, setDemandes] = useState<DemandeRessource[]>([]);
  const [loading, setLoading] = useState(true);
  const [interets, setInterets] = useState<InteretState>({});

  useEffect(() => {
    chargerDemandes();
  }, []);

  const chargerDemandes = async () => {
    try {
      const data = await notificationService.obtenirDemandesRessources();
      setDemandes(data);
      
      // Initialiser l'état des intérêts
      const initialInterets: InteretState = {};
      data.forEach(d => {
        initialInterets[d.id] = {
          interesse: !!d.monInteret,
          loading: false,
          message: d.monInteret?.message || '',
        };
      });
      setInterets(initialInterets);
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleInteret = async (demandeId: string) => {
    const current = interets[demandeId];
    if (!current || current.loading) return;

    setInterets(prev => ({
      ...prev,
      [demandeId]: { ...prev[demandeId], loading: true },
    }));

    try {
      if (current.interesse) {
        await notificationService.retirerInteret(demandeId);
        setInterets(prev => ({
          ...prev,
          [demandeId]: { interesse: false, loading: false, message: '' },
        }));
      } else {
        await notificationService.manifesterInteret(demandeId, current.message || undefined);
        setInterets(prev => ({
          ...prev,
          [demandeId]: { ...prev[demandeId], interesse: true, loading: false },
        }));
      }
    } catch (error) {
      console.error('Erreur toggle intérêt:', error);
      setInterets(prev => ({
        ...prev,
        [demandeId]: { ...prev[demandeId], loading: false },
      }));
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (demandes.length === 0) {
    return null; // Ne rien afficher s'il n'y a pas de demandes
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">📢</span>
          Ressources recherchées ({demandes.length})
        </CardTitle>
        <p className="text-sm text-muted mt-1">
          Les conseillers recherchent des traducteurs disponibles
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {demandes.map(demande => {
            const interet = interets[demande.id] || { interesse: false, loading: false, message: '' };
            
            return (
              <div 
                key={demande.id} 
                className={`p-4 bg-white rounded-lg border-2 shadow-sm transition-all ${
                  interet.interesse 
                    ? 'border-emerald-400 ring-2 ring-emerald-200' 
                    : urgenceColors[demande.urgence]
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{urgenceIcons[demande.urgence]}</span>
                      <h4 className="font-semibold text-gray-900">{demande.titre}</h4>
                      {interet.interesse && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                          ✓ Intérêt manifesté
                        </span>
                      )}
                    </div>
                    {demande.description && (
                      <p className="text-sm text-gray-600 mb-2">{demande.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {demande.heuresEstimees && (
                        <span className="flex items-center gap-1">
                          <span>⏱️</span>
                          <span>{demande.heuresEstimees}h de travail</span>
                        </span>
                      )}
                      {demande.langueSource && demande.langueCible && (
                        <span className="flex items-center gap-1">
                          <span>🌐</span>
                          <span>{demande.langueSource} → {demande.langueCible}</span>
                        </span>
                      )}
                      {demande.division && (
                        <span className="flex items-center gap-1">
                          <span>🏢</span>
                          <span>{demande.division}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span>👤</span>
                        <span>
                          {demande.conseiller?.prenom 
                            ? `${demande.conseiller.prenom} ${demande.conseiller.nom || ''}`.trim()
                            : demande.conseiller?.email || 'Conseiller'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span>📅</span>
                        <span>{new Date(demande.creeLe).toLocaleDateString('fr-CA')}</span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Bouton d'intérêt */}
                  <div className="flex-shrink-0">
                    <Button
                      onClick={() => toggleInteret(demande.id)}
                      disabled={interet.loading}
                      variant={interet.interesse ? 'secondary' : 'default'}
                      size="sm"
                      className={interet.interesse 
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-300' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }
                    >
                      {interet.loading ? (
                        <span className="flex items-center gap-1">
                          <span className="animate-spin">⏳</span>
                        </span>
                      ) : interet.interesse ? (
                        <span className="flex items-center gap-1">
                          <span>✓</span>
                          <span>Intéressé</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <span>🙋</span>
                          <span>Je suis intéressé</span>
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
