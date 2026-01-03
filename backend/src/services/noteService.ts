import { PrismaClient, TypeEntiteNote, CategorieNote, VisibiliteNote, Role, Note, PieceJointe } from '.prisma/client';

const prisma = new PrismaClient();

// ============================================
// TYPES
// ============================================

export interface NoteAvecPiecesJointes extends Note {
  piecesJointes: PieceJointe[];
}

export interface CreerNoteInput {
  titre: string;
  contenu: string;
  categorie?: CategorieNote;
  visibilite?: VisibiliteNote;
  entiteType: TypeEntiteNote;
  entiteId: string;
  epingle?: boolean;
  tags?: string[];
}

export interface ModifierNoteInput {
  titre?: string;
  contenu?: string;
  categorie?: CategorieNote;
  visibilite?: VisibiliteNote;
  epingle?: boolean;
  tags?: string[];
}

export interface FiltresNotes {
  entiteType?: TypeEntiteNote;
  entiteId?: string;
  categorie?: CategorieNote;
  tags?: string[];
  epingleSeulement?: boolean;
  recherche?: string;
}

// ============================================
// PERMISSIONS
// ============================================

/**
 * Détermine si un utilisateur peut voir une note selon sa visibilité et son rôle
 */
export function peutVoirNote(
  note: Note,
  utilisateurId: string,
  role: Role,
  traducteurId?: string
): boolean {
  // L'auteur peut toujours voir ses notes
  if (note.creeParId === utilisateurId) {
    return true;
  }

  switch (note.visibilite) {
    case 'PUBLIC':
      return true;
    
    case 'TRADUCTEUR':
      // ADMIN, CONSEILLER, GESTIONNAIRE peuvent voir
      // TRADUCTEUR peut voir si c'est lié à lui
      if (['ADMIN', 'CONSEILLER', 'GESTIONNAIRE'].includes(role)) {
        return true;
      }
      // Traducteur peut voir si la note concerne son profil
      if (role === 'TRADUCTEUR' && traducteurId) {
        return note.entiteType === 'TRADUCTEUR' && note.entiteId === traducteurId;
      }
      return false;
    
    case 'EQUIPE':
      // Seulement ADMIN, CONSEILLER, GESTIONNAIRE
      return ['ADMIN', 'CONSEILLER', 'GESTIONNAIRE'].includes(role);
    
    case 'PRIVE':
      // Seulement l'auteur (déjà vérifié au-dessus)
      return false;
    
    default:
      return false;
  }
}

/**
 * Détermine si un utilisateur peut modifier une note
 */
export function peutModifierNote(
  note: Note,
  utilisateurId: string,
  role: Role
): boolean {
  // L'auteur peut toujours modifier
  if (note.creeParId === utilisateurId) {
    return true;
  }
  // ADMIN peut modifier toutes les notes
  if (role === 'ADMIN') {
    return true;
  }
  // GESTIONNAIRE peut modifier les notes EQUIPE et PUBLIC
  if (role === 'GESTIONNAIRE' && ['EQUIPE', 'PUBLIC'].includes(note.visibilite)) {
    return true;
  }
  return false;
}

/**
 * Détermine si un utilisateur peut supprimer une note
 */
export function peutSupprimerNote(
  note: Note,
  utilisateurId: string,
  role: Role
): boolean {
  // L'auteur peut supprimer
  if (note.creeParId === utilisateurId) {
    return true;
  }
  // ADMIN peut tout supprimer
  if (role === 'ADMIN') {
    return true;
  }
  return false;
}

// ============================================
// SERVICE NOTES
// ============================================

/**
 * Créer une nouvelle note
 */
