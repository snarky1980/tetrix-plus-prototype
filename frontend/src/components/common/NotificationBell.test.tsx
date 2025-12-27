/**
 * Tests du composant NotificationBell
 * 
 * Tests d'intégration pour vérifier:
 * - Rendu initial et accessibilité
 * - Interaction utilisateur (ouverture/fermeture popup)
 * - Affichage des notifications
 * - Actions de marquage comme lu
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBell from './NotificationBell';
import api from '../../services/api';

// Mock du module api
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock des constantes
vi.mock('../../config/constants', () => ({
  NOTIFICATION_POLLING_INTERVAL_MS: 60000,
  NOTIFICATION_FETCH_LIMIT: 20,
  NOTIFICATION_COUNT_MAX_DISPLAY: 99,
  Z_INDEX: { POPUP: 50 },
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock par défaut
    (api.get as Mock).mockImplementation((url: string) => {
      if (url.includes('/count')) {
        return Promise.resolve({ data: { count: 0 } });
      }
      return Promise.resolve({ data: [] });
    });
    (api.post as Mock).mockResolvedValue({});
  });

  describe('rendu initial', () => {
    it('affiche le bouton cloche', () => {
      render(<NotificationBell />);
      
      const button = screen.getByRole('button', { name: /notifications/i });
      expect(button).toBeInTheDocument();
    });

    it('n\'affiche pas de badge si count = 0', async () => {
      render(<NotificationBell />);
      
      // Attendre que le fetch initial soit terminé
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/notifications/systeme/count');
      });
      
      // Pas de badge visible
      const badge = screen.queryByText(/\d+/);
      expect(badge).not.toBeInTheDocument();
    });

    it('affiche le badge avec le compteur si count > 0', async () => {
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 5 } });
        }
        return Promise.resolve({ data: [] });
      });
      
      render(<NotificationBell />);
      
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('affiche 99+ si count > 99', async () => {
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 150 } });
        }
        return Promise.resolve({ data: [] });
      });
      
      render(<NotificationBell />);
      
      await waitFor(() => {
        expect(screen.getByText('99+')).toBeInTheDocument();
      });
    });
  });

  describe('accessibilité', () => {
    it('a un aria-label descriptif', () => {
      render(<NotificationBell />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Notifications');
    });

    it('met à jour aria-label avec le compteur', async () => {
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 3 } });
        }
        return Promise.resolve({ data: [] });
      });
      
      render(<NotificationBell />);
      
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-label', '3 notifications non-lues');
      });
    });

    it('a aria-expanded=false initialement', () => {
      render(<NotificationBell />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('a aria-haspopup=true', () => {
      render(<NotificationBell />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
    });
  });

  describe('ouverture/fermeture popup', () => {
    it('ouvre le popup au clic', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      const button = screen.getByRole('button', { name: /notifications/i });
      await user.click(button);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('charge les notifications à l\'ouverture', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      await user.click(screen.getByRole('button', { name: /notifications/i }));
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/notifications/systeme?limit=20');
      });
    });

    it('ferme le popup au clic sur X', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      // Ouvrir
      await user.click(screen.getByRole('button', { name: /notifications/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // Fermer
      await user.click(screen.getByRole('button', { name: /fermer/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('ferme le popup avec Escape', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      // Ouvrir
      await user.click(screen.getByRole('button', { name: /notifications/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // Escape
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('affichage des notifications', () => {
    const mockNotifications = [
      {
        id: '1',
        titre: 'Tâche en cours',
        message: 'Vous avez une nouvelle tâche assignée',
        type: 'TACHE_EN_COURS',
        lue: false,
        creeLe: new Date().toISOString(),
      },
      {
        id: '2',
        titre: 'Tâche terminée',
        message: 'La tâche XYZ a été complétée',
        type: 'TACHE_TERMINEE',
        lue: true,
        creeLe: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    beforeEach(() => {
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 1 } });
        }
        return Promise.resolve({ data: mockNotifications });
      });
    });

    it('affiche la liste des notifications', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      await user.click(screen.getByRole('button', { name: /notification/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Tâche en cours')).toBeInTheDocument();
        expect(screen.getByText('Tâche terminée')).toBeInTheDocument();
      });
    });

    it('affiche les messages des notifications', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      await user.click(screen.getByRole('button', { name: /notification/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Vous avez une nouvelle tâche assignée')).toBeInTheDocument();
      });
    });

    it('distingue visuellement les non-lues (fond bleu)', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      await user.click(screen.getByRole('button', { name: /notification/i }));
      
      await waitFor(() => {
        const items = screen.getAllByRole('listitem');
        // La première est non-lue (bg-blue-50)
        expect(items[0]).toHaveClass('bg-blue-50');
        // La deuxième est lue (pas de bg-blue-50)
        expect(items[1]).not.toHaveClass('bg-blue-50');
      });
    });

    it('affiche le message vide si aucune notification', async () => {
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 0 } });
        }
        return Promise.resolve({ data: [] });
      });
      
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      await user.click(screen.getByRole('button', { name: /notifications/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Aucune notification')).toBeInTheDocument();
      });
    });

    it('affiche le chargement', async () => {
      // Retarder la réponse
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 0 } });
        }
        return new Promise(() => {}); // Ne jamais résoudre
      });
      
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      await user.click(screen.getByRole('button', { name: /notifications/i }));
      
      expect(screen.getByText('Chargement...')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        titre: 'Test notification',
        message: 'Message test',
        type: 'TACHE_EN_COURS',
        lue: false,
        creeLe: new Date().toISOString(),
      },
    ];

    beforeEach(() => {
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 1 } });
        }
        return Promise.resolve({ data: mockNotifications });
      });
    });

    it('marque comme lu au clic sur notification non-lue', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      await user.click(screen.getByRole('button', { name: /notification/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Test notification')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Test notification'));
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/notifications/systeme/notif-1/lue');
      });
    });

    it('marque tout comme lu via le bouton', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      await user.click(screen.getByRole('button', { name: /notification/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Tout lire')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Tout lire'));
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/notifications/systeme/lire-toutes');
      });
    });

    it('ne montre pas "Tout lire" si count = 0', async () => {
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 0 } });
        }
        return Promise.resolve({ data: [] });
      });
      
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      await user.click(screen.getByRole('button', { name: /notifications/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Aucune notification')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Tout lire')).not.toBeInTheDocument();
    });
  });

  describe('interaction clavier', () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        titre: 'Test notification',
        message: 'Message test',
        type: 'TACHE_EN_COURS',
        lue: false,
        creeLe: new Date().toISOString(),
      },
    ];

    beforeEach(() => {
      (api.get as Mock).mockImplementation((url: string) => {
        if (url.includes('/count')) {
          return Promise.resolve({ data: { count: 1 } });
        }
        return Promise.resolve({ data: mockNotifications });
      });
    });

    it('les notifications sont focusables (tabIndex=0)', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      await user.click(screen.getByRole('button', { name: /notification/i }));
      
      await waitFor(() => {
        const item = screen.getByRole('listitem');
        expect(item).toHaveAttribute('tabIndex', '0');
      });
    });

    it('Enter sur une notification la marque comme lue', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      await user.click(screen.getByRole('button', { name: /notification/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Test notification')).toBeInTheDocument();
      });
      
      const item = screen.getByRole('listitem');
      item.focus();
      
      fireEvent.keyDown(item, { key: 'Enter' });
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/notifications/systeme/notif-1/lue');
      });
    });

    it('Space sur une notification la marque comme lue', async () => {
      const user = userEvent.setup();
      render(<NotificationBell />);
      
      await user.click(screen.getByRole('button', { name: /notification/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Test notification')).toBeInTheDocument();
      });
      
      const item = screen.getByRole('listitem');
      item.focus();
      
      fireEvent.keyDown(item, { key: ' ' });
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/notifications/systeme/notif-1/lue');
      });
    });
  });
});
