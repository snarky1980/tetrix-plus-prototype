#!/bin/bash

# Script d'installation rapide pour Tetrix PLUS
# Agent 1 - Architecte

echo "╔════════════════════════════════════════════╗"
echo "║     🚀 Installation Tetrix PLUS           ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Installez Node.js 20+ d'abord."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js version $NODE_VERSION détectée. Recommandé: 20+"
fi

# Vérifier PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL n'est pas installé. Assurez-vous de l'installer."
fi

echo "✓ Node.js $(node -v) détecté"
echo ""

# Installation des dépendances
echo "📦 Installation des dépendances..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

echo "✓ Dépendances installées"
echo ""

# Vérifier .env backend
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Fichier backend/.env manquant"
    echo "📝 Création depuis .env.example..."
    cp backend/.env.example backend/.env
    echo ""
    echo "🔧 IMPORTANT: Éditez backend/.env et configurez:"
    echo "   - DATABASE_URL (votre PostgreSQL)"
    echo "   - JWT_SECRET (clé sécurisée unique)"
    echo ""
    read -p "Appuyez sur Entrée une fois backend/.env configuré..."
fi

# Vérifier .env frontend
if [ ! -f "frontend/.env" ]; then
    echo "📝 Création frontend/.env..."
    cp frontend/.env.example frontend/.env
fi

echo "✓ Fichiers .env configurés"
echo ""

# Générer Prisma Client
echo "🔨 Génération du client Prisma..."
cd backend
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la génération Prisma"
    exit 1
fi

echo "✓ Client Prisma généré"
echo ""

# Créer la base de données (optionnel)
read -p "Créer la base de données maintenant? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗄️  Exécution des migrations..."
    npx prisma migrate dev --name init
    
    if [ $? -eq 0 ]; then
        echo "✓ Base de données créée avec succès"
        echo ""
        echo "💡 Pour créer un utilisateur admin:"
        echo "   1. npx prisma studio (dans backend/)"
        echo "   2. Ou exécutez backend/prisma/seed-admin.sql"
    else
        echo "⚠️  Erreur migrations. Vérifiez DATABASE_URL dans backend/.env"
    fi
fi

cd ..

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║     ✅ Installation terminée!             ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "🚀 Pour démarrer le projet:"
echo "   npm run dev"
echo ""
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:5173"
echo ""
echo "📚 Consultez README.md pour plus d'infos"
echo ""
