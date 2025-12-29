import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authentifier, verifierRole, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════
// ÉQUIPES-PROJET - Routes CRUD
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/equipes-projet - Liste toutes les équipes (avec filtres)
router.get('/', authentifier, async (req: Request, res: Response) => {
  try {
    const { actif, archive, clientId } = req.query;
    
    const where: any = {};
    if (actif !== undefined) where.actif = actif === 'true';
    if (archive !== undefined) where.archive = archive === 'true';
    if (clientId) where.clientId = clientId;
    
    const equipes = await prisma.equipeProjet.findMany({
      where,
      include: {
        membres: {
          where: { actif: true },
          include: {
            traducteur: {
              select: { id: true, nom: true, categorie: true, divisions: true }
            }
          }
        }
      },
      orderBy: [
        { actif: 'desc' },
        { nom: 'asc' }
      ]
    });
    
    // Formatter la réponse
    const result = equipes.map(e => ({
      id: e.id,
      nom: e.nom,
      code: e.code,
      description: e.description,
      couleur: e.couleur,
      clientId: e.clientId,
      clientNom: e.clientNom,
      objectif: e.objectif,
      dateDebut: e.dateDebut,
      dateFin: e.dateFin,
      actif: e.actif,
      archive: e.archive,
      creeLe: e.creeLe,
      membresCount: e.membres.length,
      membres: e.membres.map(m => ({
        id: m.id,
        traducteurId: m.traducteurId,
        nom: m.traducteur.nom,
        categorie: m.traducteur.categorie,
        divisions: m.traducteur.divisions,
        role: m.role,
        dateAjout: m.dateAjout
      }))
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Erreur GET /equipes-projet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/equipes-projet/:id - Détail d'une équipe
router.get('/:id', authentifier, async (req: Request, res: Response) => {
  try {
    const equipe = await prisma.equipeProjet.findUnique({
      where: { id: req.params.id },
      include: {
        membres: {
          include: {
            traducteur: {
              select: { 
                id: true, 
                nom: true, 
                categorie: true, 
                divisions: true,
                domaines: true,
                pairesLinguistiques: true,
                actif: true
              }
            }
          },
          orderBy: [
            { role: 'asc' },
            { dateAjout: 'asc' }
          ]
        }
      }
    });
    
    if (!equipe) {
      return res.status(404).json({ error: 'Équipe non trouvée' });
    }
    
    res.json(equipe);
  } catch (error) {
    console.error('Erreur GET /equipes-projet/:id:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/equipes-projet - Créer une équipe
router.post('/', authentifier, verifierRole('ADMIN', 'GESTIONNAIRE'), async (req: Request, res: Response) => {
  try {
    const { nom, code, description, couleur, clientId, clientNom, objectif, dateDebut, dateFin } = req.body;
    const userId = (req as AuthRequest).utilisateur?.id || 'system';
    
    if (!nom || !code) {
      return res.status(400).json({ error: 'Nom et code sont requis' });
    }
    
    // Vérifier unicité
    const existing = await prisma.equipeProjet.findFirst({
      where: { OR: [{ nom }, { code }] }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Une équipe avec ce nom ou ce code existe déjà' });
    }
    
    const equipe = await prisma.equipeProjet.create({
      data: {
        nom,
        code: code.toUpperCase(),
        description,
        couleur: couleur || '#3B82F6',
        clientId,
        clientNom,
        objectif,
        dateDebut: dateDebut ? new Date(dateDebut) : null,
        dateFin: dateFin ? new Date(dateFin) : null,
        creePar: userId
      }
    });
    
    res.status(201).json(equipe);
  } catch (error) {
    console.error('Erreur POST /equipes-projet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/equipes-projet/:id - Modifier une équipe
router.put('/:id', authentifier, verifierRole('ADMIN', 'GESTIONNAIRE'), async (req: Request, res: Response) => {
  try {
    const { nom, code, description, couleur, clientId, clientNom, objectif, dateDebut, dateFin, actif, archive } = req.body;
    const userId = (req as AuthRequest).utilisateur?.id || 'system';
    
    // Vérifier que l'équipe existe
    const existing = await prisma.equipeProjet.findUnique({
      where: { id: req.params.id }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Équipe non trouvée' });
    }
    
    // Si archivée, on ne peut plus modifier (sauf désarchiver)
    if (existing.archive && archive !== false) {
      return res.status(400).json({ error: 'Une équipe archivée ne peut pas être modifiée' });
    }
    
    const equipe = await prisma.equipeProjet.update({
      where: { id: req.params.id },
      data: {
        nom,
        code: code?.toUpperCase(),
        description,
        couleur,
        clientId,
        clientNom,
        objectif,
        dateDebut: dateDebut ? new Date(dateDebut) : null,
        dateFin: dateFin ? new Date(dateFin) : null,
        actif,
        archive,
        modifiePar: userId
      }
    });
    
    res.json(equipe);
  } catch (error) {
    console.error('Erreur PUT /equipes-projet/:id:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/equipes-projet/:id - Supprimer une équipe
router.delete('/:id', authentifier, verifierRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.equipeProjet.delete({
      where: { id: req.params.id }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE /equipes-projet/:id:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GESTION DES MEMBRES
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/equipes-projet/:id/membres - Ajouter un membre
router.post('/:id/membres', authentifier, verifierRole('ADMIN', 'GESTIONNAIRE'), async (req: Request, res: Response) => {
  try {
    const { traducteurId, role, notes } = req.body;
    const userId = (req as AuthRequest).utilisateur?.id || 'system';
    
    if (!traducteurId) {
      return res.status(400).json({ error: 'traducteurId est requis' });
    }
    
    // Vérifier que l'équipe existe et n'est pas archivée
    const equipe = await prisma.equipeProjet.findUnique({
      where: { id: req.params.id }
    });
    
    if (!equipe) {
      return res.status(404).json({ error: 'Équipe non trouvée' });
    }
    
    if (equipe.archive) {
      return res.status(400).json({ error: 'Impossible d\'ajouter un membre à une équipe archivée' });
    }
    
    // Vérifier si déjà membre
    const existingMembre = await prisma.equipeProjetMembre.findUnique({
      where: {
        equipeProjetId_traducteurId: {
          equipeProjetId: req.params.id,
          traducteurId
        }
      }
    });
    
    if (existingMembre) {
      // Réactiver si inactif
      if (!existingMembre.actif) {
        const updated = await prisma.equipeProjetMembre.update({
          where: { id: existingMembre.id },
          data: { 
            actif: true, 
            dateRetrait: null,
            role: role || existingMembre.role,
            notes
          },
          include: {
            traducteur: {
              select: { id: true, nom: true, categorie: true }
            }
          }
        });
        return res.json(updated);
      }
      return res.status(400).json({ error: 'Ce traducteur est déjà membre de cette équipe' });
    }
    
    const membre = await prisma.equipeProjetMembre.create({
      data: {
        equipeProjetId: req.params.id,
        traducteurId,
        role: role || 'MEMBRE',
        ajoutePar: userId,
        notes
      },
      include: {
        traducteur: {
          select: { id: true, nom: true, categorie: true }
        }
      }
    });
    
    res.status(201).json(membre);
  } catch (error) {
    console.error('Erreur POST /equipes-projet/:id/membres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/equipes-projet/:id/membres/:membreId - Modifier un membre
router.put('/:id/membres/:membreId', authentifier, verifierRole('ADMIN', 'GESTIONNAIRE'), async (req: Request, res: Response) => {
  try {
    const { role, notes, actif } = req.body;
    
    const membre = await prisma.equipeProjetMembre.update({
      where: { id: req.params.membreId },
      data: {
        role,
        notes,
        actif,
        dateRetrait: actif === false ? new Date() : null
      },
      include: {
        traducteur: {
          select: { id: true, nom: true, categorie: true }
        }
      }
    });
    
    res.json(membre);
  } catch (error) {
    console.error('Erreur PUT /equipes-projet/:id/membres/:membreId:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/equipes-projet/:id/membres/:membreId - Retirer un membre
router.delete('/:id/membres/:membreId', authentifier, verifierRole('ADMIN', 'GESTIONNAIRE'), async (req: Request, res: Response) => {
  try {
    // Soft delete - on désactive plutôt que supprimer
    await prisma.equipeProjetMembre.update({
      where: { id: req.params.membreId },
      data: { 
        actif: false,
        dateRetrait: new Date()
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE /equipes-projet/:id/membres/:membreId:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/equipes-projet/traducteur/:traducteurId - Équipes d'un traducteur
router.get('/traducteur/:traducteurId', authentifier, async (req: Request, res: Response) => {
  try {
    const membres = await prisma.equipeProjetMembre.findMany({
      where: {
        traducteurId: req.params.traducteurId,
        actif: true
      },
      include: {
        equipeProjet: true
      }
    });
    
    const equipes = membres.map(m => ({
      ...m.equipeProjet,
      role: m.role,
      dateAjout: m.dateAjout
    }));
    
    res.json(equipes);
  } catch (error) {
    console.error('Erreur GET /equipes-projet/traducteur/:traducteurId:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
