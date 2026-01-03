/**
 * Contrôleur d'import batch pour traducteurs et tâches
 * Permet l'import en lot depuis CSV ou copier-coller
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface TraducteurImport {
  nom: string;
  email: string;
  division?: string;
  categorie?: string;
  capaciteHeuresParJour?: number;
  horaire?: string;
  domaines?: string;
}

interface TacheImport {
  numeroProjet: string;
  titre?: string;
  client?: string;
  traducteurNom?: string;
  heuresTotal: number;
  dateDebut?: string;
  dateEcheance: string;
  modeDistribution?: string;
  langueSource?: string;
  langueCible?: string;
}

/**
 * Parser CSV/TSV générique
 */
function parseCSV(data: string, delimiter: string = '\t'): Record<string, string>[] {
  const lines = data.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];
  
  // Première ligne = en-têtes
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
  
  const results: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || '';
    });
    results.push(row);
  }
  
  return results;
}

/**
 * Mapper les colonnes flexibles vers TraducteurImport
 */
function mapToTraducteur(row: Record<string, string>): TraducteurImport | null {
  // Chercher le nom (colonnes possibles: nom, name, traducteur, translator)
  const nom = row['nom'] || row['name'] || row['traducteur'] || row['translator'] || row['nom complet'];
  if (!nom) return null;
  
  // Chercher l'email
  const email = row['email'] || row['courriel'] || row['mail'] || row['e-mail'];
  
  // Générer email si manquant
  const emailFinal = email || generateEmail(nom);
  
  return {
    nom,
    email: emailFinal,
    division: row['division'] || row['équipe'] || row['equipe'] || row['team'],
    categorie: row['catégorie'] || row['categorie'] || row['category'] || row['classification'] || row['class'],
    capaciteHeuresParJour: parseFloat(row['capacité'] || row['capacite'] || row['heures'] || row['hours'] || '7') || 7,
    horaire: row['horaire'] || row['schedule'] || row['heures de travail'],
    domaines: row['domaines'] || row['domains'] || row['spécialités'] || row['specialites'],
  };
}

/**
 * Mapper les colonnes flexibles vers TacheImport
 */
function mapToTache(row: Record<string, string>): TacheImport | null {
  // Numéro de projet obligatoire
  const numeroProjet = row['numéro'] || row['numero'] || row['project'] || row['no'] || row['#'] || row['id'] || row['numéro de projet'];
  if (!numeroProjet) return null;
  
  // Heures obligatoires
  const heuresStr = row['heures'] || row['hours'] || row['h'] || row['durée'] || row['duree'];
  const heuresTotal = parseFloat(heuresStr) || 0;
  if (heuresTotal <= 0) return null;
  
  // Échéance obligatoire
  const dateEcheance = row['échéance'] || row['echeance'] || row['deadline'] || row['date limite'] || row['fin'];
  if (!dateEcheance) return null;
  
  return {
    numeroProjet,
    titre: row['titre'] || row['title'] || row['description'] || row['objet'],
    client: row['client'] || row['ministère'] || row['ministere'] || row['org'],
    traducteurNom: row['traducteur'] || row['translator'] || row['assigné'] || row['assigne'],
    heuresTotal,
    dateDebut: row['début'] || row['debut'] || row['start'] || row['date début'],
    dateEcheance,
    modeDistribution: row['mode'] || row['distribution'] || row['répartition'],
    langueSource: row['source'] || row['langue source'] || row['de'],
    langueCible: row['cible'] || row['langue cible'] || row['vers'] || row['à'],
  };
}

/**
 * Générer un email depuis un nom
 */
function generateEmail(nom: string): string {
  const parts = nom.split(',').map(p => p.trim());
  let email: string;
  
  if (parts.length === 2) {
    // Format "Nom, Prénom"
    const [familyName, givenName] = parts;
    email = `${givenName.toLowerCase()}.${familyName.toLowerCase()}@tetrix.com`;
  } else {
    // Format "Prénom Nom" ou autre
    email = nom.toLowerCase().replace(/\s+/g, '.') + '@tetrix.com';
  }
  
  return email
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever accents
    .replace(/[^a-z0-9.@-]/g, '') // Garder uniquement caractères valides
    .replace(/\.+/g, '.'); // Éviter doubles points
}