export async function creerNote(
  input: CreerNoteInput,
  utilisateurId: string,
  utilisateurNom: string
): Promise<NoteAvecPiecesJointes> {
  // Vérifier que l'entité existe
  await verifierEntiteExiste(input.entiteType, input.entiteId);

  const note = await prisma.note.create({
    data: {
      titre: input.titre,
      contenu: input.contenu,
      categorie: input.categorie || 'GENERALE',
      visibilite: input.visibilite || 'EQUIPE',
      entiteType: input.entiteType,
      entiteId: input.entiteId,
      epingle: input.epingle || false,
      tags: input.tags || [],
      creeParId: utilisateurId,
      creePar: utilisateurNom,
    },
    include: {
      piecesJointes: true,
    },
  });

  return note;
}

/**
 * Récupérer une note par ID
 */
export async function obtenirNote(
  noteId: string
): Promise<NoteAvecPiecesJointes | null> {
  return prisma.note.findUnique({
    where: { id: noteId },
    include: { piecesJointes: true },
  });
}

/**
 * Récupérer les notes d'une entité avec filtrage par permissions
 */
export async function obtenirNotesEntite(
  entiteType: TypeEntiteNote,
  entiteId: string,
  utilisateurId: string,
  role: Role,
  traducteurId?: string
): Promise<NoteAvecPiecesJointes[]> {
  const notes = await prisma.note.findMany({
    where: {
      entiteType,
      entiteId,
    },
    include: {
      piecesJointes: true,
    },
    orderBy: [
      { epingle: 'desc' },
      { creeLe: 'desc' },
    ],
  });

  // Filtrer selon les permissions
  return notes.filter(note => 
    peutVoirNote(note, utilisateurId, role, traducteurId)
  );
}

/**
 * Rechercher des notes avec filtres
 */
export async function rechercherNotes(
  filtres: FiltresNotes,
  utilisateurId: string,
  role: Role,
  traducteurId?: string
): Promise<NoteAvecPiecesJointes[]> {
  const where: any = {};

  if (filtres.entiteType) {
    where.entiteType = filtres.entiteType;
  }
  if (filtres.entiteId) {
    where.entiteId = filtres.entiteId;
  }
  if (filtres.categorie) {
    where.categorie = filtres.categorie;
  }
  if (filtres.epingleSeulement) {
    where.epingle = true;
  }
  if (filtres.tags && filtres.tags.length > 0) {
    where.tags = { hasSome: filtres.tags };
  }
  if (filtres.recherche) {
    where.OR = [
      { titre: { contains: filtres.recherche, mode: 'insensitive' } },
      { contenu: { contains: filtres.recherche, mode: 'insensitive' } },
    ];
  }

  const notes = await prisma.note.findMany({
    where,
    include: { piecesJointes: true },
    orderBy: [
      { epingle: 'desc' },
      { creeLe: 'desc' },
    ],
    take: 100, // Limite de sécurité
  });

  return notes.filter(note =>
    peutVoirNote(note, utilisateurId, role, traducteurId)
  );
}

/**
 * Modifier une note
 */
export async function modifierNote(
  noteId: string,
  input: ModifierNoteInput,
  utilisateurId: string,
  utilisateurNom: string,
  role: Role
): Promise<NoteAvecPiecesJointes> {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
  });

  if (!note) {
    throw new Error('Note non trouvée');
  }

  if (!peutModifierNote(note, utilisateurId, role)) {
    throw new Error('Permission refusée');
  }

  return prisma.note.update({
    where: { id: noteId },
    data: {
      ...input,
      modifieParId: utilisateurId,
      modifiePar: utilisateurNom,
    },
    include: { piecesJointes: true },
  });
}

/**
 * Épingler/désépingler une note
 */
export async function toggleEpingle(
  noteId: string,
  utilisateurId: string,
  utilisateurNom: string,
  role: Role
): Promise<NoteAvecPiecesJointes> {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
  });

  if (!note) {
    throw new Error('Note non trouvée');
  }

  if (!peutModifierNote(note, utilisateurId, role)) {
    throw new Error('Permission refusée');
  }

  return prisma.note.update({
    where: { id: noteId },
    data: {
      epingle: !note.epingle,
      modifieParId: utilisateurId,
      modifiePar: utilisateurNom,
    },
    include: { piecesJointes: true },
  });
}

