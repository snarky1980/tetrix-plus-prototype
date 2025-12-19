import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
// import { conflictService } from '../services/conflictService';

interface ConflictOverviewProps {
  traducteurId?: string;
  divisionId?: string;
  className?: string;
}

/**
 * Vue d'ensemble des conflits (pour dashboard conseiller)
 * Affiche un résumé agrégé des conflits détectés
 */
export const ConflictOverview: React.FC<ConflictOverviewProps> = ({ 
  traducteurId, 
  divisionId,
  className = '' 
}) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    surallocation: 0,
    chevauchement: 0,
    blocage: 0,
    horsTravail: 0,
    capaciteDepassee: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: API endpoint pour récupérer stats agrégées
    // Pour l'instant, simulation
    setLoading(true);
    setTimeout(() => {
      setStats({
        total: 12,
        surallocation: 5,
        chevauchement: 3,
        blocage: 2,
        horsTravail: 1,
        capaciteDepassee: 1,
      });
      setLoading(false);
    }, 500);
  }, [traducteurId, divisionId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <span>Détection de conflits</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {stats.total === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-green-700">Aucun conflit détecté</p>
            <p className="text-sm text-muted mt-1">
              Toutes les allocations sont cohérentes
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total avec badge */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-2 border-orange-200">
              <div>
                <p className="text-sm text-muted">Conflits actifs</p>
                <p className="text-3xl font-bold text-orange-600">{stats.total}</p>
              </div>
              <div className="p-3 bg-white rounded-full shadow-md">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
            </div>

            {/* Détail par type */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted">Répartition par type</p>
              
              {stats.surallocation > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm">Surallocation</span>
                  </div>
                  <span className="font-semibold text-red-600">{stats.surallocation}</span>
                </div>
              )}

              {stats.chevauchement > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm">Chevauchement</span>
                  </div>
                  <span className="font-semibold text-orange-600">{stats.chevauchement}</span>
                </div>
              )}

              {stats.blocage > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Blocage</span>
                  </div>
                  <span className="font-semibold text-yellow-600">{stats.blocage}</span>
                </div>
              )}

              {stats.horsTravail > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm">Hors heures</span>
                  </div>
                  <span className="font-semibold text-purple-600">{stats.horsTravail}</span>
                </div>
              )}

              {stats.capaciteDepassee > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Capacité dépassée</span>
                  </div>
                  <span className="font-semibold text-blue-600">{stats.capaciteDepassee}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <Button 
              variant="secondaire" 
              full
              className="mt-4"
              onClick={() => navigate('/conflict-resolution')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Résoudre les conflits
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
