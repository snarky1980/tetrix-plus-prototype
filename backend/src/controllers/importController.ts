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

// Traducteurs EM (English and Multilingual) - 26 personnes
const emTranslators = [
  { nom: 'Armin-Pereda, Jennifer', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'SOC'], clients: ['Patrimoine'], sousDomaines: ['Littérature', 'Histoire'], specialisations: ['Protected C', 'Secret'] },
  { nom: 'Balkwill, Janna', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'EMP', 'CRIM SCorr.', 'CRIM Front.'], clients: ['EDSC', 'CISR/IRB'], sousDomaines: [], specialisations: [] },
  { nom: 'Ballard, Natalie', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG'], clients: ['SPAC'], sousDomaines: [], specialisations: [] },
  { nom: 'Brégent, Delphine', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'CRIM SCorr.', 'CRIM Front.'], clients: ['CBSA', 'CISR/IRB'], sousDomaines: [], specialisations: [] },
  { nom: 'Centomo-Bozzo, Olivia', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'ENV', 'AGRI', 'BIO', 'SCN', 'EMP'], clients: ['EDSC', 'FPC'], sousDomaines: [], specialisations: ['Secret'] },
  { nom: 'Desharats, Sebastian', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'DROIT'], clients: [], sousDomaines: [], specialisations: ['Protected C', 'Secret'] },
  { nom: 'Ducharme, Suzanne', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'EMP', 'SOC'], clients: ['EDSC', 'FPC'], sousDomaines: ['Littérature', 'Histoire'], specialisations: [] },
  { nom: 'Forster, Kate', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG', 'MIL TERRE', 'MIL AIR', 'SOC'], clients: [], sousDomaines: ['Littérature', 'Histoire'], specialisations: [] },
  { nom: 'Fung, Hillary', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'DROIT'], clients: [], sousDomaines: [], specialisations: [] },
  { nom: 'Gow, Francie', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'DROIT', 'SOC'], clients: [], sousDomaines: ['Littérature', 'Histoire'], specialisations: ['Secret'] },
  { nom: 'Grant, Gail', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'EMP', 'SOC'], clients: ['EDSC', 'FPC', 'Patrimoine'], sousDomaines: ['Littérature', 'Histoire'], specialisations: [] },
  { nom: 'Gueglietta, Daniela', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'DROIT'], clients: [], sousDomaines: [], specialisations: [] },
  { nom: 'Kadnikov, Patrick', classification: 'TR-01', division: 'Traduction anglaise 1', domaines: ['TAG'], clients: ['CLO', 'Patrimoine', 'SPAC'], sousDomaines: [], specialisations: [] },
  { nom: 'Kratz, Johanna', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG', 'DROIT'], clients: [], sousDomaines: [], specialisations: ['Secret'] },
  { nom: 'LaPalme, Hazel', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'MIL TERRE', 'MIL AIR'], clients: [], sousDomaines: [], specialisations: [] },
  { nom: 'lee, Pamela', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG', 'EMP', 'ENV', 'AGRI', 'BIO', 'SCN', 'MED', 'DROIT'], clients: ['EDSC', 'FPC'], sousDomaines: [], specialisations: [] },
  { nom: 'Mar, Vincent', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'ENV', 'AGRI', 'BIO', 'SCN'], clients: [], sousDomaines: [], specialisations: ['Protected C'] },
  { nom: 'Mercy, Madeleine', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'EMP'], clients: ['EDSC', 'FPC', 'Patrimoine'], sousDomaines: [], specialisations: [] },
  { nom: 'Oettel, Jason', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG', 'SOC'], clients: ['DFO'], sousDomaines: ['Littérature', 'Histoire'], specialisations: [] },
  { nom: 'Palles, Michael', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG', 'DROIT'], clients: [], sousDomaines: [], specialisations: ['Secret'] },
  { nom: 'Paul, Eloise', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'EMP', 'SOC'], clients: ['EDSC', 'FPC', 'CLO'], sousDomaines: ['Musique'], specialisations: [] },
  { nom: 'Tan, Elizabeth', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'CRIM SCorr.', 'CRIM Front.'], clients: ['CBSA', 'CISR/IRB'], sousDomaines: [], specialisations: ['Protected C'] },
  { nom: 'Vaughan, Nicholas', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG', 'MIL TERRE', 'MIL AIR'], clients: [], sousDomaines: [], specialisations: [] },
  { nom: 'McCarthy, Stephanie', classification: 'TR-02', division: 'Traduction anglaise 1', domaines: ['TAG', 'EMP'], clients: ['EDSC', 'FPC', 'CLO', 'Patrimoine'], sousDomaines: [], specialisations: [] },
  { nom: 'Feltes, Michael', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG'], clients: [], sousDomaines: [], specialisations: [] },
  { nom: 'Hill, Kara', classification: 'TR-03', division: 'Traduction anglaise 1', domaines: ['TAG'], clients: [], sousDomaines: [], specialisations: [] },
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
                create: [{ langueSource: 'FR', langueCible: 'EN' }],
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
          await prisma.paireLinguistique.create({
            data: {
              traducteurId: existingTrad.id,
              langueSource: 'FR',
              langueCible: 'EN',
            },
          });
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
