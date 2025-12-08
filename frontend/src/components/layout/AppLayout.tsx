import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';

interface AppLayoutProps {
  titre: string;
  actionsGauche?: React.ReactNode;
  actionsDroite?: React.ReactNode;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ titre, actionsGauche, actionsDroite, children }) => {
  const { utilisateur, deconnexion } = useAuth();
  return (
    <div className="app-wrapper">
      <header className="w-full border-b border-border bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold tracking-wide" aria-label={titre}>{titre}</h1>
            {actionsGauche}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm" aria-label="Utilisateur connecté">{utilisateur?.email}</span>
            {actionsDroite}
            <Button variant="outline" onClick={deconnexion} aria-label="Déconnexion">Déconnexion</Button>
          </div>
        </div>
      </header>
      <main className={cn('flex-1 page-wrapper space-y-6')}>{children}</main>
      <footer className="mt-auto border-t border-border text-xs text-muted py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <span>Planification Traducteurs BT – Prototype</span>
          <span>Accessibilité: contrastes élevés et focus visibles.</span>
        </div>
      </footer>
    </div>
  );
};
