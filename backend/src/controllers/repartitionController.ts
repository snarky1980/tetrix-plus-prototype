import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { repartitionJusteATemps, repartitionEquilibree, repartitionPEPS } from '../services/repartitionService';

/**
 * Preview répartition Juste-à-Temps sans persistance
 * GET /api/repartition/jat-preview?traducteurId=...&heuresTotal=...&dateEcheance=YYYY-MM-DD
 */
export const previewJAT = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { traducteurId, heuresTotal, dateEcheance } = req.query;
    if (!traducteurId || !heuresTotal || !dateEcheance) {
      res.status(400).json({ erreur: 'traducteurId, heuresTotal, dateEcheance requis' });
      return;
    }
    const heures = parseFloat(heuresTotal as string);
    if (isNaN(heures) || heures <= 0) {
      res.status(400).json({ erreur: 'heuresTotal doit être > 0' });
      return;
    }
    const repartition = await repartitionJusteATemps(
      traducteurId as string,
      heures,
      dateEcheance as string
    );
    res.json({ repartition });
  } catch (error: any) {
    res.status(400).json({ erreur: error.message || 'Erreur preview JAT' });
  }
};

/**
 * Preview répartition équilibrée
 * GET /api/repartition/equilibre-preview?traducteurId=...&heuresTotal=...&dateDebut=YYYY-MM-DD&dateFin=YYYY-MM-DD
 */
export const previewEquilibre = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { traducteurId, heuresTotal, dateDebut, dateFin } = req.query;
    if (!traducteurId || !heuresTotal || !dateDebut || !dateFin) {
      res.status(400).json({ erreur: 'traducteurId, heuresTotal, dateDebut, dateFin requis' });
      return;
    }
    const heures = parseFloat(heuresTotal as string);
    if (isNaN(heures) || heures <= 0) {
      res.status(400).json({ erreur: 'heuresTotal doit être > 0' });
      return;
    }
    const repartition = await repartitionEquilibree(
      traducteurId as string,
      heures,
      dateDebut as string,
      dateFin as string
    );
    res.json({ repartition });
  } catch (error: any) {
    res.status(400).json({ erreur: error.message || 'Erreur preview Équilibrée' });
  }
};

/**
 * Preview répartition PEPS (première entrée, première sortie)
 * GET /api/repartition/peps-preview?traducteurId=...&heuresTotal=...&dateDebut=YYYY-MM-DD&dateEcheance=YYYY-MM-DD
 */
export const previewPEPS = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { traducteurId, heuresTotal, dateDebut, dateEcheance } = req.query;
    if (!traducteurId || !heuresTotal || !dateDebut || !dateEcheance) {
      res.status(400).json({ erreur: 'traducteurId, heuresTotal, dateDebut, dateEcheance requis' });
      return;
    }
    const heures = parseFloat(heuresTotal as string);
    if (isNaN(heures) || heures <= 0) {
      res.status(400).json({ erreur: 'heuresTotal doit être > 0' });
      return;
    }
    const repartition = await repartitionPEPS(
      traducteurId as string,
      heures,
      dateDebut as string,
      dateEcheance as string
    );
    res.json({ repartition });
  } catch (error: any) {
    res.status(400).json({ erreur: error.message || 'Erreur preview PEPS' });
  }
};
