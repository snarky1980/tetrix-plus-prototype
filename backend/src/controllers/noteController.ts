import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import * as noteService from '../services/noteService';
import { TypeEntiteNote, CategorieNote, VisibiliteNote, PrismaClient } from '.prisma/client';

const prisma = new PrismaClient();
import path from 'path';
import fs from 'fs';

// ============================================
// SCHEMAS DE VALIDATION
// ============================================

const creerNoteSchema = z.object({
  titre: z.string().min(1, 'Titre requis').max(200),
  contenu: z.string().min(1, 'Contenu requis').max(50000),
  categorie: z.nativeEnum(CategorieNote).optional(),
  visibilite: z.nativeEnum(VisibiliteNote).optional(),
  entiteType: z.nativeEnum(TypeEntiteNote),
  entiteId: z.string().uuid(),
  epingle: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

const modifierNoteSchema = z.object({
  titre: z.string().min(1).max(200).optional(),
  contenu: z.string().min(1).max(50000).optional(),
  categorie: z.nativeEnum(CategorieNote).optional(),
  visibilite: z.nativeEnum(VisibiliteNote).optional(),
  epingle: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

const filtresNotesSchema = z.object({
  entiteType: z.nativeEnum(TypeEntiteNote).optional(),
  entiteId: z.string().uuid().optional(),
  categorie: z.nativeEnum(CategorieNote).optional(),
  tags: z.array(z.string()).optional(),
  epingleSeulement: z.coerce.boolean().optional(),
  recherche: z.string().max(100).optional(),
});

// ============================================
// HELPERS
// ============================================

function getUtilisateurNom(req: AuthRequest): string {
  const user = req.utilisateur!;
  // AuthRequest n'a que id, email, role - on utilise l'email
  return user.email.split('@')[0];
}

async function getTraducteurId(utilisateurId: string): Promise<string | undefined> {
  const traducteur = await prisma.traducteur.findUnique({
    where: { utilisateurId },
    select: { id: true },
  });
  return traducteur?.id;
}

// ============================================
// ENDPOINTS NOTES
// ============================================

/**
 * POST /api/notes - Créer une note
 */
export async function creerNote(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = creerNoteSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ 
        erreur: 'Données invalides', 
        details: validation.error.flatten() 
      });
      return;
    }

    const user = req.utilisateur!;
    const note = await noteService.creerNote(
      validation.data,
      user.id,
      getUtilisateurNom(req)
    );

    res.status(201).json(note);
  } catch (error: any) {
    console.error('Erreur création note:', error);
    res.status(500).json({ erreur: error.message || 'Erreur serveur' });
  }
}

/**
 * GET /api/notes/:id - Obtenir une note
 */
export async function obtenirNote(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.utilisateur!;

    const note = await noteService.obtenirNote(id);
    if (!note) {
      res.status(404).json({ erreur: 'Note non trouvée' });
      return;
    }

    const traducteurId = await getTraducteurId(user.id);
    if (!noteService.peutVoirNote(note, user.id, user.role, traducteurId)) {
      res.status(403).json({ erreur: 'Accès non autorisé' });
      return;
    }

    res.json(note);
  } catch (error: any) {
    console.error('Erreur obtention note:', error);
    res.status(500).json({ erreur: error.message || 'Erreur serveur' });
  }
}

/**
 * GET /api/notes/entite/:entiteType/:entiteId - Notes d'une entité
 */
export async function obtenirNotesEntite(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { entiteType, entiteId } = req.params;
    const user = req.utilisateur!;

    // Valider le type d'entité
    if (!Object.values(TypeEntiteNote).includes(entiteType as TypeEntiteNote)) {
      res.status(400).json({ erreur: 'Type d\'entité invalide' });
      return;
    }

    const traducteurId = await getTraducteurId(user.id);
    const notes = await noteService.obtenirNotesEntite(
      entiteType as TypeEntiteNote,
      entiteId,
      user.id,
      user.role,
      traducteurId
    );

    res.json(notes);
  } catch (error: any) {
    console.error('Erreur obtention notes entité:', error);
    res.status(500).json({ erreur: error.message || 'Erreur serveur' });
  }
}

/**
 * GET /api/notes/recherche - Rechercher des notes
 */
