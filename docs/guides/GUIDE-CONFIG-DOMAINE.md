# Guide de Configuration du Domaine bt-tb.ca

## 🎯 Objectif
Déployer l'application Tetrix Plus sur votre domaine personnalisé **bt-tb.ca**

## 📐 Architecture
- **Frontend** : `bt-tb.ca` ou `www.bt-tb.ca` → GitHub Pages
- **Backend API** : `api.bt-tb.ca` → Render.com

---

## 🔧 Étape 1 : Configuration DNS chez GoDaddy

### A. Connexion à GoDaddy
1. Connectez-vous à [GoDaddy](https://www.godaddy.com)
2. Allez dans **Mes Produits** → **Domaines**
3. Cliquez sur **bt-tb.ca** → **Gérer DNS**

### B. Enregistrements DNS à ajouter

#### 🌐 Pour le Frontend (GitHub Pages)

**Option 1 : Domaine racine (bt-tb.ca)**
```
Type: A
Nom: @
Valeur: 185.199.108.153
TTL: 600 secondes
```
Ajoutez ces 3 autres enregistrements A :
```
185.199.109.153
185.199.110.153
185.199.111.153
```

**Option 2 : Sous-domaine www (www.bt-tb.ca)**
```
Type: CNAME
Nom: www
Valeur: snarky1980.github.io
TTL: 600 secondes
```

#### 🔌 Pour le Backend API (api.bt-tb.ca)

**1. Créer l'enregistrement CNAME**
```
Type: CNAME
Nom: api
Valeur: tetrix-plus-backend.onrender.com
TTL: 600 secondes
```

⚠️ **Note** : Remplacez `tetrix-plus-backend` par le nom exact de votre service Render

---

## 🔧 Étape 2 : Configuration GitHub Pages

### A. Ajouter le domaine personnalisé

1. Allez sur votre repo GitHub : [https://github.com/snarky1980/tetrix-plus-prototype](https://github.com/snarky1980/tetrix-plus-prototype)
2. **Settings** → **Pages**
3. Dans **Custom domain**, entrez : `bt-tb.ca` (ou `www.bt-tb.ca`)
4. Cliquez **Save**
5. ✅ Cochez **Enforce HTTPS** (après validation DNS)

### B. Créer le fichier CNAME

GitHub Pages a besoin d'un fichier `CNAME` dans le dossier de déploiement :

**Fichier : `frontend/public/CNAME`**
```
bt-tb.ca
```
(ou `www.bt-tb.ca` si vous préférez)

⚠️ Ce fichier sera automatiquement copié dans `dist/` lors du build.

---

## 🔧 Étape 3 : Configuration Render.com (Backend)

### A. Ajouter le domaine personnalisé

1. Connectez-vous à [Render.com](https://render.com)
2. Allez sur votre service **tetrix-plus-backend**
3. Onglet **Settings** → Section **Custom Domain**
4. Cliquez **Add Custom Domain**
5. Entrez : `api.bt-tb.ca`
6. Cliquez **Save**

Render vous donnera un enregistrement CNAME à vérifier (déjà configuré à l'étape 1B).

### B. Configuration HTTPS
Render active automatiquement un certificat SSL Let's Encrypt (gratuit) pour votre domaine personnalisé.

---

## 🔧 Étape 4 : Mise à jour des variables d'environnement

### A. Backend (Render.com)

Dans Render → Service → Environment :
```bash
FRONTEND_URL=https://bt-tb.ca
CORS_ORIGIN=https://bt-tb.ca
```

### B. Frontend (Vite config)

Mettre à jour `frontend/vite.config.ts` pour pointer vers votre API :

```typescript
export default defineConfig({
  // ... config existante
  server: {
    proxy: {
      '/api': {
        target: 'https://api.bt-tb.ca',  // ← Votre nouveau domaine
        changeOrigin: true,
      },
    },
  },
});
```

### C. Frontend (configuration API)

Mettre à jour `frontend/src/services/api.ts` ou équivalent :
```typescript
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://api.bt-tb.ca'  // ← Production
  : 'http://localhost:3001'; // ← Dev local
```

---

## ✅ Étape 5 : Vérification et Tests

### A. Vérifier la propagation DNS (peut prendre 24-48h)
```bash
# Vérifier enregistrement A (frontend)
dig bt-tb.ca +short
# Devrait retourner: 185.199.108.153 (et autres IPs GitHub)

# Vérifier CNAME API
dig api.bt-tb.ca +short
# Devrait retourner: tetrix-plus-backend.onrender.com

# Vérifier CNAME www (si utilisé)
dig www.bt-tb.ca +short
# Devrait retourner: snarky1980.github.io
```

### B. Tester les URLs
- Frontend : https://bt-tb.ca
- Backend API : https://api.bt-tb.ca/health (ou votre endpoint de santé)

---

## 🚀 Déploiement Final

### 1. Créer le fichier CNAME
```bash
echo "bt-tb.ca" > frontend/public/CNAME
```

### 2. Mettre à jour la configuration Vite
Modifier `frontend/vite.config.ts` :
```typescript
base: '/',  // ← Plus besoin du sous-chemin /tetrix-plus-prototype/
```

### 3. Commit et push
```bash
git add frontend/public/CNAME frontend/vite.config.ts frontend/src/services/api.ts
git commit -m "chore: Configure custom domain bt-tb.ca"
git push origin main
```

### 4. Déclencher le déploiement
Le workflow GitHub Actions va automatiquement déployer avec le nouveau fichier CNAME.

---

## 🔍 Résolution de problèmes

### DNS ne se propage pas
- Attendre 24-48h maximum
- Vérifier avec [DNS Checker](https://dnschecker.org/)
- Vider le cache DNS local : `ipconfig /flushdns` (Windows) ou `sudo dscacheutil -flushcache` (Mac)

### Erreur HTTPS sur GitHub Pages
- Attendre que DNS se propage complètement
- Désactiver puis réactiver "Enforce HTTPS" dans GitHub Settings

### CORS errors
- Vérifier que `FRONTEND_URL` dans Render pointe vers `https://bt-tb.ca`
- Vérifier la configuration CORS dans `backend/src/server.ts`

### 404 sur GitHub Pages
- Vérifier que le fichier `CNAME` est bien dans `frontend/public/`
- Vérifier que `base: '/'` dans `vite.config.ts`

---

## 📝 Checklist Finale

- [ ] Enregistrements DNS ajoutés dans GoDaddy
- [ ] Domaine personnalisé configuré dans GitHub Pages
- [ ] Fichier `CNAME` créé dans `frontend/public/`
- [ ] Domaine personnalisé ajouté dans Render.com
- [ ] Variables d'environnement mises à jour
- [ ] Configuration Vite mise à jour (`base: '/'`)
- [ ] API URL mise à jour dans le code frontend
- [ ] Code committé et pushé
- [ ] DNS propagé (test avec dig)
- [ ] HTTPS actif sur les deux domaines
- [ ] Application fonctionnelle sur bt-tb.ca

---

## 📚 Ressources

- [Documentation GitHub Pages Custom Domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [Documentation Render Custom Domains](https://render.com/docs/custom-domains)
- [GoDaddy DNS Management](https://www.godaddy.com/help/manage-dns-680)

---

**Date de création** : 12 décembre 2025
**Domaine** : bt-tb.ca
**Repository** : snarky1980/tetrix-plus-prototype
