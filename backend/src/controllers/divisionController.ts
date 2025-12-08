import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { DivisionService } from '../services/divisionService';

/**
 * Obtenir toutes les divisions
 * GET /api/divisions
 */
export const obtenirDivisions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { actif } = req.query;
    const divisions = await DivisionService.obtenirDivisions(
      actif === 'true' ? true : actif === 'false' ? false : undefined
    );
    res.json(divisions);
  } catch (error) {
    console.error('Erreur obtenirDivisions:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des divisions' });
  }
};

/**
 * Obtenir une division par ID
 * GET /api/divisions/:id
 */
export const obtenirDivisionParId = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const division = await DivisionService.obtenirDivisionParId(id);
    res.json(division);
  } catch (error: any) {
    console.error('Erreur obtenirDivisionParId:', error);
    if (error.message === 'Division non trouvée') {
      res.status(404).json({ erreur: error.message });
    } else {
      res.status(500).json({ erreur: 'Erreur lors de la récupération de la division' });
    }
  }
};

/**
 * Créer une nouvelle division
 * POST /api/divisions
 */
export const creerDivision = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { nom, code, description } = req.body;

    if (!nom || !code) {
      res.status(400).json({ erreur: 'Le nom et le code sont requis' });
      return;
    }

    const division = await DivisionService.creerDivision({
      nom,
      code,
      description,
    });

    res.status(201).json(division);
  } catch (error: any) {
    console.error('Erreur creerDivision:', error);
    if (error.message === 'Ce code de division est déjà utilisé') {
      res.status(400).json({ erreur: error.message });
    } else {
      res.status(500).json({ erreur: 'Erreur lors de la création de la division' });
    }
  }
};

/**
 * Mettre à jour une division
 * PUT /api/divisions/:id
 */
export const mettreAJourDivision = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { nom, code, description, actif } = req.body;

    const division = await DivisionService.mettreAJourDivision(id, {
      nom,
      code,
      description,
      actif,
    });

    res.json(division);
  } catch (error: any) {
    console.error('Erreur mettreAJourDivision:', error);
    if (error.message === 'Ce code de division est déjà utilisé') {
      res.status(400).json({ erreur: error.message });
    } else {
      res.status(500).json({ erreur: 'Erreur lors de la mise à jour de la division' });
    }
  }
};

/**
 * Supprimer une division
 * DELETE /api/divisions/:id
 */
export const supprimerDivision = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await DivisionService.supprimerDivision(id);
    res.json(result);
  } catch (error: any) {
    console.error('Erreur supprimerDivision:', error);
    if (error.message?.includes('contient des traducteurs')) {
      res.status(400).json({ erreur: error.message });
    } else {
      res.status(500).json({ erreur: 'Erreur lors de la suppression de la division' });
    }
  }
};

/**
 * Obtenir les utilisateurs ayant accès à une division
 * GET /api/divisions/:id/utilisateurs
 */
export const obtenirUtilisateursAvecAcces = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const utilisateurs = await DivisionService.obtenirUtilisateursAvecAcces(id);
    res.json(utilisateurs);
  } catch (error) {
    console.error('Erreur obtenirUtilisateursAvecAcces:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des utilisateurs' });
  }
};
