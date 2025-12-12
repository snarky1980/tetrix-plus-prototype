# ✅ Checklist de Configuration du Domaine bt-tb.ca

## 🎯 Objectif
Déployer Tetrix Plus sur votre domaine personnalisé **bt-tb.ca**

---

## 📋 Étape 1 : Configuration GoDaddy (⏱️ 10 minutes)

### A. Se connecter à GoDaddy
- [ ] Aller sur https://www.godaddy.com
- [ ] Me connecter à mon compte
- [ ] Aller dans **Mes Produits** → **Domaines**
- [ ] Cliquer sur **bt-tb.ca** → **Gérer DNS**

### B. Ajouter les enregistrements DNS

#### 🌐 Pour le Frontend (bt-tb.ca)
- [ ] **Enregistrement A #1**
  - Type: `A`
  - Nom: `@`
  - Valeur: `185.199.108.153`
  - TTL: `600` secondes

- [ ] **Enregistrement A #2**
  - Type: `A`
  - Nom: `@`
  - Valeur: `185.199.109.153`
  - TTL: `600` secondes

- [ ] **Enregistrement A #3**
  - Type: `A`
  - Nom: `@`
  - Valeur: `185.199.110.153`
  - TTL: `600` secondes

- [ ] **Enregistrement A #4**
  - Type: `A`
  - Nom: `@`
  - Valeur: `185.199.111.153`
  - TTL: `600` secondes

#### 🔌 Pour le Backend API (api.bt-tb.ca)
- [ ] **Enregistrement CNAME API**
  - Type: `CNAME`
  - Nom: `api`
  - Valeur: `tetrix-plus-backend.onrender.com`
  - TTL: `600` secondes

⚠️ **Important** : Vérifiez le nom exact de votre service Render dans le dashboard

#### 🌍 (Optionnel) Pour www
- [ ] **Enregistrement CNAME WWW**
  - Type: `CNAME`
  - Nom: `www`
  - Valeur: `snarky1980.github.io`
  - TTL: `600` secondes

---

## 📋 Étape 2 : Configuration GitHub Pages (⏱️ 5 minutes)

- [ ] Aller sur https://github.com/snarky1980/tetrix-plus-prototype
- [ ] Cliquer sur **Settings** → **Pages**
- [ ] Dans **Custom domain**, entrer : `bt-tb.ca`
- [ ] Cliquer **Save**
- [ ] ⏳ Attendre la vérification DNS (peut prendre quelques minutes)
- [ ] ✅ Cocher **Enforce HTTPS** (après validation DNS réussie)

---

## 📋 Étape 3 : Configuration Render.com (⏱️ 5 minutes)

- [ ] Se connecter à https://render.com
- [ ] Aller sur le service **tetrix-plus-backend**
- [ ] Onglet **Settings** → Section **Custom Domain**
- [ ] Cliquer **Add Custom Domain**
- [ ] Entrer : `api.bt-tb.ca`
- [ ] Cliquer **Save**
- [ ] ⏳ Attendre la validation DNS et l'activation du certificat SSL (automatique)

### Variables d'environnement à vérifier
- [ ] Vérifier que `FRONTEND_URL` = `https://bt-tb.ca`
- [ ] Vérifier que `CORS_ORIGIN` = `https://bt-tb.ca`

---

## 📋 Étape 4 : Déploiement du Code (⏱️ 2 minutes)

### Fichiers déjà configurés ✅
- ✅ `frontend/public/CNAME` → `bt-tb.ca`
- ✅ `frontend/vite.config.ts` → `base: '/'`
- ✅ `frontend/src/services/api.ts` → API URL configurée
- ✅ `frontend/.env.production` → `VITE_API_URL=https://api.bt-tb.ca/api`
- ✅ `render.yaml` → `FRONTEND_URL` et `CORS_ORIGIN` mis à jour

### Commit et Push
```bash
cd /workspaces/tetrix-plus-prototype
git add .
git commit -m "chore: Configure custom domain bt-tb.ca"
git push origin main
```

- [ ] Exécuter les commandes ci-dessus
- [ ] ⏳ Attendre que GitHub Actions déploie le frontend (2-3 minutes)
- [ ] ⏳ Attendre que Render déploie le backend (3-5 minutes)

---

## 📋 Étape 5 : Vérification (⏱️ Après 30 min - 24h pour DNS)

