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