export async function rechercherNotes(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = filtresNotesSchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({ 
        erreur: 'Paramètres invalides', 
        details: validation.error.flatten() 
      });
      return;
    }

    const user = req.utilisateur!;
    const traducteurId = await getTraducteurId(user.id);
    
    const notes = await noteService.rechercherNotes(
      validation.data,
      user.id,
      user.role,
      traducteurId
    );

    res.json(notes);
  } catch (error: any) {
    console.error('Erreur recherche notes:', error);
    res.status(500).json({ erreur: error.message || 'Erreur serveur' });
  }
}

/**
 * PUT /api/notes/:id - Modifier une note
 */
export async function modifierNote(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const validation = modifierNoteSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({ 
        erreur: 'Données invalides', 
        details: validation.error.flatten() 
      });
      return;
    }

    const user = req.utilisateur!;
    const note = await noteService.modifierNote(
      id,
      validation.data,
      user.id,
      getUtilisateurNom(req),
      user.role
    );

    res.json(note);
  } catch (error: any) {
    if (error.message === 'Note non trouvée') {
      res.status(404).json({ erreur: error.message });
      return;
    }
    if (error.message === 'Permission refusée') {
      res.status(403).json({ erreur: error.message });
      return;
    }
    console.error('Erreur modification note:', error);
    res.status(500).json({ erreur: error.message || 'Erreur serveur' });
  }
}

/**
 * PATCH /api/notes/:id/epingle - Toggle épingle
 */
export async function toggleEpingle(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.utilisateur!;

    const note = await noteService.toggleEpingle(
      id,
      user.id,
      getUtilisateurNom(req),
      user.role
    );

    res.json(note);
  } catch (error: any) {
    if (error.message === 'Note non trouvée') {
      res.status(404).json({ erreur: error.message });
      return;
    }
    if (error.message === 'Permission refusée') {
      res.status(403).json({ erreur: error.message });
      return;
    }
    console.error('Erreur toggle épingle:', error);
    res.status(500).json({ erreur: error.message || 'Erreur serveur' });
  }
}

/**
 * DELETE /api/notes/:id - Supprimer une note
 */
export async function supprimerNote(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.utilisateur!;

    await noteService.supprimerNote(id, user.id, user.role);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Note non trouvée') {
      res.status(404).json({ erreur: error.message });
      return;
    }
    if (error.message === 'Permission refusée') {
      res.status(403).json({ erreur: error.message });
      return;
    }
    console.error('Erreur suppression note:', error);
    res.status(500).json({ erreur: error.message || 'Erreur serveur' });
  }
}

/**
 * GET /api/notes/stats/:entiteType/:entiteId - Statistiques notes
 */
export async function obtenirStatistiques(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { entiteType, entiteId } = req.params;

    if (!Object.values(TypeEntiteNote).includes(entiteType as TypeEntiteNote)) {
      res.status(400).json({ erreur: 'Type d\'entité invalide' });
      return;
    }

    const stats = await noteService.obtenirStatistiquesNotes(
      entiteType as TypeEntiteNote,
      entiteId
    );

    res.json(stats);
  } catch (error: any) {
    console.error('Erreur statistiques notes:', error);
    res.status(500).json({ erreur: error.message || 'Erreur serveur' });
  }
}

// ============================================
// ENDPOINTS PIÈCES JOINTES
// ============================================

// Dossier de stockage des fichiers
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'pieces-jointes');

// S'assurer que le dossier existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * POST /api/notes/pieces-jointes - Upload une pièce jointe
 * Note: En production, utiliser un service de stockage (S3, etc.)
 */
