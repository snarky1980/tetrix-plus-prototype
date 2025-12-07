import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { Role } from '@prisma/client';

const translators = [
  { nom: 'Ahlgren, Anna', classification: 'TR-02', horaire: '9h-17h' },
  { nom: 'Baillargeon, Véronique', classification: 'TR-03', horaire: '8h30-16h30', notes: 'P.I.' },
  { nom: 'Bayer, Annie', classification: 'TR-03', horaire: '8h-16h' },
  { nom: 'Bel Hassan, Meriem', classification: 'TR-02', horaire: '11h-19h' },
  { nom: 'Bergeron, Julie', classification: 'TR-02', horaire: '8h30-16h30' },
  { nom: 'Blouin, Anabel', classification: 'TR-02', horaire: '8h30-15h', capacite: 5.75 },
  { nom: 'Charette, Léanne', classification: 'TR-03', horaire: '7h-15h' },
  { nom: 'Couture, Sharon', classification: 'TR-02', horaire: '7h30-15h30', notes: 'congé le mercredi' },
  { nom: 'Deschênes, Valérie', classification: 'TR-03', horaire: '9h-15h' },
  { nom: 'Fennebresque, Claire', classification: 'TR-02', horaire: '8h-16h', notes: 'congé le vendredi' },
  { nom: 'Gagnon, Hugo', classification: 'TR-03', horaire: '9h-17h', notes: 'P.I.' },
  { nom: 'Julien-Fillion, Marie-Ève', classification: 'TR-03', horaire: '7h45-15h45' },
  { nom: 'Leblanc, Patrick', classification: 'TR-03', horaire: '8h30-16h30' },
  { nom: 'Lacasse, Mélanie', classification: 'TR-03', horaire: '8h30-16h30' },
  { nom: 'La Salle, Ginette', classification: 'TR-03', horaire: '7h45-15h45' },
  { nom: 'Legault, Michèle', classification: 'TR-02', horaire: '8h30-17h', notes: 'congé 1 ven sur 3' },
  { nom: 'Longchamps, Christine', classification: 'TR-02', horaire: '8h30-16h30', notes: 'congé le mercredi' },
  { nom: 'Maurice, Annie', classification: 'TR-03', horaire: '9h-17h', notes: 'congé le lundi' },
  { nom: 'Martin, Isabelle', classification: 'TR-02', horaire: '9h-17h' },
  { nom: 'Mean, Sun-Kiri', classification: 'TR-02', horaire: '9h-17h', notes: 'congé le vendredi' },
  { nom: 'Michaud, Marie-Ève', classification: 'TR-03', horaire: '7h30-15h30' },
  { nom: 'Michel, Natacha', classification: 'TR-03', horaire: '7h30-16h05', notes: 'congé 1 ven sur 3' },
  { nom: 'Milliard, Sophie', classification: 'TR-02', horaire: '8h30-16h30' },
  { nom: 'Ouellet, Diane', classification: 'TR-02', horaire: '8h-16h' },
  { nom: 'Pagé, Stéphanie', classification: 'TR-02', horaire: '8h45-16h45', notes: 'congé le mercredi' },
  { nom: 'Parent, Geneviève', classification: 'TR-03', horaire: '7h45-15h45' },
  { nom: 'Trudel, Josée', classification: 'TR-03', horaire: '8h30-15h30', capacite: 6 },
];

const stripAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const emailFromName = (nom: string) => {
  const parts = nom.split(',').map((s) => s.trim());
  const prenom = parts[1] || '';
  const nomFamille = parts[0] || '';
  const raw = `${prenom}.${nomFamille}`.toLowerCase();
  return stripAccents(raw).replace(/[^a-z0-9.]/g, '') + '@tetrix.com';
};

