import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { repartitionJusteATemps } from '../services/repartitionService';

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
      new Date(dateEcheance as string)
    );
    res.json({ repartition });
  } catch (error: any) {
    res.status(400).json({ erreur: error.message || 'Erreur preview JAT' });
  }
};
