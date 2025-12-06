import React from 'react';
import { Button } from './Button';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📭',
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4',
        'rounded-lg border-2 border-dashed border-gray-300',
        'bg-gradient-to-b from-gray-50 to-white',
        className
      )}
    >
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 mb-6 max-w-md text-center">{description}</p>
      )}
      {action && (
        <Button variant="primaire" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

interface NoDataProps {
  title?: string;
  description?: string;
}

export const NoDataEmptyState: React.FC<NoDataProps> = ({
  title = 'Aucune donnée',
  description = 'Aucun élément à afficher pour le moment.',
}) => (
  <EmptyState icon="📊" title={title} description={description} />
);

interface NoResultsProps {
  title?: string;
  description?: string;
}

export const NoResultsEmptyState: React.FC<NoResultsProps> = ({
  title = 'Aucun résultat',
  description = 'Essayez de modifier vos critères de recherche.',
}) => (
  <EmptyState icon="🔍" title={title} description={description} />
);

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export const ErrorEmptyState: React.FC<ErrorStateProps> = ({
  title = 'Une erreur est survenue',
  description = 'Veuillez réessayer plus tard.',
  onRetry,
}) => (
  <EmptyState
    icon="⚠️"
    title={title}
    description={description}
    action={
      onRetry
        ? {
            label: 'Réessayer',
            onClick: onRetry,
          }
        : undefined
    }
  />
);
