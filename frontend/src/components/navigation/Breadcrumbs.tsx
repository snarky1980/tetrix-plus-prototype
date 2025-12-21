import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  /** Affiche automatiquement basé sur la route si pas d'items fournis */
  autoGenerate?: boolean;
}

// Mapping des routes vers les labels
const routeLabels: Record<string, string> = {
  '/': 'Accueil',
  '/conseiller': 'Portail Conseiller',
  '/conseiller/creation-tache': 'Nouvelle tâche',
  '/planification-globale': 'Planification globale',
  '/liaisons': 'Liaisons Traducteurs-Réviseurs',
  '/statistiques-productivite': 'Statistiques',
  '/conflict-resolution': 'Résolution des conflits',
  '/admin': 'Administration',
  '/admin/gestion-profils': 'Gestion des profils',
  '/traducteur': 'Mon tableau de bord',
  '/gestionnaire': 'Planification',
};

// Hiérarchie des routes
const routeHierarchy: Record<string, string[]> = {
  '/conseiller/creation-tache': ['/conseiller', '/conseiller/creation-tache'],
  '/planification-globale': ['/conseiller', '/planification-globale'],
  '/liaisons': ['/conseiller', '/liaisons'],
  '/statistiques-productivite': ['/conseiller', '/statistiques-productivite'],
  '/conflict-resolution': ['/conseiller', '/conflict-resolution'],
  '/admin/gestion-profils': ['/admin', '/admin/gestion-profils'],
};

/**
 * Composant Breadcrumbs (fil d'Ariane)
 * Affiche le chemin de navigation contextuel
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ 
  items,
  autoGenerate = true 
}) => {
  const location = useLocation();

  // Génération automatique basée sur la route
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const currentPath = location.pathname;
    const hierarchy = routeHierarchy[currentPath];
    
    if (hierarchy) {
      return hierarchy.map((path, index) => ({
        label: routeLabels[path] || path,
        path: index === hierarchy.length - 1 ? undefined : path, // Pas de lien sur le dernier item
      }));
    }
    
    // Fallback: juste l'item actuel
    return [{
      label: routeLabels[currentPath] || currentPath.split('/').pop() || 'Page',
    }];
  };

  const breadcrumbItems = items || (autoGenerate ? generateBreadcrumbs() : []);

  if (breadcrumbItems.length <= 1) {
    return null; // Ne pas afficher si un seul élément
  }

  return (
    <nav aria-label="Fil d'Ariane" className="mb-4">
      <ol className="flex items-center gap-2 text-sm">
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-gray-400">/</span>
            )}
            {item.path ? (
              <Link 
                to={item.path}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-700 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
