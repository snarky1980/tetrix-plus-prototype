import { Router } from 'express';
import {
  detecterConflitsAllocation,
  detecterConflitsBlocage,
  genererSuggestions,
  genererRapportConflits
} from '../services/conflictDetectionService';

const router = Router();

/**
 * POST /api/conflicts/detect/allocation/:allocationId
 * Détecte tous les conflits pour une allocation donnée
 */
router.post('/detect/allocation/:allocationId', async (req, res) => {
  try {
    const { allocationId } = req.params;
    const conflits = await detecterConflitsAllocation(allocationId);
    
    res.json({
      success: true,
      data: {
        allocationId,
        conflits,
        count: conflits.length
      }
    });
  } catch (error: any) {
    console.error('Erreur détection conflits allocation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la détection des conflits'
    });
  }
});

/**
 * POST /api/conflicts/detect/blocage/:blocageId
 * Détecte tous les conflits causés par un blocage
 */
router.post('/detect/blocage/:blocageId', async (req, res) => {
  try {
    const { blocageId } = req.params;
    const conflits = await detecterConflitsBlocage(blocageId);
    
    res.json({
      success: true,
      data: {
        blocageId,
        conflits,
        count: conflits.length
      }
    });
  } catch (error: any) {
    console.error('Erreur détection conflits blocage:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la détection des conflits'
    });
  }
});

/**
 * POST /api/conflicts/suggest
 * Génère des suggestions pour résoudre les conflits
 * Body: { conflits: Conflict[] }
 */
router.post('/suggest', async (req, res) => {
  try {
    const { conflits } = req.body;
    
    if (!conflits || !Array.isArray(conflits)) {
      return res.status(400).json({
        success: false,
        error: 'Le champ "conflits" est requis et doit être un tableau'
      });
    }
    
    const suggestions = await genererSuggestions(conflits);
    
    res.json({
      success: true,
      data: {
        suggestions,
        count: suggestions.length
      }
    });
  } catch (error: any) {
    console.error('Erreur génération suggestions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la génération des suggestions'
    });
  }
});

/**
 * POST /api/conflicts/report/blocage/:blocageId
 * Génère un rapport complet (conflits + suggestions) pour un blocage
 */
router.post('/report/blocage/:blocageId', async (req, res) => {
  try {
    const { blocageId } = req.params;
    const rapport = await genererRapportConflits(blocageId);
    
    res.json({
      success: true,
      data: rapport
    });
  } catch (error: any) {
    console.error('Erreur génération rapport:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la génération du rapport'
    });
  }
});

/**
 * GET /api/conflicts/allocation/:allocationId/full
 * Détecte les conflits ET génère les suggestions en une seule requête
 */
router.get('/allocation/:allocationId/full', async (req, res) => {
  try {
    const { allocationId } = req.params;
    
    // Détecter les conflits
    const conflits = await detecterConflitsAllocation(allocationId);
    
    // Générer les suggestions
    const suggestions = conflits.length > 0 ? await genererSuggestions(conflits) : [];
    
    res.json({
      success: true,
      data: {
        allocationId,
        conflits,
        suggestions,
        hasConflicts: conflits.length > 0,
        conflictCount: conflits.length,
        suggestionCount: suggestions.length
      }
    });
  } catch (error: any) {
    console.error('Erreur analyse complète:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'analyse complète'
    });
  }
});

export default router;