/**
 * POST /api/admin/import/preview-traducteurs
 * Prévisualiser l'import de traducteurs
 */
export const previewTraducteurs = async (req: Request, res: Response) => {
  try {
    const { data, delimiter = '\t' } = req.body;
    
    if (!data || typeof data !== 'string') {
      return res.status(400).json({ erreur: 'Données manquantes' });
    }
    
    const rows = parseCSV(data, delimiter);
    const traducteurs: (TraducteurImport & { valid: boolean; errors: string[] })[] = [];
    
    // Récupérer les emails existants
    const existingEmails = new Set(
      (await prisma.utilisateur.findMany({ select: { email: true } }))
        .map(u => u.email.toLowerCase())
    );
    
    // Récupérer les noms existants
    const existingNoms = new Set(
      (await prisma.traducteur.findMany({ select: { nom: true } }))
        .map(t => t.nom.toLowerCase())
    );
    
    for (const row of rows) {
      const tr = mapToTraducteur(row);
      if (!tr) {
        traducteurs.push({
          nom: row['nom'] || '(vide)',
          email: '',
          valid: false,
          errors: ['Nom manquant ou invalide']
        });
        continue;
      }
      
      const errors: string[] = [];
      
      // Vérifier doublon email
      if (existingEmails.has(tr.email.toLowerCase())) {
        errors.push(`Email "${tr.email}" existe déjà`);
      }
      
      // Vérifier doublon nom
      if (existingNoms.has(tr.nom.toLowerCase())) {
        errors.push(`Traducteur "${tr.nom}" existe déjà`);
      }
      
      traducteurs.push({
        ...tr,
        valid: errors.length === 0,
        errors
      });
    }
    
    res.json({
      total: traducteurs.length,
      valid: traducteurs.filter(t => t.valid).length,
      invalid: traducteurs.filter(t => !t.valid).length,
      traducteurs
    });
  } catch (error) {
    console.error('Erreur preview traducteurs:', error);
    res.status(500).json({ erreur: 'Erreur lors de la prévisualisation' });
  }
};

/**
 * POST /api/admin/import/traducteurs
 * Importer les traducteurs validés
 */
export const importTraducteurs = async (req: Request, res: Response) => {
  try {
    const { traducteurs } = req.body as { traducteurs: TraducteurImport[] };
    
    if (!traducteurs || !Array.isArray(traducteurs)) {
      return res.status(400).json({ erreur: 'Liste de traducteurs manquante' });
    }
    
    const defaultPassword = await bcrypt.hash('password123', 10);
    let created = 0;
    let errors: string[] = [];
    
    for (const tr of traducteurs) {
      try {
        // Créer l'utilisateur
        const utilisateur = await prisma.utilisateur.create({
          data: {
            email: tr.email,
            motDePasse: defaultPassword,
            role: 'TRADUCTEUR',
            actif: true
          }
        });
        
        // Mapper catégorie
        let categorie: 'TR01' | 'TR02' | 'TR03' = 'TR03';
        const cat = (tr.categorie || '').toUpperCase();
        if (cat.includes('01') || cat.includes('1')) categorie = 'TR01';
        else if (cat.includes('02') || cat.includes('2')) categorie = 'TR02';
        
        // Créer le traducteur
        await prisma.traducteur.create({
          data: {
            nom: tr.nom,
            divisions: tr.division ? [tr.division] : [],
            domaines: tr.domaines ? tr.domaines.split(',').map(d => d.trim()) : [],
            capaciteHeuresParJour: tr.capaciteHeuresParJour || 7,
            actif: true,
            categorie,
            classification: `TR-0${categorie.slice(-1)}`,
            horaire: tr.horaire || '9h-17h',
            utilisateurId: utilisateur.id
          }
        });
        
        created++;
      } catch (e: any) {
        errors.push(`${tr.nom}: ${e.message}`);
      }
    }
    
    res.json({
      success: true,
      created,
      errors,
      message: `${created} traducteur(s) créé(s) avec succès`
    });
  } catch (error) {
    console.error('Erreur import traducteurs:', error);
    res.status(500).json({ erreur: 'Erreur lors de l\'import' });
  }
};