export async function uploadPieceJointe(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Vérifier qu'un fichier a été uploadé (via multer ou formidable)
    if (!req.file) {
      res.status(400).json({ erreur: 'Aucun fichier fourni' });
      return;
    }

    const user = req.utilisateur!;
    const file = req.file;
    
    // Extraire les métadonnées du body
    const { noteId, entiteType, entiteId } = req.body;

    // Générer un nom unique
    const extension = path.extname(file.originalname);
    const nomFichier = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${extension}`;
    const cheminFichier = path.join(UPLOAD_DIR, nomFichier);

    // Le fichier est déjà sauvegardé par multer, on a juste besoin du chemin
    const pieceJointe = await noteService.ajouterPieceJointe(
      {
        nom: nomFichier,
        nomOriginal: file.originalname,
        typeMime: file.mimetype,
        taille: file.size,
        chemin: file.path || cheminFichier,
        noteId: noteId || undefined,
        entiteType: entiteType as TypeEntiteNote || undefined,
        entiteId: entiteId || undefined,
      },
      user.id,
      getUtilisateurNom(req)
    );

    res.status(201).json(pieceJointe);
  } catch (error: any) {
    console.error('Erreur upload pièce jointe:', error);
    res.status(500).json({ erreur: error.message || 'Erreur serveur' });
  }
}

/**
 * DELETE /api/notes/pieces-jointes/:id - Supprimer une pièce jointe
 */
export async function supprimerPieceJointe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.utilisateur!;

    // Récupérer le chemin avant suppression pour supprimer le fichier
    const pieceJointe = await prisma.pieceJointe.findUnique({
      where: { id },
      select: { chemin: true },
    });

    await noteService.supprimerPieceJointe(id, user.id, user.role);

    // Supprimer le fichier physique si local
    if (pieceJointe?.chemin && fs.existsSync(pieceJointe.chemin)) {
      fs.unlinkSync(pieceJointe.chemin);
    }

    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Pièce jointe non trouvée') {
      res.status(404).json({ erreur: error.message });
      return;
    }
    if (error.message === 'Permission refusée') {
      res.status(403).json({ erreur: error.message });
      return;
    }
    console.error('Erreur suppression pièce jointe:', error);
    res.status(500).json({ erreur: error.message || 'Erreur serveur' });
  }
}

/**
 * GET /api/notes/pieces-jointes/:id/download - Télécharger une pièce jointe
 */
export async function telechargerPieceJointe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const pieceJointe = await prisma.pieceJointe.findUnique({
      where: { id },
    });

    if (!pieceJointe) {
      res.status(404).json({ erreur: 'Pièce jointe non trouvée' });
      return;
    }

    // Vérifier que le fichier existe
    if (!fs.existsSync(pieceJointe.chemin)) {
      res.status(404).json({ erreur: 'Fichier non trouvé sur le serveur' });
      return;
    }

    res.download(pieceJointe.chemin, pieceJointe.nomOriginal);
  } catch (error: any) {
    console.error('Erreur téléchargement pièce jointe:', error);
    res.status(500).json({ erreur: error.message || 'Erreur serveur' });
  }
}

/**
 * GET /api/notes/pieces-jointes/entite/:entiteType/:entiteId - Pièces jointes d'une entité
 */
export async function obtenirPiecesJointesEntite(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { entiteType, entiteId } = req.params;

    if (!Object.values(TypeEntiteNote).includes(entiteType as TypeEntiteNote)) {
      res.status(400).json({ erreur: 'Type d\'entité invalide' });
      return;
    }

    const piecesJointes = await noteService.obtenirPiecesJointesEntite(
      entiteType as TypeEntiteNote,
      entiteId
    );

    res.json(piecesJointes);
  } catch (error: any) {
    console.error('Erreur obtention pièces jointes:', error);
    res.status(500).json({ erreur: error.message || 'Erreur serveur' });
  }
}

// ============================================
// RÉFÉRENTIELS
// ============================================

/**
 * GET /api/notes/referentiels - Types et catégories disponibles
 */
export function obtenirReferentiels(_req: Request, res: Response): void {
  res.json({
    typesEntite: Object.values(TypeEntiteNote),
    categories: Object.values(CategorieNote),
    visibilites: Object.values(VisibiliteNote),
    categoriesLabels: {
      GENERALE: 'Générale',
      CONTACT: 'Contact',
      PROCEDURE: 'Procédure',
      TERMINOLOGIE: 'Terminologie',
      PREFERENCE: 'Préférence',
      HISTORIQUE: 'Historique',
      ALERTE: 'Alerte',
    },
    visibilitesLabels: {
      PRIVE: 'Privé (auteur seulement)',
      EQUIPE: 'Équipe (conseillers/gestionnaires)',
      TRADUCTEUR: 'Traducteurs concernés',
      PUBLIC: 'Public (tous)',
    },
    typesEntiteLabels: {
      CLIENT: 'Client',
      TRADUCTEUR: 'Traducteur',
      DIVISION: 'Division',
      EQUIPE_PROJET: 'Équipe-projet',
      TACHE: 'Tâche',
      SOUS_DOMAINE: 'Sous-domaine',
    },
  });
}
