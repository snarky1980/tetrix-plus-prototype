import React, { useState, useTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

type Portal = 'admin' | 'conseiller' | 'gestionnaire' | 'traducteur';

interface PortalConfig {
  id: Portal;
  label: string;
  icon: string;
  path: string;
  description: string;
  color: string;
}

// ID du traducteur pour traducteur@tetrix.com (Jean Exemple)
const DEV_TRADUCTEUR_ID = '70915392-5946-47b8-a0e3-53d5e4b8e9cc';
// ID du traducteur pour playground-traducteur@tetrix.com (Playground, Test)
const PLAYGROUND_TRADUCTEUR_ID = '620bd3d8-42e8-4db2-ae5a-b58811c9ec2f';

const PORTALS: PortalConfig[] = [
  {
    id: 'admin',
    label: 'Admin',
    icon: '👑',
    path: '/admin',
    description: 'Gestion système, utilisateurs, divisions',
    color: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
  },
  {
    id: 'gestionnaire',
    label: 'Gestionnaire',
    icon: '👔',
    path: '/gestionnaire',
    description: 'Vue équipes, planification division',
    color: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
  },
  {
    id: 'conseiller',
    label: 'Conseiller',
    icon: '📋',
    path: '/conseiller',
    description: 'Planification globale, création tâches',
    color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  },
  {
    id: 'traducteur',
    label: 'Traducteur',
    icon: '🔤',
    path: '/traducteur',
    description: 'Mon tableau de bord personnel',
    color: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
  },
];

/**
 * Détermine les portails accessibles selon le rôle et le statut playground
 */
export const getAccessiblePortals = (role: string, isPlayground?: boolean): Portal[] => {
  // Les comptes Playground ont accès à TOUS les portails
  if (isPlayground) {
    return ['admin', 'gestionnaire', 'conseiller', 'traducteur'];
  }
  
  switch (role) {
    case 'ADMIN':
      // Admin a accès à TOUS les portails
      return ['admin', 'gestionnaire', 'conseiller', 'traducteur'];
    case 'GESTIONNAIRE':
      // Gestionnaire n'a accès qu'à son portail (pas de création de tâches)
      return ['gestionnaire'];
    case 'CONSEILLER':
      // Conseiller a accès aux 4 portails (Admin, Conseiller, Gestionnaire, Traducteur)
      return ['admin', 'gestionnaire', 'conseiller', 'traducteur'];
    case 'TRADUCTEUR':
      // Traducteur n'a accès qu'à son portail
      return ['traducteur'];
    default:
      return [];
  }
};

/**
 * Détermine le portail actuel selon l'URL
 */
const getCurrentPortal = (pathname: string): Portal | null => {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/gestionnaire')) return 'gestionnaire';
  if (pathname.startsWith('/conseiller')) return 'conseiller';
  if (pathname.startsWith('/traducteur')) return 'traducteur';
  return null;
};

/**
 * Composant de sélection de portail - Version compacte pour la navbar
 */
export const PortalSwitcherCompact: React.FC = () => {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingPortal, setPendingPortal] = useState<Portal | null>(null);

  if (!utilisateur) return null;

  const accessiblePortals = getAccessiblePortals(utilisateur.role, utilisateur.isPlayground);
  const currentPortal = getCurrentPortal(location.pathname);
  const currentConfig = PORTALS.find(p => p.id === currentPortal);

  // Si l'utilisateur n'a accès qu'à un seul portail, ne pas afficher le switcher
  if (accessiblePortals.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
      >
        <span>{currentConfig?.icon || '🔀'}</span>
        <span className="font-medium">{currentConfig?.label || 'Portail'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Overlay pour fermer */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Menu déroulant */}
          <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
            <div className="p-2 bg-gray-50 border-b text-xs text-gray-500 font-medium">
              Changer de portail
            </div>
            <div className="p-2">
              {PORTALS.filter(p => accessiblePortals.includes(p.id)).map(portal => {
                // Déterminer le chemin cible pour le portail Traducteur
                let targetPath = portal.path;
                if (portal.id === 'traducteur') {
                  if (utilisateur.isPlayground) {
                    // Compte playground → portail du traducteur playground
                    targetPath = `/traducteur/${PLAYGROUND_TRADUCTEUR_ID}`;
                  } else if (utilisateur.role === 'ADMIN') {
                    // Admin → portail de traducteur@tetrix.com
                    targetPath = `/traducteur/${DEV_TRADUCTEUR_ID}`;
                  }
                }
                
                const isCurrentlyPending = isPending && pendingPortal === portal.id;
                const isSelected = currentPortal === portal.id;
                
                return (
                  <button
                    key={portal.id}
                    disabled={isPending}
                    onClick={() => {
                      if (isSelected) {
                        setIsOpen(false);
                        return;
                      }
                      setPendingPortal(portal.id);
                      startTransition(() => {
                        navigate(targetPath);
                        setIsOpen(false);
                      });
                    }}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all
                      ${isSelected 
                        ? 'bg-blue-50 border-2 border-blue-200' 
                        : 'hover:bg-gray-50 border-2 border-transparent'
                      }
                      ${isPending && !isCurrentlyPending ? 'opacity-50' : ''}
                    `}
                  >
                    <span className={`text-2xl ${isCurrentlyPending ? 'animate-pulse' : ''}`}>
                      {isCurrentlyPending ? '⏳' : portal.icon}
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {portal.label}
                        {isCurrentlyPending && <span className="ml-2 text-sm text-blue-600">Chargement...</span>}
                      </div>
                      <div className="text-xs text-gray-500">{portal.description}</div>
                    </div>
                    {isSelected && !isCurrentlyPending && (
                      <span className="text-blue-600">✓</span>
                    )}
                    {isCurrentlyPending && (
                      <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Composant de sélection de portail - Version complète (page)
 */
export const PortalSelector: React.FC = () => {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();

  if (!utilisateur) return null;

  const accessiblePortals = getAccessiblePortals(utilisateur.role, utilisateur.isPlayground);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenue, {utilisateur.prenom || utilisateur.email.split('@')[0]} 👋
          </h1>
          <p className="text-gray-600">
            Vous avez accès à {accessiblePortals.length} portail{accessiblePortals.length > 1 ? 's' : ''}. 
            Choisissez où vous souhaitez aller.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PORTALS.filter(p => accessiblePortals.includes(p.id)).map(portal => (
            <button
              key={portal.id}
              onClick={() => navigate(portal.path)}
              className={`
                p-6 rounded-xl border-2 text-left transition-all hover:scale-[1.02] hover:shadow-lg
                ${portal.color}
              `}
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">{portal.icon}</span>
                <div>
                  <h3 className="text-xl font-bold">{portal.label}</h3>
                  <p className="text-sm opacity-75 mt-1">{portal.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Connecté en tant que <strong>{utilisateur.email}</strong> ({utilisateur.role})
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortalSwitcherCompact;
