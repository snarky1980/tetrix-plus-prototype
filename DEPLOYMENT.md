# Déploiement Tetrix PLUS

## 1. Frontend (GitHub Pages)
Hébergement statique du dossier `frontend/dist`.

### Pré-requis
1. Activer GitHub Pages (Settings > Pages) sur la branche `gh-pages` ou via workflow.
2. Vérifier que le dépôt public ou privé avec Pages autorisé.

### Configuration Vite
`vite.config.ts` doit définir `base: '/tetrix-plus-prototype/'` (fait par Agent 4) pour paths corrects.

### Workflow GitHub Actions
Fichier: `.github/workflows/deploy-frontend.yml` (créé par Agent 4).
Déclenchement: push sur `main` + manuel (`workflow_dispatch`).
Pipeline:
1. Checkout
2. Setup Node
3. Install (`npm ci` dans `frontend`)
4. Build (`npm run build`)
5. Upload artifact Pages
6. Déploiement sur environnement `github-pages`

### Commandes locales (optionnel)
```bash
cd frontend
npm ci
npm run build
```
Pour tester locally: `npm run preview`.

## 2. Backend (API Express / Prisma)
Le backend ne peut être hébergé sur GitHub Pages. Choix cloud suggérés:
- Render.com (déploiement auto depuis Git)
- Railway.app
- Fly.io (region proche utilisateurs)
- Docker sur VM (Azure, AWS, OVH)

### Variables d'environnement
Créer fichier `.env` sur la plateforme:
```
DATABASE_URL=postgresql://USER:PASS@HOST:PORT/DB
JWT_SECRET=change_me_en_prod
NODE_ENV=production
PORT=3001
```

### Étapes de déploiement Docker (exemple)
`Dockerfile` minimal à ajouter si besoin:
```Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend .
RUN npx prisma generate && npm run build
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

### Migration & Seed
```bash
npx prisma migrate deploy
npx prisma seed   # si script seed présent
```

## 3. Stratégie de Versionnement
- Tag semantic versions: `v1.0.0`, `v1.1.0`, etc.
- Frontend: Incrément mineur pour nouvelles fonctionnalités UI.
- Backend: Patch pour corrections, minor pour endpoints nouveaux.

## 4. Surveillance & Logs (Post-déploiement)
- Intégrer `pino` + exporter vers un collecteur (Logtail, Datadog) si trafic.
- Metriques: temps réponse `/api/planning-global`, erreurs 4xx/5xx agrégées.

## 5. Sécurité
- Activer Dependabot.
- Ajouter rate limiting (ex: 100 requêtes / 15 min / IP pour auth & planning).
- Mettre à jour dépendances critiques (Prisma, Express) régulièrement.

## 6. Rollback
- Conserver dernière version stable taggée.
- Sur erreur critique, re-déployer tag précédent (`git checkout vX.Y.Z`, push ou redeclencher workflow avec ref).

## 7. URL Finale
Frontend: `https://<username>.github.io/tetrix-plus-prototype/`
Backend: `https://api.example.com` (config proxy dans Vite pour local/dev).

---
Document généré par Agent 4 (déploiement).