/**
 * Supprimer une note
 */
export async function supprimerNote(
  noteId: string,
  utilisateurId: string,
  role: Role
): Promise<void> {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
  });

  if (!note) {
    throw new Error('Note non trouvée');
  }

  if (!peutSupprimerNote(note, utilisateurId, role)) {
    throw new Error('Permission refusée');
  }

  // Les pièces jointes seront supprimées en cascade
  await prisma.note.delete({
    where: { id: noteId },
  });
}

// ============================================
// PIÈCES JOINTES
// ============================================

export interface CreerPieceJointeInput {
  nom: string;
  nomOriginal: string;
  typeMime: string;
  taille: number;
  chemin: string;
  noteId?: string;
  entiteType?: TypeEntiteNote;
  entiteId?: string;
}

/**
 * Ajouter une pièce jointe
 */
export async function ajouterPieceJointe(
  input: CreerPieceJointeInput,
  utilisateurId: string,
  utilisateurNom: string
): Promise<PieceJointe> {
  return prisma.pieceJointe.create({
    data: {
      nom: input.nom,
      nomOriginal: input.nomOriginal,
      typeMime: input.typeMime,
      taille: input.taille,
      chemin: input.chemin,
      noteId: input.noteId,
      entiteType: input.entiteType,
      entiteId: input.entiteId,
      creeParId: utilisateurId,
      creePar: utilisateurNom,
    },
  });
}

/**
 * Supprimer une pièce jointe
 */
export async function supprimerPieceJointe(
  pieceJointeId: string,
  utilisateurId: string,
  role: Role
): Promise<void> {
  const pieceJointe = await prisma.pieceJointe.findUnique({
    where: { id: pieceJointeId },
    include: { note: true },
  });

  if (!pieceJointe) {
    throw new Error('Pièce jointe non trouvée');
  }

  // Vérifier permissions
  const peutSupprimer = 
    pieceJointe.creeParId === utilisateurId ||
    role === 'ADMIN' ||
    (pieceJointe.note && peutSupprimerNote(pieceJointe.note, utilisateurId, role));

  if (!peutSupprimer) {
    throw new Error('Permission refusée');
  }

  await prisma.pieceJointe.delete({
    where: { id: pieceJointeId },
  });
}

/**
 * Obtenir les pièces jointes d'une entité (sans note)
 */
export async function obtenirPiecesJointesEntite(
  entiteType: TypeEntiteNote,
  entiteId: string
): Promise<PieceJointe[]> {
  return prisma.pieceJointe.findMany({
    where: {
      entiteType,
      entiteId,
      noteId: null, // Seulement celles attachées directement
    },
    orderBy: { creeLe: 'desc' },
  });
}

// ============================================
// STATISTIQUES
// ============================================

export interface StatistiquesNotes {
  total: number;
  parCategorie: Record<CategorieNote, number>;
  parVisibilite: Record<VisibiliteNote, number>;
  epinglees: number;
  piecesJointes: number;
}

/**
 * Obtenir les statistiques des notes d'une entité
 */
