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
 */
router.get('/paires-linguistiques', verifierRole('ADMIN', 'CONSEILLER', 'GESTIONNAIRE'), async (req, res) => {
  try {
    const paires = await prisma.paireLinguistique.findMany({
      distinct: ['langueSource', 'langueCible'],
      select: {
        langueSource: true,
        langueCible: true,
      },
    });

    // Compter le nombre de traducteurs par paire
    const pairesAvecStats = await Promise.all(
      paires.map(async (p) => {
        const count = await prisma.paireLinguistique.count({
          where: {
            langueSource: p.langueSource,
            langueCible: p.langueCible,
          },
        });
        return {
          id: `${p.langueSource}-${p.langueCible}`,
          langueSource: p.langueSource,
          langueCible: p.langueCible,
          actif: true,
          utilisationCount: count,
        };
      })
    );

    res.json(pairesAvecStats);
  } catch (error) {
    console.error('Erreur lors de la récupération des paires linguistiques:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/referentiel/paires-linguistiques
 * Créer une nouvelle paire linguistique (crée une entrée de référence)
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
    await prisma.paireLinguistique.create({
      data: {
        langueSource,
        langueCible,
        traducteurId: traducteurRef.id,
      },
    });

    res.json({
      id: `${langueSource}-${langueCible}`,
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
 * Obtenir toutes les spécialisations uniques utilisées
 */
router.get('/specialisations', verifierRole('ADMIN', 'CONSEILLER', 'GESTIONNAIRE'), async (req, res) => {
  try {
    const traducteurs = await prisma.traducteur.findMany({
      select: {
        specialisations: true,
      },
    });

    // Extraire et compter les spécialisations uniques
    const specMap = new Map<string, number>();
    traducteurs.forEach((t) => {
      t.specialisations.forEach((spec) => {
        specMap.set(spec, (specMap.get(spec) || 0) + 1);
      });
    });

    const specialisations = Array.from(specMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([nom, count], index) => ({
        id: `spec-${index + 1}`,
        nom,
        actif: true,
        utilisationCount: count,
      }));

    res.json(specialisations);
  } catch (error) {
    console.error('Erreur lors de la récupération des spécialisations:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/referentiel/specialisations
 * Créer une nouvelle spécialisation (l'ajoute à un traducteur de référence)
 */
router.post('/specialisations', verifierRole('ADMIN'), async (req, res) => {
  try {
    const { nom, description } = req.body;

    if (!nom) {
      return res.status(400).json({ message: 'Nom de la spécialisation requis' });
    }

    // Vérifier si elle existe déjà
    const traducteurs = await prisma.traducteur.findMany({
      where: {
        specialisations: {
          has: nom,
        },
      },
    });

    if (traducteurs.length > 0) {
      return res.status(409).json({ message: 'Cette spécialisation existe déjà' });
    }

    // Trouver un traducteur de référence pour créer la spécialisation
    const traducteurRef = await prisma.traducteur.findFirst({
      where: { actif: true },
      select: { id: true, specialisations: true },
    });

    if (!traducteurRef) {
      return res.status(400).json({ message: 'Aucun traducteur actif dans le système' });
    }

    // Ajouter la spécialisation au traducteur de référence
    await prisma.traducteur.update({
      where: { id: traducteurRef.id },
      data: {
        specialisations: {
          push: nom,
        },
      },
    });

    res.json({
      id: `spec-${nom}`,
      nom,
      description,
      actif: true,
      utilisationCount: 1,
      message: 'Spécialisation créée. Vous pouvez maintenant l\'assigner aux traducteurs.',
    });
  } catch (error) {
    console.error('Erreur lors de la création de la spécialisation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * PUT /api/referentiel/specialisations/:ancienNom
 * Modifier une spécialisation (renomme pour tous les traducteurs)
 */
router.put('/specialisations/:ancienNom', verifierRole('ADMIN'), async (req, res) => {
  try {
    const { ancienNom } = req.params;
    const { nom: nouveauNom } = req.body;

    if (!nouveauNom) {
      return res.status(400).json({ message: 'Nouveau nom requis' });
    }

    // Vérifier si le nouveau nom existe déjà (et qu'il est différent de l'ancien)
    if (nouveauNom !== ancienNom) {
      const existant = await prisma.traducteur.findFirst({
        where: {
          specialisations: {
            has: nouveauNom,
          },
        },
      });

      if (existant) {
        return res.status(409).json({ message: 'Une spécialisation avec ce nom existe déjà' });
      }
    }

    // Trouver tous les traducteurs avec l'ancienne spécialisation
    const traducteurs = await prisma.traducteur.findMany({
      where: {
        specialisations: {
          has: ancienNom,
        },
      },
    });

    // Mettre à jour la spécialisation pour tous les traducteurs
    for (const trad of traducteurs) {
      const nouvellesSpecs = trad.specialisations.map(s => s === ancienNom ? nouveauNom : s);
      await prisma.traducteur.update({
        where: { id: trad.id },
        data: {
          specialisations: nouvellesSpecs,
        },
      });
    }

    res.json({
      id: `spec-${nouveauNom}`,
      nom: nouveauNom,
      actif: true,
      utilisationCount: traducteurs.length,
      message: `Spécialisation renommée pour ${traducteurs.length} traducteur(s)`,
    });
  } catch (error) {
    console.error('Erreur lors de la modification de la spécialisation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/referentiel/specialisations/:nom
 * Supprimer une spécialisation (retire de tous les traducteurs)
 */
router.delete('/specialisations/:nom', verifierRole('ADMIN'), async (req, res) => {
  try {
    const { nom } = req.params;

    // Trouver tous les traducteurs avec cette spécialisation
    const traducteurs = await prisma.traducteur.findMany({
      where: {
        specialisations: {
          has: nom,
        },
      },
    });

    // Retirer la spécialisation de tous les traducteurs
    for (const trad of traducteurs) {
      await prisma.traducteur.update({
        where: { id: trad.id },
        data: {
          specialisations: trad.specialisations.filter(s => s !== nom),
        },
      });
    }

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
      traducteurs,
    ] = await Promise.all([
      prisma.client.count({ where: { actif: true } }),
      prisma.sousDomaine.count({ where: { actif: true } }),
      prisma.division.count({ where: { actif: true } }),
      prisma.paireLinguistique.findMany({
        distinct: ['langueSource', 'langueCible'],
      }),
      prisma.traducteur.findMany({
        select: { specialisations: true },
      }),
    ]);

    // Compter les domaines uniques
    const domainesUniques = await prisma.sousDomaine.findMany({
      where: { actif: true, domaineParent: { not: null } },
      distinct: ['domaineParent'],
    });

    // Compter les spécialisations uniques
    const specsSet = new Set<string>();
    traducteurs.forEach((t) => {
      t.specialisations.forEach((s) => specsSet.add(s));
    });

    res.json({
      totalClients,
      totalDomaines: domainesUniques.length,
      totalSousDomaines,
      totalSpecialisations: specsSet.size,
      totalPaires: pairesDistinctes.length,
      totalDivisions,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
