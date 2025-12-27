/**
 * Composant NotificationBell
 * 
 * Affiche une cloche de notifications avec:
 * - Badge compteur de notifications non-lues
 * - Popup listant les notifications récentes
 * - Actions pour marquer comme lu (individuel/global)
 * 
 * Architecture:
 * - Utilise le hook useNotificationBell pour la logique métier
 * - Types centralisés dans types/index.ts
 * - Utilitaires de formatage dans utils/formatters.ts
 * - Constantes dans config/constants.ts
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, CheckCheck, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useNotificationBell } from '../../hooks/useNotificationBell';
import { formatRelativeTime } from '../../utils/formatters';
import { NOTIFICATION_COUNT_MAX_DISPLAY, Z_INDEX } from '../../config/constants';
import { TypeNotificationSysteme } from '../../types';

/** Mapping type de notification → icône correspondante */
const NOTIFICATION_ICONS: Record<TypeNotificationSysteme, React.ReactNode> = {
  TACHE_EN_COURS: <Clock className="w-4 h-4 text-blue-500" aria-hidden="true" />,
  TACHE_EN_RETARD: <AlertTriangle className="w-4 h-4 text-red-500" aria-hidden="true" />,
  TACHE_TERMINEE: <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />,
  ESCALADE_GESTIONNAIRE: <AlertTriangle className="w-4 h-4 text-orange-500" aria-hidden="true" />,
  RAPPEL_FERMETURE: <Bell className="w-4 h-4 text-yellow-500" aria-hidden="true" />,
};

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    count,
    notifications,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationBell();

  // Fermer le popup au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Toggle popup et charger les notifications
  const handleToggle = useCallback(() => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // Clic sur une notification non-lue
  const handleNotificationClick = useCallback((notificationId: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead(notificationId);
    }
  }, [markAsRead]);

  // Formater le compteur affiché
  const displayCount = count > NOTIFICATION_COUNT_MAX_DISPLAY 
    ? `${NOTIFICATION_COUNT_MAX_DISPLAY}+` 
    : count;

  return (
    <div className="relative" ref={popupRef}>
      {/* Bouton cloche */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        aria-label={count > 0 ? `${count} notifications non-lues` : 'Notifications'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {count > 0 && (
          <span 
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
            aria-hidden="true"
          >
            {displayCount}
          </span>
        )}
      </button>

      {/* Popup des notifications */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[80vh] flex flex-col"
          style={{ zIndex: Z_INDEX.POPUP }}
          role="dialog"
          aria-label="Panneau des notifications"
        >
          {/* En-tête */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg">
            <h2 className="font-semibold text-gray-800">Notifications</h2>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-3 h-3" aria-hidden="true" />
                  Tout lire
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                aria-label="Fermer le panneau"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="overflow-y-auto flex-1" role="list">
            {loading ? (
              <div className="p-4 text-center text-gray-500" role="status">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                <p>Aucune notification</p>
              </div>
            ) : (
              <ul>
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    role="listitem"
                    className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notif.lue ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notif.id, notif.lue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(notif.id, notif.lue);
                      }
                    }}
                    tabIndex={0}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {NOTIFICATION_ICONS[notif.type] || (
                          <Bell className="w-4 h-4 text-gray-500" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm ${!notif.lue ? 'font-semibold' : 'font-medium'} text-gray-800 truncate`}>
                            {notif.titre}
                          </p>
                          {!notif.lue && (
                            <span 
                              className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" 
                              aria-label="Non lue"
                            />
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