/**
 * POST /api/admin/import/preview-taches
 * Prévisualiser l'import de tâches
 */
export const previewTaches = async (req: Request, res: Response) => {
  try {
    const { data, delimiter = '\t' } = req.body;
    
    if (!data || typeof data !== 'string') {
      return res.status(400).json({ erreur: 'Données manquantes' });
    }
    
    const rows = parseCSV(data, delimiter);
    const taches: (TacheImport & { valid: boolean; errors: string[]; traducteurId?: string })[] = [];
    
    // Récupérer les numéros de projet existants
    const existingNumeros = new Set(
      (await prisma.tache.findMany({ select: { numeroProjet: true } }))
        .map(t => t.numeroProjet.toLowerCase())
    );
    
    // Récupérer les traducteurs pour mapping
    const traducteurs = await prisma.traducteur.findMany({
      select: { id: true, nom: true }
    });
    const traducteursByNom = new Map(
      traducteurs.map(t => [t.nom.toLowerCase(), t.id])
    );
    
    // Récupérer les clients
    const clients = await prisma.client.findMany({
      select: { id: true, nom: true }
    });
    const clientsByNom = new Map(
      clients.map(c => [c.nom.toLowerCase(), c.id])
    );
    
    for (const row of rows) {
      const tache = mapToTache(row);
      if (!tache) {
        taches.push({
          numeroProjet: row['numéro'] || row['numero'] || '(vide)',
          heuresTotal: 0,
          dateEcheance: '',
          valid: false,
          errors: ['Données obligatoires manquantes (numéro, heures, échéance)']
        });
        continue;
      }
      
      const errors: string[] = [];
      let traducteurId: string | undefined;
      
      // Vérifier doublon numéro
      if (existingNumeros.has(tache.numeroProjet.toLowerCase())) {
        errors.push(`Numéro de projet "${tache.numeroProjet}" existe déjà`);
      }
      
      // Vérifier traducteur si spécifié
      if (tache.traducteurNom) {
        traducteurId = traducteursByNom.get(tache.traducteurNom.toLowerCase());
        if (!traducteurId) {
          // Chercher par correspondance partielle
          for (const [nom, id] of traducteursByNom) {
            if (nom.includes(tache.traducteurNom.toLowerCase()) || 
                tache.traducteurNom.toLowerCase().includes(nom)) {
              traducteurId = id;
              break;
            }
          }
          if (!traducteurId) {
            errors.push(`Traducteur "${tache.traducteurNom}" non trouvé`);
          }
        }
      } else {
        errors.push('Traducteur obligatoire');
      }
      
      // Valider la date
      const dateEcheance = parseDate(tache.dateEcheance);
      if (!dateEcheance) {
        errors.push(`Date d'échéance invalide: "${tache.dateEcheance}"`);
      }
      
      taches.push({
        ...tache,
        traducteurId,
        valid: errors.length === 0,
        errors
      });
    }
    
    res.json({
      total: taches.length,
      valid: taches.filter(t => t.valid).length,
      invalid: taches.filter(t => !t.valid).length,
      taches
    });
  } catch (error) {
    console.error('Erreur preview tâches:', error);
    res.status(500).json({ erreur: 'Erreur lors de la prévisualisation' });
  }
};

/**
 * POST /api/admin/import/taches
 * Importer les tâches validées
 */
