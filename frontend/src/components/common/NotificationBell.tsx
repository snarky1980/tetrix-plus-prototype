/**
 * Composant NotificationBell
 * Affiche une cloche avec un badge de compteur et une popup des notifications
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import api from '../../services/api';

interface Notification {
  id: string;
  type: 'TACHE_EN_COURS' | 'TACHE_EN_RETARD' | 'TACHE_TERMINEE' | 'ESCALADE_GESTIONNAIRE' | 'RAPPEL_FERMETURE';
  titre: string;
  message: string;
  lue: boolean;
  creeLe: string;
  tache?: {
    id: string;
    numeroProjet: string;
    statut: string;
    dateEcheance: string;
    traducteur?: { nom: string };
  };
}

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Fermer le popup quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Charger le compteur périodiquement
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await api.get('/notifications/systeme/count');
        setCount(response.data.count);
      } catch (error) {
        console.error('Erreur chargement compteur notifications:', error);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000); // Rafraîchir toutes les minutes
    return () => clearInterval(interval);
  }, []);

  // Charger les notifications quand on ouvre le popup
  const handleOpen = async () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setLoading(true);
      try {
        const response = await api.get('/notifications/systeme?limit=20');
        setNotifications(response.data);
      } catch (error) {
        console.error('Erreur chargement notifications:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Marquer une notification comme lue
  const markAsRead = async (notificationId: string) => {
    try {
      await api.post(`/notifications/systeme/${notificationId}/lue`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, lue: true } : n)
      );
      setCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  };

  // Marquer toutes comme lues
  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/systeme/lire-toutes');
      setNotifications(prev => prev.map(n => ({ ...n, lue: true })));
      setCount(0);
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
    }
  };

  // Icône selon le type de notification
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TACHE_EN_COURS':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'TACHE_EN_RETARD':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'TACHE_TERMINEE':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'ESCALADE_GESTIONNAIRE':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'RAPPEL_FERMETURE':
        return <Bell className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  // Formatage de la date relative
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);

    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffH < 24) return `Il y a ${diffH}h`;
    if (diffD < 7) return `Il y a ${diffD}j`;
    return date.toLocaleDateString('fr-CA');
  };

  return (
    <div className="relative" ref={popupRef}>
      {/* Bouton cloche */}
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Popup des notifications */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-3 h-3" />
                  Tout lire
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Aucune notification</p>
              </div>
            ) : (
              <ul>
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notif.lue ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => !notif.lue && markAsRead(notif.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm ${!notif.lue ? 'font-semibold' : 'font-medium'} text-gray-800 truncate`}>
                            {notif.titre}
                          </p>
                          {!notif.lue && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        {notif.tache && (
                          <p className="text-xs text-gray-400 mt-1">
                            Projet: {notif.tache.numeroProjet}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatRelativeTime(notif.creeLe)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
