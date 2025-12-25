import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Button } from '../ui/Button';
import { NotificationBadge } from '../ui/NotificationBadge';
import { cn } from '../../lib/cn';
import { UserSettingsButton } from '../settings/UserSettingsButton';
import { PortalSwitcherCompact } from '../navigation/PortalSwitcher';
import NotificationBell from '../common/NotificationBell';

interface AppLayoutProps {
  titre: string;
  actionsGauche?: React.ReactNode;
  actionsDroite?: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean; // Mode compact sans footer
}

export const AppLayout: React.FC<AppLayoutProps> = ({ titre, actionsGauche, actionsDroite, children, compact = false }) => {
  const { utilisateur, deconnexion } = useAuth();
  const { compteurs } = useNotifications();
  
  // Badges selon le rôle
  const isConseiller = ['CONSEILLER', 'GESTIONNAIRE', 'ADMIN'].includes(utilisateur?.role || '');
  const isTraducteur = utilisateur?.role === 'TRADUCTEUR';
  
  return (
    <div className="app-wrapper">
      <header className="w-full border-b border-border bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold tracking-wide" aria-label={titre}>{titre}</h1>
            {/* Sélecteur de portail pour les utilisateurs multi-portails */}
            <PortalSwitcherCompact />
            {actionsGauche}
          </div>
          <div className="flex items-center gap-3">
            {/* Badge pour les conseillers: traducteurs cherchant du travail */}
            {isConseiller && compteurs.traducteursCherchentTravail > 0 && (
              <div 
                className="flex items-center gap-1.5 bg-green-600 text-white px-2 py-0.5 rounded-full text-xs cursor-pointer hover:bg-green-700 transition-colors"
                title={`${compteurs.traducteursCherchentTravail} traducteur(s) cherche(nt) du travail`}
              >
                <span>✋</span>
                <NotificationBadge 
                  count={compteurs.traducteursCherchentTravail} 
                  variant="success" 
                  size="sm"
                  className="!bg-white !text-green-700"
                />
              </div>
            )}
            
            {/* Badge pour les traducteurs: demandes de ressources actives */}
            {isTraducteur && compteurs.demandesRessourcesActives > 0 && (
              <div 
                className="flex items-center gap-1.5 bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs cursor-pointer hover:bg-blue-700 transition-colors"
                title={`${compteurs.demandesRessourcesActives} demande(s) de ressources active(s)`}
              >
                <span>📢</span>
                <NotificationBadge 
                  count={compteurs.demandesRessourcesActives} 
                  variant="info" 
                  size="sm"
                  className="!bg-white !text-blue-700"
                  pulse
                />
              </div>
            )}
            
            {/* Cloche de notifications système (statuts tâches) */}
            <div className="[&_button]:!text-primary-foreground [&_svg]:!text-primary-foreground">
              <NotificationBell />
            </div>
            
            <span className="text-xs" aria-label="Utilisateur connecté">{utilisateur?.email}</span>
            {actionsDroite}
            <UserSettingsButton className="[&_button]:!text-primary-foreground [&_button]:!border-primary-foreground/30 [&_button]:hover:!bg-primary-foreground/10" />
            <Button variant="outline" onClick={deconnexion} aria-label="Déconnexion" className="text-xs px-2 py-1 !text-primary-foreground !border-primary-foreground/30 hover:!bg-primary-foreground/10">Déconnexion</Button>
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
