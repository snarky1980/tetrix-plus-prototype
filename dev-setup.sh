#!/bin/bash

# Script de démarrage de l'environnement de développement local
# Tetrix PLUS

echo "╔════════════════════════════════════════════╗"
echo "║   🚀 Tetrix PLUS - Environnement Local    ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Vérifier si les dépendances sont installées
if [ ! -d "backend/node_modules" ]; then
  echo "📦 Installation des dépendances backend..."
  cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "📦 Installation des dépendances frontend..."
  cd frontend && npm install && cd ..
fi

# Générer le client Prisma
echo "🔧 Génération du client Prisma..."
cd backend && npx prisma generate && cd ..

# Compiler le backend
echo "🔨 Compilation du backend..."
cd backend && npm run build && cd ..

echo ""
echo "✅ Environnement prêt !"
echo ""
echo "Pour démarrer les serveurs :"
echo "  Backend:  cd backend && npm run dev"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "URLs :"
echo "  Frontend: http://localhost:5173/tetrix-plus-prototype/"
echo "  Backend:  http://localhost:3001"
echo "  API:      http://localhost:3001/api"
echo ""
