import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';
import { UserSettingsButton } from '../settings/UserSettingsButton';

interface AppLayoutProps {
  titre: string;
  actionsGauche?: React.ReactNode;
  actionsDroite?: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean; // Mode compact sans footer
}

export const AppLayout: React.FC<AppLayoutProps> = ({ titre, actionsGauche, actionsDroite, children, compact = false }) => {
  const { utilisateur, deconnexion } = useAuth();
  return (
    <div className="app-wrapper">
      <header className="w-full border-b border-border bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold tracking-wide" aria-label={titre}>{titre}</h1>
            {actionsGauche}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" aria-label="Utilisateur connecté">{utilisateur?.email}</span>
            {actionsDroite}
            <UserSettingsButton />
            <Button variant="outline" onClick={deconnexion} aria-label="Déconnexion" className="text-xs px-2 py-1">Déconnexion</Button>
          </div>
        </div>
      </header>
      <main className={cn('flex-1 page-wrapper', compact ? 'py-2' : 'space-y-6')}>{children}</main>
      {!compact && (
        <footer className="mt-auto border-t border-border text-xs text-muted py-2">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <span>Planification Traducteurs BT – Prototype</span>
            <span>Accessibilité: contrastes élevés et focus visibles.</span>
          </div>
        </footer>
      )}
    </div>
  );
};