const droitTranslators = [
  // Droit 1
  { nom: 'Deslippes, Maxime', classification: 'TR-03', horaire: '8h45-19h45', division: 'Droit 1' },
  { nom: 'Laroche, Christian', classification: 'TR-03', horaire: '8h-16h50', notes: 'congé 1 lun sur 2', division: 'Droit 1' },
  { nom: 'Leclerc, Claude', classification: 'TR-03', horaire: '7h30-15h30', division: 'Droit 1' },
  { nom: 'Paquette, Lyne', classification: 'TR-02', horaire: '7h-15h', division: 'Droit 1' },
  { nom: 'Vincent, Jean-François', classification: 'TR-02', horaire: '8h30-16h30', division: 'Droit 1' },
  
  // Droit 2
  { nom: 'Beauchemin, Priscilla', classification: 'TR-02', horaire: '8h30-16h30', division: 'Droit 2' },
  { nom: 'Blais, Marie-France', classification: 'TR-02', horaire: '8h-16h', notes: 'détachée jusqu\'en nov.', division: 'Droit 2' },
  { nom: 'Bissonnette, Julie-Marie', classification: 'TR-03', horaire: '10h-18h', division: 'Droit 2' },
  { nom: 'Borduas, Mylène', classification: 'TR-02', horaire: '7h30-15h30', division: 'Droit 2' },
  { nom: 'Champagne, Stéphanie', classification: 'TR-02', horaire: '8h15-16h15', notes: 'marau ven', division: 'Droit 2' },
  { nom: 'De Angelis, Claudia', classification: 'TR-02', horaire: '8h30-16h30', division: 'Droit 2' },
  { nom: 'De Lorimier, Maya', classification: 'TR-03', horaire: '7h30-15h30', notes: 'congé lun', division: 'Droit 2' },
  { nom: 'Foucreault, Luna', classification: 'TR-02', horaire: '8h30-16h30', division: 'Droit 2' },
  { nom: 'Gelhoas, Mathilde', classification: 'TR-03', horaire: '8h30-16h30', division: 'Droit 2' },
  { nom: 'Humbert, Alexandra', classification: 'TR-02', horaire: '9h-17h', division: 'Droit 2' },
  { nom: 'Lampron, Jimmy', classification: 'TR-02', horaire: '8h-16h', division: 'Droit 2' },
  { nom: 'Mabuishi, Espérance', classification: 'TR-03', horaire: '8h30-16h30', notes: 'congé mer', division: 'Droit 2' },
  { nom: 'Mardirosian, Alexandros', classification: 'TR-03', horaire: '8h30-16h15', division: 'Droit 2' },
  { nom: 'Omer, Semra-Denise', classification: 'TR-03', horaire: '7h30-15h30', division: 'Droit 2' },
  { nom: 'Papadopetrakis, Mélanie', classification: 'TR-02', horaire: '8h30-16h30', division: 'Droit 2' },
  { nom: 'Tardif, Caroline', classification: 'TR-03', horaire: '8h-16h', division: 'Droit 2' },
  { nom: 'Tremblay, Geneviève', classification: 'TR-03', horaire: '8h15-16h15', division: 'Droit 2' },
];

export const importerCISR = async (req: Request, res: Response): Promise<void> => {
  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    const results = { success: 0, errors: [] as string[] };

    for (const t of translators) {
      const email = emailFromName(t.nom);
      const classification = t.classification;
      const capacite = t.capacite ?? 7;

      try {
        const utilisateur = await prisma.utilisateur.upsert({
          where: { email },
          update: {},
          create: {
            email,
            motDePasse: passwordHash,
            role: Role.TRADUCTEUR,
            actif: true,
          },
        });

        const domaines = ['TAG', 'IMM'];
        const clientsHabituels = ['CISR'];
        const specialisations = ['CISR'];

        const existingTrad = await prisma.traducteur.findUnique({
          where: { utilisateurId: utilisateur.id },
        });

        if (!existingTrad) {
          await prisma.traducteur.create({
            data: {
              nom: t.nom,
              division: 'CISR',
              classification,
              horaire: t.horaire || null,
              notes: t.notes || null,
              domaines,
              clientsHabituels,
              specialisations,
              capaciteHeuresParJour: capacite,
              actif: true,
              utilisateurId: utilisateur.id,
              pairesLinguistiques: {
                create: [{ langueSource: 'EN', langueCible: 'FR' }],
              },
            },
          });
        } else {
          await prisma.traducteur.update({
            where: { utilisateurId: utilisateur.id },
            data: {
              nom: t.nom,
              division: 'CISR',
              classification,
              horaire: t.horaire || null,
              notes: t.notes || null,
              domaines,
              clientsHabituels,
              specialisations,
              capaciteHeuresParJour: capacite,
              actif: true,
            },
          });

          await prisma.paireLinguistique.deleteMany({
            where: { traducteurId: existingTrad.id },
          });
          await prisma.paireLinguistique.create({
            data: {
              traducteurId: existingTrad.id,
              langueSource: 'EN',
              langueCible: 'FR',
            },
          });
        }

        results.success++;
      } catch (err: any) {
        results.errors.push(`${t.nom}: ${err.message}`);
      }
    }

    res.json({
      message: 'Import CISR terminé',
      total: translators.length,
      success: results.success,
      errors: results.errors,
    });
  } catch (error: any) {
    res.status(500).json({ erreur: error.message });
  }
};

