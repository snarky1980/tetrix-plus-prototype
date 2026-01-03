import React, { useState, useEffect } from 'react';
import { tacheService } from '../../services/tacheService';
import { traducteurService } from '../../services/traducteurService';
import { utilisateurService } from '../../services/utilisateurService';

interface ActivityItem {
  id: string;
  type: 'tache' | 'traducteur' | 'utilisateur' | 'systeme';
  message: string;
  timestamp: Date;
  icon: string;
}

interface ActivityLogProps {
  maxItems?: number;
}

/**
 * Widget Journal d'activité récente
 * Affiche les dernières modifications dans le système
 */
export const ActivityLog: React.FC<ActivityLogProps> = ({ maxItems = 8 }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const chargerActivites = async () => {
      try {
        const items: ActivityItem[] = [];

        // Charger les dernières tâches créées/modifiées
        try {
          const taches = await tacheService.obtenirTaches();
          const tachesRecentes = taches
            .sort((a, b) => new Date(b.creeLe).getTime() - new Date(a.creeLe).getTime())
            .slice(0, 5);
          
          tachesRecentes.forEach(t => {
            items.push({
              id: `tache-${t.id}`,
              type: 'tache',
              message: `Tâche ${t.numeroProjet} - ${t.statut}`,
              timestamp: new Date(t.creeLe),
              icon: '📋'
            });
          });
        } catch (e) {
          console.error('Erreur chargement tâches:', e);
        }

        // Charger les derniers traducteurs modifiés
        try {
          const traducteurs = await traducteurService.obtenirTraducteurs();
          const traducteursRecents = traducteurs
            .filter(t => t.actif !== undefined)
            .slice(0, 3);
          
          traducteursRecents.forEach(t => {
            items.push({
              id: `trad-${t.id}`,
              type: 'traducteur',
              message: `Traducteur ${t.nom} - ${t.actif ? 'Actif' : 'Inactif'}`,
              timestamp: new Date(), // Date approximative
              icon: '👤'
            });
          });
        } catch (e) {
          console.error('Erreur chargement traducteurs:', e);
        }

        // Charger les derniers utilisateurs
        try {
          const utilisateurs = await utilisateurService.obtenirUtilisateurs();
          // Prendre les derniers utilisateurs (pas de date de création disponible)
          const utilisateursRecents = utilisateurs.slice(0, 3);
          
          utilisateursRecents.forEach(u => {
            items.push({
              id: `user-${u.id}`,
              type: 'utilisateur',
              message: `Utilisateur ${u.prenom || ''} ${u.nom || ''} (${u.role})`.trim(),
              timestamp: new Date(), // Date approximative
              icon: '🔐'
            });
          });
        } catch (e) {
          console.error('Erreur chargement utilisateurs:', e);
        }

        // Trier par timestamp et limiter
        const sorted = items
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, maxItems);

        setActivities(sorted);
      } catch (error) {
        console.error('Erreur chargement activités:', error);
      } finally {
        setLoading(false);
      }
    };

    chargerActivites();
  }, [maxItems]);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-CA');
  };

  if (loading) {
    return (
      <div className="bg-white border rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          <div className="h-3 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg">
      <div className="px-4 py-3 border-b bg-gray-50/50">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <span>📝</span> Activité récente
          </h3>
          <span className="text-xs text-gray-500">
            {activities.length} élément(s)
          </span>
        </div>
      </div>
      
      <div className="divide-y max-h-80 overflow-auto">
        {activities.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Aucune activité récente
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="px-4 py-2 hover:bg-gray-50 transition-colors flex items-start gap-3"
            >
              <span className="text-lg flex-shrink-0">{activity.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  {activity.message}
                </p>
                <p className="text-xs text-gray-500">
                  {formatTimestamp(activity.timestamp)}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                activity.type === 'tache' ? 'bg-blue-100 text-blue-700' :
                activity.type === 'traducteur' ? 'bg-green-100 text-green-700' :
                activity.type === 'utilisateur' ? 'bg-purple-100 text-purple-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {activity.type}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
