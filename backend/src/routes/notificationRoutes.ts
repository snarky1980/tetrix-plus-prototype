import { Router, Response } from 'express';
import { authentifier, verifierRole, AuthRequest } from '../middleware/auth';
import { Role, PrismaClient } from '@prisma/client';
import {
  obtenirCompteurs,
  obtenirTraducteursDisponibles,
  creerDemandeRessource,
  obtenirDemandesRessources,
  modifierDemandeRessource,
  fermerDemandeRessource,
  supprimerDemandeRessource,
} from '../controllers/notificationController';

const router = Router();
const prisma = new PrismaClient();

// Toutes les routes nécessitent authentification
router.use(authentifier);

// Compteurs de notifications (pour tous les utilisateurs authentifiés)
router.get('/compteurs', obtenirCompteurs);

// Traducteurs disponibles (pour conseillers/gestionnaires)
router.get(
  '/traducteurs-disponibles',
  verifierRole(Role.CONSEILLER, Role.GESTIONNAIRE, Role.ADMIN),
  obtenirTraducteursDisponibles
);

// Demandes de ressources
router.get('/demandes-ressources', obtenirDemandesRessources);
router.post(
  '/demandes-ressources',
  verifierRole(Role.CONSEILLER, Role.GESTIONNAIRE, Role.ADMIN),
  creerDemandeRessource
);
router.put(
  '/demandes-ressources/:id',
  verifierRole(Role.CONSEILLER, Role.GESTIONNAIRE, Role.ADMIN),
  modifierDemandeRessource
);
router.put('/demandes-ressources/:id/fermer', fermerDemandeRessource);
router.delete('/demandes-ressources/:id', supprimerDemandeRessource);

// ============================================
// NOTIFICATIONS SYSTÈME (statuts de tâches)
// ============================================

/**
 * GET /notifications/systeme - Récupérer les notifications système de l'utilisateur
 */
router.get('/systeme', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.utilisateur?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const nonLuesOnly = req.query.nonLues === 'true';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const whereClause: any = {
      destinataireId: userId
    };

    if (nonLuesOnly) {
      whereClause.lue = false;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { creeLe: 'desc' },
      take: limit,
      include: {
        tache: {
          select: {
            id: true,
            numeroProjet: true,
            statut: true,
            dateEcheance: true,
            traducteur: {
              select: { nom: true }
            }
          }
        }
      }
    });

    res.json(notifications);
  } catch (error) {
    console.error('[NOTIF] Erreur récupération notifications système:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /notifications/systeme/count - Compter les notifications système non-lues
 */
router.get('/systeme/count', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.utilisateur?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const count = await prisma.notification.count({
      where: {
        destinataireId: userId,
        lue: false
      }
    });

    res.json({ count });
  } catch (error) {
    console.error('[NOTIF] Erreur comptage notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /notifications/systeme/:id/lue - Marquer une notification comme lue
 */
router.post('/systeme/:id/lue', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.utilisateur?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const notificationId = req.params.id;

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        destinataireId: userId
      }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        lue: true,
        lueLe: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[NOTIF] Erreur marquage notification lue:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /notifications/systeme/lire-toutes - Marquer toutes comme lues
 */
router.post('/systeme/lire-toutes', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.utilisateur?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const result = await prisma.notification.updateMany({
      where: {
        destinataireId: userId,
        lue: false
      },
      data: {
        lue: true,
        lueLe: new Date()
      }
    });

    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('[NOTIF] Erreur marquage toutes notifications lues:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
