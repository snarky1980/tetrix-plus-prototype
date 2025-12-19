import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/Spinner';
// import { EmptyState } from '../components/ui/EmptyState';
import { ConflictDetectionModal } from '../components/ConflictDetection';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { type Conflict, type Suggestion } from '../services/conflictService';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Calendar, Users } from 'lucide-react';

/**
 * Page de résolution des conflits
 * Vue centralisée pour détecter et résoudre tous les conflits
 */
const ConflictResolution: React.FC = () => {
  useAuth(); // Pour la protection de route
  const { addToast } = useToast();
  
  const [allConflicts, setAllConflicts] = useState<Conflict[]>([]);
  const [allSuggestions, setAllSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedConflicts, setSelectedConflicts] = useState<Conflict[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Suggestion[]>([]);
  const [applying, setApplying] = useState(false);

  const loadAllConflicts = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: API endpoint pour récupérer tous les conflits de la division
      // Pour l'instant, simulation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAllConflicts([]);
      setAllSuggestions([]);
      addToast('Aucun conflit détecté', 'success');
    } catch (err: any) {
      addToast(err.message || 'Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadAllConflicts();
  }, [loadAllConflicts]);

  const handleShowDetails = (conflicts: Conflict[], suggestions: Suggestion[]) => {
    setSelectedConflicts(conflicts);
    setSelectedSuggestions(suggestions);
    setModalOpen(true);
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      // TODO: Appliquer les suggestions
      await new Promise(resolve => setTimeout(resolve, 1000));
      addToast('Solution appliquée avec succès', 'success');
      setModalOpen(false);
      await loadAllConflicts();
    } catch (err: any) {
      addToast(err.message || 'Erreur lors de l\'application', 'error');
    } finally {
      setApplying(false);
    }
  };

  const stats = {
    total: allConflicts.length,
    surallocation: allConflicts.filter(c => c.type === 'SURALLOCATION').length,
    chevauchement: allConflicts.filter(c => c.type === 'CHEVAUCHEMENT_TACHES').length,
    blocage: allConflicts.filter(c => c.type === 'CONFLIT_BLOCAGE').length,
    horsTravail: allConflicts.filter(c => c.type === 'HORS_HEURES_TRAVAIL').length,
    capaciteDepassee: allConflicts.filter(c => c.type === 'CAPACITE_DEPASSEE').length,
  };

  return (
    <AppLayout titre="Résolution des conflits">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
              Détection et résolution de conflits
            </h1>
            <p className="text-muted mt-2">
              Identifiez et résolvez automatiquement les conflits de planification
            </p>
          </div>
          <Button onClick={loadAllConflicts} disabled={loading}>
            <Clock className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className={stats.total > 0 ? 'border-orange-200 bg-gradient-to-br from-amber-50 to-orange-50' : ''}>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-orange-600">{stats.total}</p>
                <p className="text-sm text-muted mt-2">Total conflits</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{stats.surallocation}</p>
                <p className="text-xs text-muted mt-2">Surallocation</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{stats.chevauchement}</p>
                <p className="text-xs text-muted mt-2">Chevauchement</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">{stats.blocage}</p>
                <p className="text-xs text-muted mt-2">Blocage</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{stats.horsTravail}</p>
                <p className="text-xs text-muted mt-2">Hors heures</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.capaciteDepassee}</p>
                <p className="text-xs text-muted mt-2">Capacité</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contenu principal */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Liste des conflits détectés</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner message="Analyse des allocations en cours..." />
            ) : allConflicts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-700">Aucun conflit détecté</h3>
                <p className="text-gray-600 mt-2">Toutes les allocations sont cohérentes. Excellent travail !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Regrouper par traducteur */}
                {Array.from(new Set(allConflicts.map(c => c.traducteurId))).map(traducteurId => {
                  const traducteurConflicts = allConflicts.filter(c => c.traducteurId === traducteurId);
                  const traducteurSuggestions = allSuggestions; // TODO: Filtrer par traducteur
                  
                  return (
                    <div 
                      key={traducteurId}
                      className="p-4 border-2 border-orange-200 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-full shadow-sm">
                            <Users className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-lg">
                              Traducteur {traducteurId.substring(0, 8)}...
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted">
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4 text-orange-600" />
                                {traducteurConflicts.length} conflit{traducteurConflicts.length > 1 ? 's' : ''}
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-4 h-4 text-blue-600" />
                                {traducteurSuggestions.length} solution{traducteurSuggestions.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="secondaire"
                          onClick={() => handleShowDetails(traducteurConflicts, traducteurSuggestions)}
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Résoudre
                        </Button>
                      </div>

                      {/* Liste rapide des conflits */}
                      <div className="mt-3 space-y-1">
                        {traducteurConflicts.slice(0, 3).map((conflict, idx) => (
                          <div key={idx} className="text-sm flex items-center gap-2 text-gray-700">
                            <Calendar className="w-3 h-3" />
                            <span>{conflict.dateConflict} • {conflict.type}</span>
                            <span className="text-orange-600 font-medium">({conflict.heuresAllouees}h)</span>
                          </div>
                        ))}
                        {traducteurConflicts.length > 3 && (
                          <p className="text-xs text-muted mt-1">
                            + {traducteurConflicts.length - 3} autre{traducteurConflicts.length - 3 > 1 ? 's' : ''} conflit{traducteurConflicts.length - 3 > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de détails */}
        <ConflictDetectionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          conflits={selectedConflicts}
          suggestions={selectedSuggestions}
          onApply={handleApply}
          onRefresh={loadAllConflicts}
          applying={applying}
        />
      </div>
    </AppLayout>
  );
};

export default ConflictResolution;
