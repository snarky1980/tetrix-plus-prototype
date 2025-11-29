import prisma from '../config/database';

export interface CapaciteResult {
  capacite: number;
  heuresActuelles: number;
  disponible: number;
  depassement: boolean;
}

export async function verifierCapaciteJournaliere(
  traducteurId: string,
  date: Date,
  heuresSupplementaires: number,
  ignorerTacheId?: string
): Promise<CapaciteResult> {
  const traducteur = await prisma.traducteur.findUnique({ where: { id: traducteurId } });
  if (!traducteur) throw new Error('Traducteur introuvable');
  const ajustements = await prisma.ajustementTemps.findMany({
    where: {
      traducteurId,
      date: { equals: new Date(date.toISOString().split('T')[0]) },
      ...(ignorerTacheId ? { NOT: { tacheId: ignorerTacheId } } : {})
    }
  });
  const heuresActuelles = ajustements.reduce((s, a) => s + a.heures, 0);
  const capacite = traducteur.capaciteHeuresParJour;
  const disponible = capacite - heuresActuelles;
  const depassement = heuresActuelles + heuresSupplementaires > capacite + 1e-6;
  return { capacite, heuresActuelles, disponible, depassement };
}
