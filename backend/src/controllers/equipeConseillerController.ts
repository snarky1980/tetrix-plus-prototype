import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as equipeConseillerService from '../services/equipeConseillerService';
import { RoleEquipeConseiller } from '@prisma/client';

// ============================================
// CRUD Équipes
// ============================================

export async function listerEquipes(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const includeInactif = req.query.includeInactif === 'true';
    const equipes = await equipeConseillerService.listerEquipesConseiller(includeInactif);
    res.json(equipes);
  } catch (error) {
    next(error);
  }
}

export async function obtenirEquipe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const equipe = await equipeConseillerService.obtenirEquipeConseiller(id);
    
    if (!equipe) {
      return res.status(404).json({ message: 'Équipe non trouvée' });
    }
    
    res.json(equipe);
  } catch (error) {
    next(error);
  }
}

export async function creerEquipe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { nom, code, description, couleur } = req.body;
    
    if (!nom || !code) {
      return res.status(400).json({ message: 'Le nom et le code sont requis' });
    }
    
    const equipe = await equipeConseillerService.creerEquipeConseiller(
      { nom, code, description, couleur },
      req.utilisateur!.id
    );
    
    res.status(201).json(equipe);
  } catch (error: any) {
    if (error.message?.includes('existe déjà')) {
      return res.status(409).json({ message: error.message });
    }
    next(error);
  }
}

export async function modifierEquipe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { nom, code, description, couleur, actif } = req.body;
    
    const equipe = await equipeConseillerService.modifierEquipeConseiller(
      id,
      { nom, code, description, couleur, actif },
      req.utilisateur!.id
    );
    
    res.json(equipe);
  } catch (error: any) {
    if (error.message?.includes('existe déjà')) {
      return res.status(409).json({ message: error.message });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Équipe non trouvée' });
    }
    next(error);
  }
}

export async function supprimerEquipe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    await equipeConseillerService.supprimerEquipeConseiller(id);
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Équipe non trouvée' });
    }
    next(error);
  }
}

// ============================================
// Gestion des membres
// ============================================

export async function listerMembres(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const membres = await equipeConseillerService.obtenirMembresEquipe(id);
    res.json(membres);
  } catch (error) {
    next(error);
  }
}

export async function ajouterMembre(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { utilisateurId, role, notes } = req.body;
    
    if (!utilisateurId) {
      return res.status(400).json({ message: 'L\'ID de l\'utilisateur est requis' });
    }
    
    const membre = await equipeConseillerService.ajouterMembre(
      id,
      { utilisateurId, role, notes },
      req.utilisateur!.id
    );
    
    res.status(201).json(membre);
  } catch (error: any) {
    if (error.message?.includes('non trouvé')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message?.includes('déjà membre') || error.message?.includes('Seuls les')) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
}

export async function retirerMembre(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id, utilisateurId } = req.params;
    await equipeConseillerService.retirerMembre(id, utilisateurId);
    res.status(204).send();
  } catch (error: any) {
    if (error.message?.includes('non trouvé')) {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
}

export async function modifierRoleMembre(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id, utilisateurId } = req.params;
    const { role } = req.body;
    
    if (!role || !['CHEF', 'MEMBRE'].includes(role)) {
      return res.status(400).json({ message: 'Le rôle doit être CHEF ou MEMBRE' });
    }
    
    const membre = await equipeConseillerService.modifierRoleMembre(
      id,
      utilisateurId,
      role as RoleEquipeConseiller
    );
    
    res.json(membre);
  } catch (error: any) {
    if (error.message?.includes('non trouvé')) {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
}

// ============================================
// Requêtes spécifiques
// ============================================

export async function mesEquipes(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const equipes = await equipeConseillerService.obtenirEquipesUtilisateur(
      req.utilisateur!.id
    );
    res.json(equipes);
  } catch (error) {
    next(error);
  }
}

export async function utilisateursDisponibles(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const utilisateurs = await equipeConseillerService.obtenirUtilisateursDisponibles(id);
    res.json(utilisateurs);
  } catch (error) {
    next(error);
  }
}
