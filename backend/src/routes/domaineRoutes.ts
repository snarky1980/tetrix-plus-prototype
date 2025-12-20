import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authentifier } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/domaines
 * Obtenir la liste de tous les domaines uniques à partir des sous-domaines
 */
router.get('/', authentifier, async (req, res) => {
  try {
    const sousDomaines = await prisma.sousDomaine.findMany({
      where: { actif: true },
      select: {
        domaineParent: true,
      },
    });

    // Extraire les domaines uniques (non null)
    const domainesSet = new Set<string>();
    sousDomaines.forEach(sd => {
      if (sd.domaineParent) {
        domainesSet.add(sd.domaineParent);
      }
    });

    const domaines = Array.from(domainesSet)
      .sort()
      .map(nom => ({
        nom,
        sousDomainesCount: sousDomaines.filter(sd => sd.domaineParent === nom).length,
      }));

    res.json(domaines);
  } catch (error) {
    console.error('Erreur lors de la récupération des domaines:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