export const importTaches = async (req: Request, res: Response) => {
  try {
    const { taches, utilisateurId } = req.body as { 
      taches: (TacheImport & { traducteurId?: string })[]; 
      utilisateurId: string;
    };
    
    if (!taches || !Array.isArray(taches)) {
      return res.status(400).json({ erreur: 'Liste de tâches manquante' });
    }
    
    let created = 0;
    let errors: string[] = [];
    
    // Récupérer le client par défaut ou le premier
    const clientDefaut = await prisma.client.findFirst();
    
    for (const tache of taches) {
      try {
        // Vérifier que le traducteur est défini
        if (!tache.traducteurId) {
          errors.push(`${tache.numeroProjet}: Traducteur obligatoire`);
          continue;
        }
        
        const dateEcheance = parseDate(tache.dateEcheance)!;
        
        // Mapper mode distribution
        let modeDistribution: 'JAT' | 'PEPS' | 'EQUILIBRE' | 'MANUEL' = 'JAT';
        const mode = (tache.modeDistribution || '').toUpperCase();
        if (mode.includes('PEPS') || mode.includes('FIFO')) modeDistribution = 'PEPS';
        else if (mode.includes('EQUI') || mode.includes('BALANCE')) modeDistribution = 'EQUILIBRE';
        else if (mode.includes('MAN')) modeDistribution = 'MANUEL';
        
        await prisma.tache.create({
          data: {
            numeroProjet: tache.numeroProjet,
            description: tache.titre || tache.numeroProjet,
            heuresTotal: tache.heuresTotal,
            dateEcheance,
            statut: 'PLANIFIEE',
            modeDistribution,
            traducteurId: tache.traducteurId,
            clientId: clientDefaut?.id || undefined,
            creePar: utilisateurId
          }
        });
        
        created++;
      } catch (e: any) {
        errors.push(`${tache.numeroProjet}: ${e.message}`);
      }
    }
    
    res.json({
      success: true,
      created,
      errors,
      message: `${created} tâche(s) créée(s) avec succès`
    });
  } catch (error) {
    console.error('Erreur import tâches:', error);
    res.status(500).json({ erreur: 'Erreur lors de l\'import' });
  }
};

/**
 * Parse une date flexible (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, etc.)
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Format ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T12:00:00');
  }
  
  // Format DD/MM/YYYY ou DD-MM-YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
  }
  
  // Format MM/DD/YYYY (US)
  const mdyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdyMatch) {
    // Déjà traité ci-dessus, on assume DD/MM/YYYY pour le Canada
  }
  
  // Tenter un parsing natif
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
}

/**
 * GET /api/admin/import/template/:type
 * Retourne un template CSV pour l'import
 */
export const getTemplate = async (req: Request, res: Response) => {
  const { type } = req.params;
  
  if (type === 'traducteurs') {
    const template = `nom\temail\tdivision\tcatégorie\tcapacité\thoraire\tdomaines
Dupont, Marie\tmarie.dupont@tetrix.com\tCISR\tTR-02\t7\t9h-17h\tIMM,TAG
Tremblay, Jean\tjean.tremblay@tetrix.com\tDroit 1\tTR-03\t7.5\t8h30-16h30\tDroit`;
    
    res.setHeader('Content-Type', 'text/tab-separated-values');
    res.setHeader('Content-Disposition', 'attachment; filename=template-traducteurs.tsv');
    return res.send(template);
  }
  
  if (type === 'taches') {
    const template = `numéro\ttitre\tclient\ttraducteur\theures\tdébut\téchéance\tmode\tsource\tcible
PROJ-001\tTraduction rapport\tCISR\tDupont, Marie\t10\t2026-01-06\t2026-01-15\tJAT\tEN\tFR
PROJ-002\tRévision contrat\tJustice\t\t5\t2026-01-07\t2026-01-10\tPEPS\tEN\tFR`;
    
    res.setHeader('Content-Type', 'text/tab-separated-values');
    res.setHeader('Content-Disposition', 'attachment; filename=template-taches.tsv');
    return res.send(template);
  }
  
  res.status(400).json({ erreur: 'Type invalide' });
};