export async function obtenirStatistiquesNotes(
  entiteType: TypeEntiteNote,
  entiteId: string
): Promise<StatistiquesNotes> {
  const [notes, piecesJointes] = await Promise.all([
    prisma.note.findMany({
      where: { entiteType, entiteId },
      select: { categorie: true, visibilite: true, epingle: true },
    }),
    prisma.pieceJointe.count({
      where: {
        OR: [
          { note: { entiteType, entiteId } },
          { entiteType, entiteId, noteId: null },
        ],
      },
    }),
  ]);

  const parCategorie: Record<CategorieNote, number> = {
    GENERALE: 0,
    CONTACT: 0,
    PROCEDURE: 0,
    TERMINOLOGIE: 0,
    PREFERENCE: 0,
    HISTORIQUE: 0,
    ALERTE: 0,
  };

  const parVisibilite: Record<VisibiliteNote, number> = {
    PRIVE: 0,
    EQUIPE: 0,
    TRADUCTEUR: 0,
    PUBLIC: 0,
  };

  let epinglees = 0;

  for (const note of notes) {
    parCategorie[note.categorie]++;
    parVisibilite[note.visibilite]++;
    if (note.epingle) epinglees++;
  }

  return {
    total: notes.length,
    parCategorie,
    parVisibilite,
    epinglees,
    piecesJointes,
  };
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Vérifier qu'une entité existe
 */
async function verifierEntiteExiste(
  entiteType: TypeEntiteNote,
  entiteId: string
): Promise<void> {
  let existe = false;

  switch (entiteType) {
    case 'CLIENT':
      existe = !!(await prisma.client.findUnique({ where: { id: entiteId } }));
      break;
    case 'TRADUCTEUR':
      existe = !!(await prisma.traducteur.findUnique({ where: { id: entiteId } }));
      break;
    case 'DIVISION':
      existe = !!(await prisma.division.findUnique({ where: { id: entiteId } }));
      break;
    case 'EQUIPE_PROJET':
      existe = !!(await prisma.equipeProjet.findUnique({ where: { id: entiteId } }));
      break;
    case 'TACHE':
      existe = !!(await prisma.tache.findUnique({ where: { id: entiteId } }));
      break;
    case 'SOUS_DOMAINE':
      existe = !!(await prisma.sousDomaine.findUnique({ where: { id: entiteId } }));
      break;
    case 'UTILISATEUR':
      existe = !!(await prisma.utilisateur.findUnique({ where: { id: entiteId } }));
      break;
  }

  if (!existe) {
    throw new Error(`Entité ${entiteType} avec ID ${entiteId} non trouvée`);
  }
}

/**
 * Obtenir le nom de l'entité pour l'affichage
 */
export async function obtenirNomEntite(
  entiteType: TypeEntiteNote,
  entiteId: string
): Promise<string> {
  switch (entiteType) {
    case 'CLIENT': {
      const client = await prisma.client.findUnique({ 
        where: { id: entiteId },
        select: { nom: true }
      });
      return client?.nom || 'Client inconnu';
    }
    case 'TRADUCTEUR': {
      const traducteur = await prisma.traducteur.findUnique({ 
        where: { id: entiteId },
        select: { nom: true }
      });
      return traducteur?.nom || 'Traducteur inconnu';
    }
    case 'DIVISION': {
      const division = await prisma.division.findUnique({ 
        where: { id: entiteId },
        select: { nom: true }
      });
      return division?.nom || 'Division inconnue';
    }
    case 'EQUIPE_PROJET': {
      const equipe = await prisma.equipeProjet.findUnique({ 
        where: { id: entiteId },
        select: { nom: true }
      });
      return equipe?.nom || 'Équipe inconnue';
    }
    case 'TACHE': {
      const tache = await prisma.tache.findUnique({ 
        where: { id: entiteId },
        select: { numeroProjet: true }
      });
      return tache?.numeroProjet || 'Tâche inconnue';
    }
    case 'SOUS_DOMAINE': {
      const sousDomaine = await prisma.sousDomaine.findUnique({ 
        where: { id: entiteId },
        select: { nom: true }
      });
      return sousDomaine?.nom || 'Sous-domaine inconnu';
    }
    case 'UTILISATEUR': {
      const utilisateur = await prisma.utilisateur.findUnique({ 
        where: { id: entiteId },
        select: { email: true }
      });
      return utilisateur?.email || 'Utilisateur inconnu';
    }
    default:
      return 'Entité inconnue';
  }
}
