// Force fresh import of generated Prisma client
import { PrismaClient } from '.prisma/client';

// Re-export types
export { TypeJourFerie } from '.prisma/client';
export type { JourFerie } from '.prisma/client';

// Instance unique de Prisma Client avec type explicite
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
}) as PrismaClient;

// Gestion de la déconnexion propre
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
