/**
 * Contrôleur d'import batch pour traducteurs et tâches
 * Permet l'import en lot depuis CSV ou copier-coller
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { parseOttawaDateISO, todayOttawa, formatOttawaISO } from '../utils/dateTimeOttawa';

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
  traducteurNom: string;
  numeroProjet: string;
  typeTache: string;
  dateEcheance: string;
  dateDebut: string;
  priorite: string;
  modeDistribution: string;
  langueSource?: string;
  langueCible?: string;
  compteMots?: number;
  client?: string;
  domaine?: string;
  sousDomaine?: string;
  specialisation?: string;
  titre?: string;
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
 * Ordre des colonnes: Traducteur*, Numéro*, Type de tâche*, Échéance*, Début Tâche*, Priorité*, Mode*, Source, Cible, Compte de mots, Domaine, Sous-domaine, Spécialisation, Titre ou description
 */
function mapToTache(row: Record<string, string>): TacheImport | null {
  // A: Traducteur obligatoire
  const traducteurNom = row['traducteur'] || row['translator'] || row['assigné'] || row['assigne'];
  if (!traducteurNom) return null;
  
  // B: Numéro de projet obligatoire
  const numeroProjet = row['numéro'] || row['numero'] || row['project'] || row['no'] || row['#'] || row['id'] || row['numéro de projet'];
  if (!numeroProjet) return null;
  
  // C: Type de tâche obligatoire
  const typeTache = row['type de tâche'] || row['type de tache'] || row['type'] || row['typetache'];
  if (!typeTache) return null;
  
  // D: Échéance obligatoire (Date et heure YYYY-MM-DD 00:00)
  const dateEcheance = row['échéance'] || row['echeance'] || row['échéance date et heure'] || row['deadline'] || row['date limite'] || row['fin'];
  if (!dateEcheance) return null;
  
  // E: Début tâche obligatoire (Date et heure YYYY-MM-DD 00:00)
  const dateDebut = row['début tâche'] || row['début tache'] || row['debut tâche'] || row['debut tache'] || row['début tâche date et heure'] || row['début'] || row['debut'] || row['start'] || row['date début'];
  if (!dateDebut) return null;
  
  // F: Priorité obligatoire
  const priorite = row['priorité'] || row['priorite'] || row['priority'];
  if (!priorite) return null;
  
  // G: Mode obligatoire
  const modeDistribution = row['mode'] || row['distribution'] || row['répartition'];
  if (!modeDistribution) return null;
  
  // H: Source (optionnel)
  const langueSource = row['source'] || row['langue source'] || row['de'];
  
  // I: Cible (optionnel)
  const langueCible = row['cible'] || row['langue cible'] || row['vers'] || row['à'];
  
  // J: Compte de mots (optionnel)
  const compteMotsStr = row['compte de mots'] || row['compteMots'] || row['compte_mots'] || row['mots'] || row['words'];
  const compteMots = compteMotsStr ? parseInt(compteMotsStr, 10) || undefined : undefined;
  
  // K: Client (optionnel)
  const client = row['client'] || row['ministère'] || row['ministere'] || row['org'];
  
  // L: Domaine (optionnel)
  const domaine = row['domaine'] || row['domain'];
  
  // M: Sous-domaine (optionnel)
  const sousDomaine = row['sous-domaine'] || row['sous domaine'] || row['sousdomaine'] || row['subdomain'];
  
  // N: Spécialisation (optionnel)
  const specialisation = row['spécialisation'] || row['specialisation'];
  
  // O: Titre ou description (optionnel)
  const titre = row['titre ou description'] || row['titre'] || row['title'] || row['description'] || row['objet'];

  return {
    traducteurNom,
    numeroProjet,
    typeTache: typeTache.toUpperCase(),
    dateEcheance,
    dateDebut,
    priorite: priorite.toUpperCase(),
    modeDistribution: modeDistribution.toUpperCase(),
    langueSource,
    langueCible,
    compteMots,
    client,
    domaine,
    sousDomaine,
    specialisation,
    titre,
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
    
    // Générer un mot de passe temporaire sécurisé (les utilisateurs devront le changer)
    const tempPassword = 'Tetrix2026!';
    const defaultPassword = await bcrypt.hash(tempPassword, 10);
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
          traducteurNom: row['traducteur'] || '(vide)',
          numeroProjet: row['numéro'] || row['numero'] || '(vide)',
          typeTache: '',
          dateEcheance: '',
          dateDebut: '',
          priorite: '',
          modeDistribution: '',
          valid: false,
          errors: ['Données obligatoires manquantes (traducteur, numéro, type, échéance, début, priorité, mode)']
        });
        continue;
      }
      
      const errors: string[] = [];
      let traducteurId: string | undefined;
      
      // Vérifier doublon numéro
      if (existingNumeros.has(tache.numeroProjet.toLowerCase())) {
        errors.push(`Numéro de projet "${tache.numeroProjet}" existe déjà`);
      }
      
      // Vérifier traducteur - toujours présent car obligatoire dans mapToTache
      traducteurId = traducteursByNom.get(tache.traducteurNom!.toLowerCase());
      if (!traducteurId) {
        // Chercher par correspondance partielle
        for (const [nom, id] of traducteursByNom) {
          if (nom.includes(tache.traducteurNom!.toLowerCase()) || 
              tache.traducteurNom!.toLowerCase().includes(nom)) {
            traducteurId = id;
            break;
          }
        }
        if (!traducteurId) {
          errors.push(`Traducteur "${tache.traducteurNom}" non trouvé`);
        }
      }
      
      // Valider la date d'échéance
      const dateEcheance = parseDate(tache.dateEcheance);
      if (!dateEcheance) {
        errors.push(`Date d'échéance invalide: "${tache.dateEcheance}"`);
      }
      
      // Valider la date de début
      const dateDebutParsed = parseDate(tache.dateDebut);
      if (!dateDebutParsed) {
        errors.push(`Date de début invalide: "${tache.dateDebut}"`);
      }
      
      // Valider le type de tâche (selon enum TypeTache Prisma)
      const typesValides = ['TRADUCTION', 'REVISION', 'RELECTURE', 'ENCADREMENT', 'AUTRE'];
      if (!typesValides.includes(tache.typeTache)) {
        errors.push(`Type de tâche invalide: "${tache.typeTache}". Valeurs acceptées: ${typesValides.join(', ')}`);
      }
      
      // Valider la priorité (seulement REGULIER ou URGENT)
      const prioritesValides = ['URGENT', 'REGULIER'];
      if (!prioritesValides.includes(tache.priorite)) {
        errors.push(`Priorité invalide: "${tache.priorite}". Valeurs acceptées: REGULIER, URGENT`);
      }
      
      // Valider le mode de distribution
      const modesValides = ['JAT', 'PEPS', 'EQUILIBRE', 'ÉQUILIBRÉ', 'MANUEL'];
      if (!modesValides.includes(tache.modeDistribution)) {
        errors.push(`Mode de distribution invalide: "${tache.modeDistribution}". Valeurs acceptées: JAT, PEPS, ÉQUILIBRÉ, MANUEL`);
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
    
    // Récupérer les sous-domaines pour mapping
    const sousDomaines = await prisma.sousDomaine.findMany({ 
      select: { id: true, nom: true }
    });
    const sousDomainesByNom = new Map(sousDomaines.map(sd => [sd.nom.toLowerCase(), sd.id]));
    
    // Récupérer les clients pour mapping
    const clients = await prisma.client.findMany({
      select: { id: true, nom: true }
    });
    const clientsByNom = new Map(clients.map(c => [c.nom.toLowerCase(), c.id]));
    
    // Récupérer les paires linguistiques avec leurs traducteurs
    const pairesLing = await prisma.paireLinguistique.findMany({
      select: { id: true, langueSource: true, langueCible: true, traducteurId: true }
    });
    
    for (const tache of taches) {
      try {
        // Vérifier que le traducteur est défini
        if (!tache.traducteurId) {
          errors.push(`${tache.numeroProjet}: Traducteur obligatoire`);
          continue;
        }
        
        const dateEcheance = parseDate(tache.dateEcheance)!;
        const dateDebut = parseDate(tache.dateDebut);
        
        // Mapper mode distribution
        let modeDistribution: 'JAT' | 'PEPS' | 'EQUILIBRE' | 'MANUEL' = 'JAT';
        const mode = (tache.modeDistribution || '').toUpperCase();
        if (mode.includes('PEPS') || mode.includes('FIFO')) modeDistribution = 'PEPS';
        else if (mode.includes('EQUI') || mode.includes('BALANCE')) modeDistribution = 'EQUILIBRE';
        else if (mode.includes('MAN')) modeDistribution = 'MANUEL';
        
        // Mapper type de tâche
        let typeTache: 'TRADUCTION' | 'REVISION' | 'RELECTURE' | 'ENCADREMENT' | 'AUTRE' = 'TRADUCTION';
        const typeStr = (tache.typeTache || '').toUpperCase();
        if (typeStr.includes('REVIS')) typeTache = 'REVISION';
        else if (typeStr.includes('RELECT')) typeTache = 'RELECTURE';
        else if (typeStr.includes('ENCAD')) typeTache = 'ENCADREMENT';
        else if (typeStr.includes('AUTRE')) typeTache = 'AUTRE';
        
        // Mapper priorité (seulement REGULIER ou URGENT)
        let priorite: 'URGENT' | 'REGULIER' = 'REGULIER';
        const prioStr = (tache.priorite || '').toUpperCase();
        if (prioStr.includes('URGENT')) priorite = 'URGENT';
        
        // Chercher le sous-domaine
        let sousDomaineId: string | undefined;
        if (tache.sousDomaine) {
          sousDomaineId = sousDomainesByNom.get(tache.sousDomaine.toLowerCase());
        }
        
        // Chercher le client par nom
        let clientId: string | undefined;
        if (tache.client) {
          clientId = clientsByNom.get(tache.client.toLowerCase());
        }
        
        // Chercher la paire linguistique du traducteur assigné
        let paireLinguistiqueId: string | undefined;
        if (tache.langueSource && tache.langueCible) {
          // IMPORTANT: Chercher uniquement parmi les paires du traducteur assigné
          const paire = pairesLing.find(p => 
            p.traducteurId === tache.traducteurId &&
            p.langueSource.toUpperCase() === tache.langueSource!.toUpperCase() &&
            p.langueCible.toUpperCase() === tache.langueCible!.toUpperCase()
          );
          if (paire) paireLinguistiqueId = paire.id;
        }
        
        await prisma.tache.create({
          data: {
            numeroProjet: tache.numeroProjet,
            description: tache.titre || tache.numeroProjet,
            specialisation: tache.specialisation,
            compteMots: tache.compteMots,
            heuresTotal: 0, // Sera calculé selon les ajustements
            dateEcheance,
            dateDebutEffective: dateDebut || undefined,
            priorite,
            statut: 'PLANIFIEE',
            typeTache,
            modeDistribution,
            traducteurId: tache.traducteurId,
            clientId,
            sousDomaineId,
            paireLinguistiqueId,
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
 * Utilise le timezone Ottawa conformément aux instructions du projet
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Format ISO (YYYY-MM-DD) - utiliser parseOttawaDateISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return parseOttawaDateISO(dateStr);
  }
  
  // Format DD/MM/YYYY ou DD-MM-YYYY (format canadien)
  const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return parseOttawaDateISO(isoDate);
  }
  
  // Tenter un parsing natif en dernier recours
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
    const template = `traducteur\tnuméro\ttype de tâche\téchéance\tdébut tâche\tpriorité\tmode\tsource\tcible\tcompte de mots\tclient\tdomaine\tsous-domaine\tspécialisation\ttitre ou description
Dupont, Marie\tPROJ-001\tTRADUCTION\t2026-01-15 00:00\t2026-01-06 00:00\tREGULIER\tJAT\tEN\tFR\t5000\tCISR\tJuridique\tContrats\t\tTraduction rapport annuel
Tremblay, Jean\tPROJ-002\tREVISION\t2026-01-10 00:00\t2026-01-07 00:00\tURGENT\tPEPS\tEN\tFR\t2000\tJustice\t\t\t\tRévision contrat`;
    
    res.setHeader('Content-Type', 'text/tab-separated-values');
    res.setHeader('Content-Disposition', 'attachment; filename=template-taches.tsv');
    return res.send(template);
  }
  
  res.status(400).json({ erreur: 'Type invalide' });
};