### A. Vérifier la propagation DNS
```bash
# Frontend
dig bt-tb.ca +short
# Devrait retourner: 185.199.108.153 (et autres IPs)

# Backend API
dig api.bt-tb.ca +short
# Devrait retourner: tetrix-plus-backend.onrender.com
```

- [ ] DNS propagé pour `bt-tb.ca`
- [ ] DNS propagé pour `api.bt-tb.ca`

### B. Tester les URLs

#### Frontend
- [ ] Ouvrir https://bt-tb.ca dans le navigateur
- [ ] Vérifier que la page d'accueil charge correctement
- [ ] Vérifier qu'il n'y a pas d'erreurs dans la Console (F12)

#### Backend API
- [ ] Ouvrir https://api.bt-tb.ca/health dans le navigateur
- [ ] Devrait retourner : `{"status":"ok","timestamp":"..."}`

#### Connexion complète
- [ ] Sur https://bt-tb.ca, essayer de se connecter
- [ ] Vérifier que l'authentification fonctionne
- [ ] Vérifier qu'il n'y a pas d'erreurs CORS dans la Console

---

## 🔍 Résolution de Problèmes

### ❌ DNS ne se propage pas (après 2h)
- [ ] Vérifier les enregistrements DNS dans GoDaddy
- [ ] Utiliser https://dnschecker.org/ pour vérifier la propagation mondiale
- [ ] Attendre jusqu'à 24-48h maximum

### ❌ GitHub Pages ne valide pas le domaine
- [ ] Vérifier que les 4 enregistrements A sont bien configurés
- [ ] Vérifier que le fichier `CNAME` est dans `frontend/public/`
- [ ] Réessayer après 30 minutes (propagation DNS)

### ❌ Erreur HTTPS sur GitHub Pages
- [ ] Attendre la propagation DNS complète
- [ ] Dans GitHub Settings → Pages, décocher puis recocher "Enforce HTTPS"
- [ ] Attendre 5-10 minutes

### ❌ Render ne valide pas api.bt-tb.ca
- [ ] Vérifier l'enregistrement CNAME dans GoDaddy
- [ ] Vérifier que la valeur pointe vers le bon service Render
- [ ] Attendre la propagation DNS (30 min - 2h)

### ❌ Erreurs CORS
- [ ] Vérifier dans Render → Settings → Environment que `FRONTEND_URL=https://bt-tb.ca`
- [ ] Vérifier que `CORS_ORIGIN=https://bt-tb.ca`
- [ ] Redéployer le backend si nécessaire

### ❌ 404 sur toutes les pages (sauf accueil)
- [ ] Vérifier que `base: '/'` dans `frontend/vite.config.ts`
- [ ] Vérifier que le fichier `frontend/public/404.html` existe
- [ ] Redéployer le frontend

---

## 📊 Timeline Attendue

| Étape | Temps estimé | État |
|-------|--------------|------|
| Configuration GoDaddy | 10 min | ⏳ |
| Configuration GitHub Pages | 5 min | ⏳ |
| Configuration Render | 5 min | ⏳ |
| Commit & Push | 2 min | ⏳ |
| Déploiement GitHub Actions | 3 min | ⏳ |
| Déploiement Render | 5 min | ⏳ |
| Propagation DNS | 30 min - 24h | ⏳ |
| **TOTAL** | **30 min - 24h** | |

---

## ✅ Validation Finale

### Avant de considérer terminé :
- [ ] https://bt-tb.ca charge correctement
- [ ] https://api.bt-tb.ca/health retourne `{"status":"ok"}`
- [ ] Connexion fonctionnelle sur https://bt-tb.ca
- [ ] Pas d'erreurs CORS
- [ ] HTTPS actif (cadenas vert) sur les deux domaines
- [ ] Toutes les fonctionnalités de l'application fonctionnent

---

## 📞 Besoin d'aide ?

Si vous rencontrez des problèmes :
1. Consultez [GUIDE-CONFIG-DOMAINE.md](./GUIDE-CONFIG-DOMAINE.md) pour plus de détails
2. Vérifiez les logs dans :
   - GitHub Actions : https://github.com/snarky1980/tetrix-plus-prototype/actions
   - Render Dashboard : https://dashboard.render.com
3. Utilisez les outils de diagnostic :
   - DNS Checker : https://dnschecker.org/
   - SSL Checker : https://www.sslshopper.com/ssl-checker.html

---

**Bonne chance avec votre déploiement ! 🚀**

_Date de création : 12 décembre 2025_
