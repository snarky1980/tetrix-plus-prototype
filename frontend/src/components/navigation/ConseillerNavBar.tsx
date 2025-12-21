import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { path: '/conseiller/creation-tache', label: 'Nouvelle tâche', icon: '➕' },
  { path: '/planification-globale', label: 'Planification', icon: '📅' },
  { path: '/liaisons', label: 'Liaisons TR', icon: '🔗' },
  { path: '/statistiques-productivite', label: 'Statistiques', icon: '📊' },
  { path: '/conflict-resolution', label: 'Conflits', icon: '⚠️' },
];

interface ConseillerNavBarProps {
  /** Afficher comme grille de boutons (dashboard) ou comme barre horizontale */
  variant?: 'grid' | 'horizontal';
  /** Cacher certains items par leur path */
  hiddenPaths?: string[];
}

/**
 * Barre de navigation unifiée pour les conseillers/gestionnaires
 * Assure la cohérence de navigation à travers toutes les pages
 */
export const ConseillerNavBar: React.FC<ConseillerNavBarProps> = ({ 
  variant = 'horizontal',
  hiddenPaths = []
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { utilisateur } = useAuth();

  const filteredItems = navItems.filter(item => {
    // Filtrer par rôle si spécifié
    if (item.roles && utilisateur?.role && !item.roles.includes(utilisateur.role)) {
      return false;
    }
    // Filtrer les paths cachés
    if (hiddenPaths.includes(item.path)) {
      return false;
    }
    return true;
  });

  const isActive = (path: string) => location.pathname === path;

  if (variant === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {filteredItems.map(item => (
          <Button
            key={item.path}
            variant={isActive(item.path) ? 'primaire' : 'outline'}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-2 h-auto py-4"
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-sm">{item.label}</span>
          </Button>
        ))}
      </div>
    );
  }

  // Variant horizontal (par défaut)
  return (
    <div className="flex flex-wrap gap-2">
      {filteredItems.map(item => (
        <Button
          key={item.path}
          variant={isActive(item.path) ? 'primaire' : 'outline'}
          onClick={() => navigate(item.path)}
          className="flex items-center gap-2"
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </Button>
      ))}
    </div>
  );
};

export default ConseillerNavBar;
