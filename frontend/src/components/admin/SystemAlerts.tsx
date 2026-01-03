import React, { useState, useEffect } from 'react';
import { tacheService } from '../../services/tacheService';
import { traducteurService } from '../../services/traducteurService';

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  detail?: string;
  icon: string;
}

/**
 * Widget d'alertes système
 * Affiche les problèmes ou situations à surveiller
 */
export const SystemAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const detecterAlertes = async () => {
      const alertes: Alert[] = [];

      try {
        // Vérifier les tâches en retard
        const taches = await tacheService.obtenirTaches();
        const tachesEnRetard = taches.filter(t => t.statut === 'EN_RETARD');
        if (tachesEnRetard.length > 0) {
          alertes.push({
            id: 'taches-retard',
            type: 'warning',
            message: `${tachesEnRetard.length} tâche(s) en retard`,
            detail: 'Des tâches ont dépassé leur échéance',
            icon: '⚠️'
          });
        }

        // Vérifier les tâches à échéance proche (48h)
        const maintenant = new Date();
        const dans48h = new Date(maintenant.getTime() + 48 * 60 * 60 * 1000);
        const tachesUrgentes = taches.filter(t => {
          const echeance = new Date(t.dateEcheance);
          return t.statut !== 'TERMINEE' && echeance <= dans48h && echeance > maintenant;
        });
        if (tachesUrgentes.length > 0) {
          alertes.push({
            id: 'taches-urgentes',
            type: 'info',
            message: `${tachesUrgentes.length} tâche(s) à échéance proche`,
            detail: 'Échéance dans moins de 48 heures',
            icon: '⏰'
          });
        }
      } catch (e) {
        console.error('Erreur détection alertes tâches:', e);
      }

      try {
        // Vérifier les traducteurs inactifs
        const traducteurs = await traducteurService.obtenirTraducteurs();
        const traducteursInactifs = traducteurs.filter(t => !t.actif);
        if (traducteursInactifs.length > 5) {
          alertes.push({
            id: 'traducteurs-inactifs',
            type: 'info',
            message: `${traducteursInactifs.length} traducteurs inactifs`,
            detail: 'Revue recommandée des profils',
            icon: '👥'
          });
        }

        // Vérifier les traducteurs disponibles pour du travail
        const traducteursDisponibles = traducteurs.filter(t => t.actif && t.disponiblePourTravail);
        if (traducteursDisponibles.length > 0) {
          alertes.push({
            id: 'traducteurs-disponibles',
            type: 'info',
            message: `${traducteursDisponibles.length} traducteur(s) disponible(s)`,
            detail: 'Cherchent activement du travail',
            icon: '✅'
          });
        }
      } catch (e) {
        console.error('Erreur détection alertes traducteurs:', e);
      }

      // Alerte système de base
      if (alertes.length === 0) {
        alertes.push({
          id: 'systeme-ok',
          type: 'info',
          message: 'Système fonctionnel',
          detail: 'Aucune alerte à signaler',
          icon: '✓'
        });
      }

      setAlerts(alertes);
      setLoading(false);
    };

    detecterAlertes();
    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(detecterAlertes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white border rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const getAlertStyle = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="bg-white border rounded-lg">
      <div className="px-4 py-3 border-b bg-gray-50/50">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <span>🔔</span> Alertes système
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded ${
            alerts.some(a => a.type === 'error') ? 'bg-red-100 text-red-700' :
            alerts.some(a => a.type === 'warning') ? 'bg-amber-100 text-amber-700' :
            'bg-green-100 text-green-700'
          }`}>
            {alerts.filter(a => a.type !== 'info').length || 0} alerte(s)
          </span>
        </div>
      </div>
      
      <div className="p-3 space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-3 rounded-lg border ${getAlertStyle(alert.type)}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{alert.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {alert.message}
                </p>
                {alert.detail && (
                  <p className="text-xs opacity-75 mt-0.5">
                    {alert.detail}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
