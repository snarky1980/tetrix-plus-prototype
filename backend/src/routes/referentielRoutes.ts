import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authentifier, verifierRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Tous les endpoints nécessitent une authentification
router.use(authentifier);

// ====== PAIRES LINGUISTIQUES ======

/**
 * GET /api/referentiel/paires-linguistiques
 * Obtenir toutes les paires linguistiques uniques utilisées dans le système
 * Retourne des UUIDs réels (une paire représentative par combinaison)
 */
router.get('/paires-linguistiques', verifierRole('ADMIN', 'CONSEILLER', 'GESTIONNAIRE'), async (req, res) => {
  try {
    // Récupérer toutes les paires avec leur vrai UUID
    const toutesPaires = await prisma.paireLinguistique.findMany({
      select: {
        id: true,
        langueSource: true,
        langueCible: true,
      },
    });

    // Grouper par combinaison langue et compter, garder un UUID représentatif
    const pairesMap = new Map<string, { id: string; langueSource: string; langueCible: string; count: number }>();
    
    toutesPaires.forEach((p) => {
      const key = `${p.langueSource}-${p.langueCible}`;
      const existing = pairesMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        pairesMap.set(key, {
          id: p.id, // UUID réel
          langueSource: p.langueSource,
          langueCible: p.langueCible,
          count: 1,
        });
      }
    });

    const pairesAvecStats = Array.from(pairesMap.values()).map((p) => ({
      id: p.id,
      langueSource: p.langueSource,
      langueCible: p.langueCible,
      actif: true,
      utilisationCount: p.count,
    }));

    res.json(pairesAvecStats);
  } catch (error) {
    console.error('Erreur lors de la récupération des paires linguistiques:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/referentiel/paires-linguistiques
 * Créer une nouvelle paire linguistique de référence
 * Crée une paire pour un traducteur de référence et retourne le vrai UUID
 */
router.post('/paires-linguistiques', verifierRole('ADMIN'), async (req, res) => {
  try {
    const { langueSource, langueCible } = req.body;

    if (!langueSource || !langueCible) {
      return res.status(400).json({ message: 'Langue source et cible requises' });
    }

    // Vérifier si la paire existe déjà
    const existante = await prisma.paireLinguistique.findFirst({
      where: { langueSource, langueCible },
    });

    if (existante) {
      return res.status(409).json({ message: 'Cette paire linguistique existe déjà' });
    }

    // Trouver un traducteur de référence (le premier actif)
    // La paire doit être liée à un traducteur pour exister dans la DB
    const traducteurRef = await prisma.traducteur.findFirst({
      where: { actif: true },
      select: { id: true },
    });

    if (!traducteurRef) {
      return res.status(400).json({ message: 'Aucun traducteur actif dans le système' });
    }

    // Créer la paire pour le traducteur de référence
    const nouvellePaire = await prisma.paireLinguistique.create({
      data: {
        langueSource,
        langueCible,
        traducteurId: traducteurRef.id,
      },
    });

    res.json({
      id: nouvellePaire.id, // UUID réel
      langueSource,
      langueCible,
      actif: true,
      utilisationCount: 1,
      message: 'Paire linguistique créée. Vous pouvez maintenant l\'assigner aux traducteurs.',
    });
  } catch (error) {
    console.error('Erreur lors de la création de la paire linguistique:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ====== SPÉCIALISATIONS ======

/**
 * GET /api/referentiel/specialisations
 * Obtenir toutes les spécialisations depuis la table normalisée
 */
router.get('/specialisations', verifierRole('ADMIN', 'CONSEILLER', 'GESTIONNAIRE'), async (req, res) => {
  try {
    // Utiliser la nouvelle table normalisée
    const specialisations = await prisma.specialisation.findMany({
      where: { actif: true },
      include: {
        _count: {
          select: { traducteurSpecialisations: true }
        }
      },
      orderBy: { nom: 'asc' },
    });

    const result = specialisations.map(spec => ({
      id: spec.id,
      nom: spec.nom,
      description: spec.description,
      actif: spec.actif,
      utilisationCount: spec._count.traducteurSpecialisations,
    }));

    res.json(result);
  } catch (error) {
    console.error('Erreur lors de la récupération des spécialisations:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/referentiel/specialisations
 * Créer une nouvelle spécialisation dans la table normalisée
 */
router.post('/specialisations', verifierRole('ADMIN'), async (req, res) => {
  try {
    const { nom, description } = req.body;

    if (!nom) {
      return res.status(400).json({ message: 'Nom de la spécialisation requis' });
    }

    // Vérifier si elle existe déjà dans la table normalisée
    const existante = await prisma.specialisation.findUnique({
      where: { nom },
    });

    if (existante) {
      return res.status(409).json({ message: 'Cette spécialisation existe déjà' });
    }

    // Créer dans la table normalisée
    const nouvelleSpec = await prisma.specialisation.create({
      data: { nom, description },
    });

    res.json({
      id: nouvelleSpec.id,
      nom: nouvelleSpec.nom,
      description: nouvelleSpec.description,
      actif: true,
      utilisationCount: 0,
      message: 'Spécialisation créée. Vous pouvez maintenant l\'assigner aux traducteurs.',
    });
  } catch (error) {
    console.error('Erreur lors de la création de la spécialisation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * PUT /api/referentiel/specialisations/:id
 * Modifier une spécialisation dans la table normalisée
 */
router.put('/specialisations/:id', verifierRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nom: nouveauNom, description } = req.body;

    if (!nouveauNom) {
      return res.status(400).json({ message: 'Nouveau nom requis' });
    }

    // Vérifier si le nouveau nom existe déjà (et qu'il est différent de l'ancien)
    const existante = await prisma.specialisation.findFirst({
      where: { nom: nouveauNom, NOT: { id } },
    });

    if (existante) {
      return res.status(409).json({ message: 'Une spécialisation avec ce nom existe déjà' });
    }

    // Mettre à jour dans la table normalisée
    const updated = await prisma.specialisation.update({
      where: { id },
      data: { nom: nouveauNom, description },
      include: {
        _count: { select: { traducteurSpecialisations: true } }
      }
    });

    res.json({
      id: updated.id,
      nom: updated.nom,
      description: updated.description,
      actif: updated.actif,
      utilisationCount: updated._count.traducteurSpecialisations,
      message: 'Spécialisation modifiée avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la modification de la spécialisation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/referentiel/specialisations/:id
 * Supprimer une spécialisation de la table normalisée
 */
router.delete('/specialisations/:id', verifierRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si elle est utilisée
    const spec = await prisma.specialisation.findUnique({
      where: { id },
      include: {
        _count: { select: { traducteurSpecialisations: true } }
      }
    });

    if (!spec) {
      return res.status(404).json({ message: 'Spécialisation non trouvée' });
    }

    if (spec._count.traducteurSpecialisations > 0) {
      return res.status(400).json({ 
        message: `Impossible de supprimer: ${spec._count.traducteurSpecialisations} traducteur(s) utilisent cette spécialisation` 
      });
    }

    // Supprimer de la table normalisée
    await prisma.specialisation.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de la spécialisation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ====== LANGUES ======

const LANGUES_STANDARDS = [
  { code: 'FR', nom: 'Français', nativeName: 'Français', actif: true },
  { code: 'EN', nom: 'Anglais', nativeName: 'English', actif: true },
  { code: 'ES', nom: 'Espagnol', nativeName: 'Español', actif: true },
  { code: 'DE', nom: 'Allemand', nativeName: 'Deutsch', actif: true },
  { code: 'IT', nom: 'Italien', nativeName: 'Italiano', actif: true },
  { code: 'PT', nom: 'Portugais', nativeName: 'Português', actif: true },
  { code: 'ZH', nom: 'Chinois', nativeName: '中文', actif: true },
  { code: 'JA', nom: 'Japonais', nativeName: '日本語', actif: true },
  { code: 'KO', nom: 'Coréen', nativeName: '한국어', actif: true },
  { code: 'AR', nom: 'Arabe', nativeName: 'العربية', actif: true },
  { code: 'RU', nom: 'Russe', nativeName: 'Русский', actif: true },
  { code: 'NL', nom: 'Néerlandais', nativeName: 'Nederlands', actif: true },
  { code: 'PL', nom: 'Polonais', nativeName: 'Polski', actif: true },
];

/**
 * GET /api/referentiel/langues
 * Obtenir toutes les langues disponibles (standards + utilisées)
 */
router.get('/langues', verifierRole('ADMIN', 'CONSEILLER', 'GESTIONNAIRE'), async (req, res) => {
  try {
    // Obtenir les langues utilisées dans les paires
    const paires = await prisma.paireLinguistique.findMany({
      select: {
        langueSource: true,
        langueCible: true,
      },
    });

    const languesUtilisees = new Set<string>();
    paires.forEach((p) => {
      languesUtilisees.add(p.langueSource);
      languesUtilisees.add(p.langueCible);
    });

    // Combiner avec les langues standards
    const languesMap = new Map<string, { code: string; nom: string; nativeName?: string; actif: boolean; utilisee: boolean }>();
    
    LANGUES_STANDARDS.forEach((l) => {
      languesMap.set(l.code, { ...l, utilisee: languesUtilisees.has(l.code) });
    });

    // Ajouter les langues utilisées mais pas dans les standards
    languesUtilisees.forEach((code) => {
      if (!languesMap.has(code)) {
        languesMap.set(code, {
          code,
          nom: code,
          actif: true,
          utilisee: true,
        });
      }
    });

    res.json(Array.from(languesMap.values()).sort((a, b) => a.nom.localeCompare(b.nom)));
  } catch (error) {
    console.error('Erreur lors de la récupération des langues:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/referentiel/langues
 * Créer une nouvelle langue personnalisée
 */
router.post('/langues', verifierRole('ADMIN'), async (req, res) => {
  try {
    const { code, nom, nativeName } = req.body;

    if (!code || !nom) {
      return res.status(400).json({ message: 'Code et nom requis' });
    }

    // Vérifier si la langue existe déjà
    const existante = LANGUES_STANDARDS.find(l => l.code === code.toUpperCase());
    if (existante) {
      return res.status(409).json({ message: 'Cette langue existe déjà dans les langues standards' });
    }

    res.json({
      code: code.toUpperCase(),
      nom,
      nativeName,
      actif: true,
      utilisee: false,
      message: 'Langue créée. Utilisez-la dans une paire linguistique pour l\'activer.',
    });
  } catch (error) {
    console.error('Erreur lors de la création de la langue:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ====== DOMAINES (amélioration) ======

/**
 * GET /api/referentiel/domaines
 * Obtenir tous les domaines avec leurs sous-domaines
 */
router.get('/domaines', verifierRole('ADMIN', 'CONSEILLER', 'GESTIONNAIRE'), async (req, res) => {
  try {
    const sousDomaines = await prisma.sousDomaine.findMany({
      where: { actif: true },
    });

    // Grouper par domaine parent
    const domainesMap = new Map<string, { nom: string; sousDomaines: typeof sousDomaines; count: number }>();
    
    sousDomaines.forEach((sd) => {
      const parent = sd.domaineParent || 'Sans catégorie';
      if (!domainesMap.has(parent)) {
        domainesMap.set(parent, { nom: parent, sousDomaines: [], count: 0 });
      }
      domainesMap.get(parent)!.sousDomaines.push(sd);
      domainesMap.get(parent)!.count++;
    });

    const domaines = Array.from(domainesMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([nom, data], index) => ({
        id: `dom-${index + 1}`,
        nom,
        sousDomainesCount: data.count,
        sousDomaines: data.sousDomaines,
        actif: true,
      }));

    res.json(domaines);
  } catch (error) {
    console.error('Erreur lors de la récupération des domaines:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/referentiel/domaines
 * Créer un nouveau domaine (catégorie parent)
 */
router.post('/domaines', verifierRole('ADMIN'), async (req, res) => {
  try {
    const { nom } = req.body;

    if (!nom) {
      return res.status(400).json({ message: 'Nom du domaine requis' });
    }

    // Vérifier si ce domaine existe déjà comme parent
    const existant = await prisma.sousDomaine.findFirst({
      where: { domaineParent: nom },
    });

    if (existant) {
      return res.status(409).json({ message: 'Ce domaine existe déjà' });
    }

    res.json({
      id: `dom-new-${Date.now()}`,
      nom,
      sousDomainesCount: 0,
      sousDomaines: [],
      actif: true,
      message: 'Domaine créé. Ajoutez des sous-domaines pour le compléter.',
    });
  } catch (error) {
    console.error('Erreur lors de la création du domaine:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ====== STATISTIQUES ======

/**
 * GET /api/referentiel/statistiques
 * Obtenir les statistiques globales du référentiel
 */
router.get('/statistiques', verifierRole('ADMIN', 'CONSEILLER', 'GESTIONNAIRE'), async (req, res) => {
  try {
    const [
      totalClients,
      totalSousDomaines,
      totalDivisions,
      pairesDistinctes,
      totalSpecialisations,
      totalDomaines,
      totalLangues,
    ] = await Promise.all([
      prisma.client.count({ where: { actif: true } }),
      prisma.sousDomaine.count({ where: { actif: true } }),
      prisma.division.count({ where: { actif: true } }),
      prisma.paireLinguistique.findMany({
        distinct: ['langueSource', 'langueCible'],
      }),
      // Utiliser les tables normalisées
      prisma.specialisation.count({ where: { actif: true } }),
      prisma.domaine.count({ where: { actif: true } }),
      prisma.langue.count({ where: { actif: true } }),
    ]);

    res.json({
      totalClients,
      totalDomaines,
      totalSousDomaines,
      totalSpecialisations,
      totalLangues,
      totalPaires: pairesDistinctes.length,
      totalDivisions,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
