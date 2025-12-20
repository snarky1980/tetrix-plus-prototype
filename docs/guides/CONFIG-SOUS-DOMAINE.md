# ✅ Configuration DNS pour tetrix-plus-prototype.bt-tb.ca

## 🎯 Configuration Simplifiée avec Sous-Domaine

Vous utilisez maintenant un **sous-domaine** au lieu du domaine racine. C'est plus simple !

---

## 📋 Configuration GoDaddy (5 minutes)

### Se connecter
1. Allez sur https://www.godaddy.com
2. **Mes Produits** → **Domaines** → **bt-tb.ca** → **Gérer DNS**

### Ajouter les enregistrements CNAME (2 enregistrements seulement !)

#### 🌐 Pour le Frontend
```
Type: CNAME
Nom: tetrix-plus-prototype
Valeur: snarky1980.github.io
TTL: 600 secondes
```

#### 🔌 Pour le Backend API
```
Type: CNAME
Nom: api.tetrix-plus-prototype
Valeur: tetrix-plus-backend.onrender.com
TTL: 600 secondes
```

⚠️ **Important** : Vérifiez le nom exact de votre service Render (remplacez `tetrix-plus-backend` si nécessaire)

---

## 📋 Configuration GitHub Pages (3 minutes)

1. Allez sur https://github.com/snarky1980/tetrix-plus-prototype/settings/pages
2. Dans **Custom domain**, entrez : `tetrix-plus-prototype.bt-tb.ca`
3. Cliquez **Save**
4. Attendez la validation DNS (quelques minutes)
5. Cochez **Enforce HTTPS**

---

## 📋 Configuration Render.com (3 minutes)

1. Allez sur https://dashboard.render.com
2. Sélectionnez **tetrix-plus-backend**
3. **Settings** → **Custom Domain** → **Add Custom Domain**
4. Entrez : `api.tetrix-plus-prototype.bt-tb.ca`
5. Cliquez **Save**

---

## 🔍 Vérification (après 30 min - 2h)

### Test DNS
```bash
dig tetrix-plus-prototype.bt-tb.ca +short
# Devrait retourner: snarky1980.github.io

dig api.tetrix-plus-prototype.bt-tb.ca +short
# Devrait retourner: tetrix-plus-backend.onrender.com
```

### Test URLs
- ✅ Frontend : https://tetrix-plus-prototype.bt-tb.ca
- ✅ Backend : https://api.tetrix-plus-prototype.bt-tb.ca/health

---

## 🎉 Avantages du Sous-Domaine

- ✅ **Plus simple** : Seulement 2 CNAME au lieu de 5 enregistrements
- ✅ **Plus flexible** : Vous gardez bt-tb.ca libre pour autre chose
- ✅ **Propagation DNS plus rapide** : CNAME se propage généralement plus vite
- ✅ **Plus clair** : Le nom indique clairement qu'il s'agit du prototype

---

## 🚀 Timeline

| Étape | Temps |
|-------|-------|
| Configuration GoDaddy | 5 min |
| Configuration GitHub Pages | 3 min |
| Configuration Render | 3 min |
| Propagation DNS | 30 min - 2h |

**Total : ~30 min - 2h** (beaucoup plus rapide qu'avec le domaine racine !)

---

_Date : 12 décembre 2025_