export const importerDroit = async (req: Request, res: Response): Promise<void> => {
  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    const results = { success: 0, errors: [] as string[] };

    for (const t of droitTranslators) {
      const email = emailFromName(t.nom);
      const classification = t.classification;
      const capacite = 7;

      try {
        const utilisateur = await prisma.utilisateur.upsert({
          where: { email },
          update: {},
          create: {
            email,
            motDePasse: passwordHash,
            role: Role.TRADUCTEUR,
            actif: true,
          },
        });

        const domaines = ['Droit'];
        const clientsHabituels: string[] = [];
        const specialisations: string[] = [];

        const existingTrad = await prisma.traducteur.findUnique({
          where: { utilisateurId: utilisateur.id },
        });

        if (!existingTrad) {
          await prisma.traducteur.create({
            data: {
              nom: t.nom,
              division: t.division,
              classification,
              horaire: t.horaire || null,
              notes: t.notes || null,
              domaines,
              clientsHabituels,
              specialisations,
              capaciteHeuresParJour: capacite,
              actif: true,
              utilisateurId: utilisateur.id,
              pairesLinguistiques: {
                create: [{ langueSource: 'EN', langueCible: 'FR' }],
              },
            },
          });
        } else {
          await prisma.traducteur.update({
            where: { utilisateurId: utilisateur.id },
            data: {
              nom: t.nom,
              division: t.division,
              classification,
              horaire: t.horaire || null,
              notes: t.notes || null,
              domaines,
              clientsHabituels,
              specialisations,
              capaciteHeuresParJour: capacite,
              actif: true,
            },
          });

          await prisma.paireLinguistique.deleteMany({
            where: { traducteurId: existingTrad.id },
          });
          await prisma.paireLinguistique.create({
            data: {
              traducteurId: existingTrad.id,
              langueSource: 'EN',
              langueCible: 'FR',
            },
          });
        }

        results.success++;
      } catch (err: any) {
        results.errors.push(`${t.nom}: ${err.message}`);
      }
    }

    res.json({
      message: 'Import Droit terminé',
      total: droitTranslators.length,
      success: results.success,
      errors: results.errors,
    });
  } catch (error: any) {
    res.status(500).json({ erreur: error.message });
  }
};

