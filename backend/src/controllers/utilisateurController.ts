import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { UtilisateurService } from '../services/utilisateurService';

/**
 * Obtenir tous les utilisateurs
 * GET /api/utilisateurs
 */
export const obtenirUtilisateurs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { role, actif, divisionId } = req.query;

    const utilisateurs = await UtilisateurService.obtenirUtilisateurs({
      role: role as any,
      actif: actif === 'true' ? true : actif === 'false' ? false : undefined,
      divisionId: divisionId as string,
    });

    res.json(utilisateurs);
  } catch (error) {
    console.error('Erreur obtenirUtilisateurs:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des utilisateurs' });
  }
};

/**
 * Obtenir un utilisateur par ID
 * GET /api/utilisateurs/:id
 */
export const obtenirUtilisateurParId = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const utilisateur = await UtilisateurService.obtenirUtilisateurParId(id);
    res.json(utilisateur);
  } catch (error: any) {
    console.error('Erreur obtenirUtilisateurParId:', error);
    if (error.message === 'Utilisateur non trouvé') {
      res.status(404).json({ erreur: error.message });
    } else {
      res.status(500).json({ erreur: 'Erreur lors de la récupération de l\'utilisateur' });
    }
  }
};

/**
 * Créer un nouvel utilisateur
 * POST /api/utilisateurs
 */
export const creerUtilisateur = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email, motDePasse, nom, prenom, role, divisions } = req.body;

    // Validation
    if (!email || !motDePasse || !role) {
      res.status(400).json({ 
        erreur: 'Email, mot de passe et rôle sont requis' 
      });
      return;
    }

    const utilisateur = await UtilisateurService.creerUtilisateur({
      email,
      motDePasse,
      nom,
      prenom,
      role,
      divisions,
    });

    res.status(201).json(utilisateur);
  } catch (error: any) {
    console.error('Erreur creerUtilisateur:', error);
    if (error.message === 'Cet email est déjà utilisé') {
      res.status(400).json({ erreur: error.message });
    } else {
      res.status(500).json({ erreur: 'Erreur lors de la création de l\'utilisateur' });
    }
  }
};

/**
 * Mettre à jour un utilisateur
 * PUT /api/utilisateurs/:id
 */
export const mettreAJourUtilisateur = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { email, nom, prenom, role, actif, motDePasse } = req.body;

    const utilisateur = await UtilisateurService.mettreAJourUtilisateur(id, {
      email,
      nom,
      prenom,
      role,
      actif,
      motDePasse,
    });

    res.json(utilisateur);
  } catch (error) {
    console.error('Erreur mettreAJourUtilisateur:', error);
    res.status(500).json({ erreur: 'Erreur lors de la mise à jour de l\'utilisateur' });
  }
};

/**
 * Supprimer un utilisateur
 * DELETE /api/utilisateurs/:id
 */
export const supprimerUtilisateur = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Empêcher un utilisateur de se supprimer lui-même
    if (req.utilisateur?.id === id) {
      res.status(400).json({ erreur: 'Vous ne pouvez pas supprimer votre propre compte' });
      return;
    }

    const result = await UtilisateurService.supprimerUtilisateur(id);
    res.json(result);
  } catch (error) {
    console.error('Erreur supprimerUtilisateur:', error);
    res.status(500).json({ erreur: 'Erreur lors de la suppression de l\'utilisateur' });
  }
};

/**
 * Gérer les accès aux divisions d'un utilisateur
 * PUT /api/utilisateurs/:id/divisions
 */
export const gererAccesDivisions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { acces } = req.body;

    if (!Array.isArray(acces)) {
      res.status(400).json({ erreur: 'Le champ "acces" doit être un tableau' });
      return;
    }

    const utilisateur = await UtilisateurService.gererAccesDivisions(id, acces);
    res.json(utilisateur);
  } catch (error) {
    console.error('Erreur gererAccesDivisions:', error);
    res.status(500).json({ erreur: 'Erreur lors de la gestion des accès' });
  }
};

/**
 * Obtenir les divisions accessibles par un utilisateur
 * GET /api/utilisateurs/:id/divisions
 */
export const obtenirDivisionsAccessibles = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { typeAcces } = req.query;

    const divisions = await UtilisateurService.obtenirDivisionsAccessibles(
      id,
      typeAcces as any
    );

    res.json(divisions);
  } catch (error) {
    console.error('Erreur obtenirDivisionsAccessibles:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des divisions' });
  }
};
