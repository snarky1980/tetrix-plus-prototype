import { PrismaClient } from '@prisma/client';

// Instance unique de Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Gestion de la déconnexion propre
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