// Traducteurs EM (English and Multilingual) - 26 personnes + 19 ETD2 + 21 EMTD
const emTranslators = [
  { nom: 'Armin-Pereda, Jennifer', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'SOC'], clients: ['Patrimoine'], sousDomaines: ['Littérature', 'Histoire'], specialisations: ['Protected C', 'Secret'], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Balkwill, Janna', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'EMP', 'CRIM SCorr.', 'CRIM Front.'], clients: ['EDSC', 'CISR/IRB'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Ballard, Natalie', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG'], clients: ['SPAC'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Brégent, Delphine', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'CRIM SCorr.', 'CRIM Front.'], clients: ['CBSA', 'CISR/IRB'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Centomo-Bozzo, Olivia', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'ENV', 'AGRI', 'BIO', 'SCN', 'EMP'], clients: ['EDSC', 'FPC'], sousDomaines: [], specialisations: ['Secret'], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Desharats, Sebastian', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'DROIT'], clients: [], sousDomaines: [], specialisations: ['Protected C', 'Secret'], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Ducharme, Suzanne', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'EMP', 'SOC'], clients: ['EDSC', 'FPC'], sousDomaines: ['Littérature', 'Histoire'], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Forster, Kate', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG', 'MIL TERRE', 'MIL AIR', 'SOC'], clients: [], sousDomaines: ['Littérature', 'Histoire'], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Fung, Hillary', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'DROIT'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Gow, Francie', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'DROIT', 'SOC'], clients: [], sousDomaines: ['Littérature', 'Histoire'], specialisations: ['Secret'], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Grant, Gail', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'EMP', 'SOC'], clients: ['EDSC', 'FPC', 'Patrimoine'], sousDomaines: ['Littérature', 'Histoire'], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Gueglietta, Daniela', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'DROIT'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Kadnikov, Patrick', classification: 'TR-01', division: 'Traduction anglaise 1', domaines: ['TAG'], clients: ['CLO', 'Patrimoine', 'SPAC'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Kratz, Johanna', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG', 'DROIT'], clients: [], sousDomaines: [], specialisations: ['Secret'], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'LaPalme, Hazel', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'MIL TERRE', 'MIL AIR'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'lee, Pamela', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG', 'EMP', 'ENV', 'AGRI', 'BIO', 'SCN', 'MED', 'DROIT'], clients: ['EDSC', 'FPC'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Mar, Vincent', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'ENV', 'AGRI', 'BIO', 'SCN'], clients: [], sousDomaines: [], specialisations: ['Protected C'], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Mercy, Madeleine', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'EMP'], clients: ['EDSC', 'FPC', 'Patrimoine'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Oettel, Jason', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG', 'SOC'], clients: ['DFO'], sousDomaines: ['Littérature', 'Histoire'], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Palles, Michael', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG', 'DROIT'], clients: [], sousDomaines: [], specialisations: ['Secret'], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Paul, Eloise', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'EMP', 'SOC'], clients: ['EDSC', 'FPC', 'CLO'], sousDomaines: ['Musique'], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Tan, Elizabeth', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'CRIM SCorr.', 'CRIM Front.'], clients: ['CBSA', 'CISR/IRB'], sousDomaines: [], specialisations: ['Protected C'], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Vaughan, Nicholas', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG', 'MIL TERRE', 'MIL AIR'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'McCarthy, Stephanie', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'EMP'], clients: ['EDSC', 'FPC', 'CLO', 'Patrimoine'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Feltes, Michael', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Hill, Kara', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  
  // Traduction anglaise 2 (ETD2) - 19 traducteurs
  { nom: 'Baldakin, Jennifer', classification: 'TR-02', division: 'Traduction anglaise 2', domaines: ['TAG', 'AUT', 'CRIM SCorr.', 'CRIM Front.'], clients: ['CIRNAC', 'CBSA', 'CISR/IRB', 'PMO'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Cavanaugh, Mavis', classification: 'TR-03', division: 'Traduction anglaise 2', domaines: ['TAG', 'IMM'], clients: ['PMO', 'CISR/IRB'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Cerutti, Carol', classification: 'TR-02', division: 'Traduction anglaise 2', domaines: ['TAG', 'SOC'], clients: ['GAC'], sousDomaines: [], specialisations: ['Protected C', 'Secret'], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Cox, Trevor', classification: 'TR-03', division: 'Traduction anglaise 2', domaines: ['TAG', 'CRIM SCorr.', 'CRIM Front.', 'MIL TERRE', 'MIL AIR'], clients: ['CBSA', 'CISR/IRB'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Dalrymple, Sarah', classification: 'TR-03', division: 'Traduction anglaise 2', domaines: ['TAG', 'SOC', 'AUT'], clients: ['Patrimoine', 'VAC', 'CIRNAC'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Fraser, Jennifer', classification: 'TR-03', division: 'Traduction anglaise 2', domaines: ['TAG', 'CRIM SCorr.', 'CRIM Front.', 'SOC'], clients: ['CBSA', 'CISR/IRB', 'VAC'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Fritz, Monica', classification: 'TR-03', division: 'Traduction anglaise 2', domaines: ['TAG', 'IMM'], clients: ['CISR/IRB'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Harries, Emma', classification: 'TR-02', division: 'Traduction anglaise 2', domaines: ['TAG', 'IMM', 'ENV', 'AGRI', 'BIO', 'SCN'], clients: ['CISR/IRB'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Hentel, Magda', classification: 'TR-03', division: 'Traduction anglaise 2', domaines: ['TAG', 'IMM'], clients: ['CISR/IRB', 'Patrimoine'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Isailovic, Renata', classification: 'TR-03', division: 'Traduction anglaise 2', domaines: ['TAG', 'IMM'], clients: ['CISR/IRB'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Lavigne, Benoit', classification: 'TR-03', division: 'Traduction anglaise 2', domaines: ['TAG', 'SOC'], clients: ['GAC'], sousDomaines: ['Editing'], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Manktelow, Jennifer', classification: 'TR-03', division: 'Traduction anglaise 2', domaines: ['TAG', 'IMM', 'MIL TERRE', 'MIL AIR'], clients: ['CISR/IRB'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'McGivern, Vanessa', classification: 'TR-02', division: 'Traduction anglaise 2', domaines: ['TAG', 'IMM'], clients: ['CISR/IRB'], sousDomaines: [], specialisations: ['Secret'], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Perles, Michelle', classification: 'TR-03', division: 'Traduction anglaise 2', domaines: ['TAG', 'SOC'], clients: ['GAC', 'PMO'], sousDomaines: [], specialisations: ['Secret'], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Ruddock, Amber', classification: 'TR-02', division: 'Traduction anglaise 2', domaines: ['TAG', 'AUT', 'EMP'], clients: ['CIRNAC', 'EDSC', 'FPC', 'Patrimoine'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Turpin, Laurie', classification: 'TR-02', division: 'Traduction anglaise 2', domaines: ['TAG', 'AUT', 'EMP'], clients: ['CIRNAC', 'EDSC', 'FPC', 'Patrimoine'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Winfield, Stefan', classification: 'TR-02', division: 'Traduction anglaise 2', domaines: ['TAG', 'CRIM SCorr.', 'IMM'], clients: ['CISR/IRB'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Winslow, Kimberley', classification: 'TR-02', division: 'Traduction anglaise 2', domaines: ['TAG', 'CRIM SCorr.', 'CRIM Front.'], clients: ['CBSA', 'CISR/IRB'], sousDomaines: [], specialisations: ['Secret'], paires: [{source: 'FR', cible: 'EN'}] },
  
  // Multilingue (EMTD) - 21 traducteurs
  { nom: 'Duquette, Evan', classification: 'TR-02', division: 'Multilingue', domaines: ['TAG', 'TECH', 'TRA', 'MIL TERRE', 'MIL AIR'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Echeverri, Sergio', classification: 'TR-02', division: 'Multilingue', domaines: ['TAG', 'TECH', 'TRA', 'IMM'], clients: ['CISR/IRB'], sousDomaines: [], specialisations: [], paires: [{source: 'ES', cible: 'EN'}, {source: 'PT', cible: 'EN'}] },
  { nom: 'Eland, Andrea', classification: 'TR-02', division: 'Multilingue', domaines: ['TAG', 'TECH', 'TRA', 'CRIM SCorr.', 'MIL TERRE', 'MIL AIR'], clients: ['CISR/IRB'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Hosek Lee, Jane', classification: 'TR-03', division: 'Multilingue', domaines: ['TAG', 'TECH', 'TRA', 'CRIM SCorr.', 'MIL TERRE', 'MIL AIR'], clients: ['CISR/IRB'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Klamph, Efraim Iederman', classification: 'TR-02', division: 'Multilingue', domaines: ['TAG'], clients: ['Patrimoine', 'DFO'], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Leighton, Heather', classification: 'TR-03', division: 'Multilingue', domaines: ['TAG'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'ES', cible: 'EN'}, {source: 'PT', cible: 'EN'}, {source: 'FR', cible: 'EN'}] },
  { nom: 'Li, Baoyu', classification: 'TR-03', division: 'Multilingue', domaines: ['TAG'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'ZH', cible: 'EN'}] },
  { nom: 'Mann, Elizabeth', classification: 'TR-03', division: 'Multilingue', domaines: ['TAG'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'ES', cible: 'EN'}, {source: 'PT', cible: 'EN'}, {source: 'IT', cible: 'EN'}] },
  { nom: 'McFarlane, Elizabeth', classification: 'TR-03', division: 'Multilingue', domaines: ['TAG', 'ENV', 'AGRI', 'BIO', 'SCN'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Mirarabshahi, Seyedsina', classification: 'TR-01', division: 'Multilingue', domaines: ['TAG'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'FA', cible: 'EN'}, {source: 'EN', cible: 'FA'}] },
  { nom: 'Mullin, Maryann', classification: 'TR-02', division: 'Multilingue', domaines: ['TAG', 'MED'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Oostveen, Karen A', classification: 'TR-03', division: 'Multilingue', domaines: ['TAG', 'TECH', 'TRA'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Pang, Wingshun', classification: 'TR-02', division: 'Multilingue', domaines: ['TAG', 'ENV', 'AGRI', 'BIO', 'SCN'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Rabussier, Juliette', classification: 'TR-02', division: 'Multilingue', domaines: ['TAG', 'MED'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'ES', cible: 'FR'}, {source: 'PT', cible: 'FR'}, {source: 'IT', cible: 'FR'}] },
  { nom: 'Rathjen, Claudia', classification: 'TR-02', division: 'Multilingue', domaines: ['TAG', 'MED'], clients: [], sousDomaines: [], specialisations: ['Secret', 'Protected C'], paires: [{source: 'FR', cible: 'EN'}] },
  { nom: 'Rubio, Zoubair', classification: 'TR-03', division: 'Multilingue', domaines: ['TAG'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'AR', cible: 'EN'}, {source: 'AR', cible: 'FR'}, {source: 'EN', cible: 'AR'}, {source: 'FR', cible: 'AR'}] },
  { nom: 'Schultz, Barbara', classification: 'TR-03', division: 'Multilingue', domaines: ['TAG'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'DE', cible: 'EN'}, {source: 'NL', cible: 'EN'}] },
  { nom: 'Tsuruta, Sayuri', classification: 'TR-03', division: 'Multilingue', domaines: ['TAG'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'JA', cible: 'EN'}, {source: 'EN', cible: 'JA'}] },
  { nom: 'Urdininea, Frances', classification: 'TR-03', division: 'Multilingue', domaines: ['TAG'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'EN', cible: 'ES'}, {source: 'FR', cible: 'ES'}] },
  { nom: 'Vega Iraneta, Beatriz De', classification: 'TR-03', division: 'Multilingue', domaines: ['TAG'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'EN', cible: 'ES'}, {source: 'FR', cible: 'ES'}] },
  { nom: 'Whimster, Peter', classification: 'TR-03', division: 'Multilingue', domaines: ['TAG'], clients: [], sousDomaines: [], specialisations: [], paires: [{source: 'JA', cible: 'EN'}, {source: 'ZH', cible: 'EN'}] },
];

export const importerEM = async (req: Request, res: Response): Promise<void> => {
  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    const results = { success: 0, errors: [] as string[] };

    for (const t of emTranslators) {
      const email = emailFromName(t.nom);
      const classification = t.classification;
      const capacite = 7;

      try {
        const utilisateur = await prisma.utilisateur.upsert({
          where: { email },
          update: {},
          create: {
            email,
            motDePasse: passwordHash,
            role: Role.TRADUCTEUR,
            actif: true,
          },
        });

        const existingTrad = await prisma.traducteur.findUnique({
          where: { utilisateurId: utilisateur.id },
        });

        if (!existingTrad) {
          await prisma.traducteur.create({
            data: {
              nom: t.nom,
              division: t.division,
              classification,
              horaire: '',
              notes: null,
              domaines: t.domaines,
              clientsHabituels: t.clients,
              specialisations: [...t.specialisations, ...t.sousDomaines],
              capaciteHeuresParJour: capacite,
              actif: true,
              utilisateurId: utilisateur.id,
              pairesLinguistiques: {
                create: t.paires.map(p => ({ langueSource: p.source, langueCible: p.cible })),
              },
            },
          });
        } else {
          await prisma.traducteur.update({
            where: { utilisateurId: utilisateur.id },
            data: {
              nom: t.nom,
              division: t.division,
              classification,
              horaire: '',
              notes: null,
              domaines: t.domaines,
              clientsHabituels: t.clients,
              specialisations: [...t.specialisations, ...t.sousDomaines],
              capaciteHeuresParJour: capacite,
              actif: true,
            },
          });

          await prisma.paireLinguistique.deleteMany({
            where: { traducteurId: existingTrad.id },
          });
          for (const p of t.paires) {
            await prisma.paireLinguistique.create({
              data: {
                traducteurId: existingTrad.id,
                langueSource: p.source,
                langueCible: p.cible,
              },
            });
          }
        }

        results.success++;
      } catch (err: any) {
        results.errors.push(`${t.nom}: ${err.message}`);
      }
    }

    res.json({
      message: 'Import EM terminé',
      total: emTranslators.length,
      success: results.success,
      errors: results.errors,
    });
  } catch (error: any) {
    res.status(500).json({ erreur: error.message });
  }
};
