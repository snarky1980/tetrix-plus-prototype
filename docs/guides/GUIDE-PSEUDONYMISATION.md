# 🔐 PSEUDONYMISATION DES TRADUCTEURS - GUIDE COMPLET

## 📋 Vue d'ensemble

Cette opération remplace les noms et emails de **114 traducteurs réels** par des **pseudonymes déterministes** générés phonétiquement.

### Objectif
- **Protéger la vie privée** des traducteurs
- **Maintenir l'intégrité fonctionnelle** du système
- **Garantir la réversibilité** via table de mapping sécurisée

---

## ✅ Résumé de la génération

| Métrique | Valeur |
|----------|--------|
| **Traducteurs totaux** | 115 |
| **Traducteurs pseudonymisés** | 114 |
| **Comptes génériques préservés** | 1 (Jean Exemple) |
| **Collisions détectées** | 0 |
| **Pseudonymes uniques** | 114 |

### Comptes génériques NON modifiés
- `admin@tetrix.com`
- `conseiller@tetrix.com`
- `gestionnaire@tetrix.com`
- `traducteur@tetrix.com` (Jean Exemple)

---

## 🔄 Méthode de génération

### Algorithme
```
hash = SHA256(traducteurId + realName + SECRET)
→ Extraction syllabes phonétiques françaises
→ Construction prénom + nom
→ Génération email correspondant
```

### Propriétés garanties
- ✅ **Déterministe**: Même entrée = même pseudonyme
- ✅ **Non-réversible**: Impossible de retrouver le nom réel
- ✅ **Humainement lisible**: Noms prononçables (Juline Foubon, Talie Roubec)
- ✅ **Unique**: Détection et résolution automatique des collisions

---

## 📝 Échantillon de pseudonymes

| Nom réel | Email réel | Pseudonyme | Email pseudonyme |
|----------|-----------|------------|------------------|
| Ahlgren, Anna | anna.ahlgren@tetrix.com | **Roubec, Talie** | talie.roubec@tetrix.com |
| Bissonnette, Julie-Marie | julie-marie.bissonnette@tetrix.com | **Garcon, Laua** | laua.garcon@tetrix.com |
| Baillargeon, Véronique | veronique.baillargeon@tetrix.com | **Pierbec, Vasa** | vasa.pierbec@tetrix.com |
| Bergeron, Julie | julie.bergeron@tetrix.com | **Boisron, Fasa** | fasa.boisron@tetrix.com |
| Armin-Pereda, Jennifer | jennifer.armin-pereda@tetrix.com | **Marmont, Soine** | soine.marmont@tetrix.com |

---

## 🛠️ Scripts créés

### 1. Générateur de pseudonymes
**Fichier**: `backend/src/utils/pseudonymGenerator.ts`

```typescript
generatePseudonym(traducteurId, realName) 
  → { displayName, email, firstName, lastName }
```

**Fonctionnalités**:
- Génération déterministe basée sur hash
- Détection de comptes génériques
- Résolution de collisions avec suffixes (A, B, C...)

### 2. Script de génération en masse
**Fichier**: `backend/scripts/generate-all-pseudonyms.ts`

**Usage**:
```bash
npx tsx scripts/generate-all-pseudonyms.ts
```

**Sortie**: 
- `backend/prisma/pseudonym-mapping.json` (114 entrées)

### 3. Script d'application
**Fichier**: `backend/scripts/apply-pseudonyms.ts`

**Usage**:
```bash
# Test sans modification
npx tsx scripts/apply-pseudonyms.ts --dry-run

# Application réelle (avec backup automatique)
npx tsx scripts/apply-pseudonyms.ts
```

**Actions**:
1. Backup automatique des données originales
2. Mise à jour de `traducteurs.nom`
3. Mise à jour de `utilisateurs.email`
4. Vérification d'intégrité

---

## 📦 Fichier de mapping

**Emplacement**: `backend/prisma/pseudonym-mapping.json`

**Structure**:
```json
[
  {
    "traducteurId": "b39d14a4-4398-45dd-8cda-da871918a097",
    "realName": "Ahlgren, Anna",
    "realEmail": "anna.ahlgren@tetrix.com",
    "pseudonymName": "Roubec, Talie",
    "pseudonymEmail": "talie.roubec@tetrix.com"
  },
  ...
]
```

**⚠️ SÉCURITÉ**: Ce fichier contient les noms réels. **NE PAS COMMITER** dans Git.

---

## 🚀 Procédure d'application

### Étape 1: Vérification pré-migration
```bash
# Tester en dry-run
cd backend
npx tsx scripts/apply-pseudonyms.ts --dry-run
```

### Étape 2: Backup manuel (recommandé)
```bash
# Export PostgreSQL complet
pg_dump $DATABASE_URL > backup-before-pseudonymization.sql
```

### Étape 3: Application
```bash
# Appliquer les pseudonymes (backup automatique inclus)
npx tsx scripts/apply-pseudonyms.ts
```

### Étape 4: Vérification post-migration
```bash
# Lister les traducteurs après migration
npx tsx scripts/list-real-translators.ts
```

**Résultat attendu**: 
- 114 pseudonymes visibles
- 1 compte générique (Jean Exemple)
- Aucun nom réel restant

---

## 🔍 Impacts sur le système

### Base de données
- ✅ **Table `traducteurs`**: Champ `nom` pseudonymisé
- ✅ **Table `utilisateurs`**: Champ `email` pseudonymisé
- ✅ **Contraintes**: Toutes les foreign keys préservées
- ✅ **Historique**: Tâches assignées restent liées au même `traducteurId`

### Frontend
- ⚠️ **À mettre à jour**: Affichage des noms de traducteurs
- ⚠️ **Filtres/recherche**: Devront utiliser les pseudonymes
- ⚠️ **Exports**: CSV/Excel devront afficher pseudonymes

### Backend API
- ⚠️ **Réponses JSON**: Retourneront automatiquement les pseudonymes
- ⚠️ **Logs**: Devront utiliser les pseudonymes
- ✅ **Authentification**: Email pseudonymisé fonctionnera normalement

---

## 🔐 Sécurité

### Données sensibles
| Fichier | Contenu | Action |
|---------|---------|--------|
| `pseudonym-mapping.json` | Noms réels + pseudonymes | **Ne pas commiter** |
| Backups (`backup-before-*.json`) | Données originales | **Ne pas commiter** |
| `.env` | `PSEUDONYM_SECRET` | **Déjà dans .gitignore** |

### Ajout au `.gitignore`
```bash
echo "backend/prisma/pseudonym-mapping.json" >> .gitignore
echo "backend/prisma/backup-*.json" >> .gitignore
```

---

## 🧪 Tests de validation

### Test 1: Déterminisme
```bash
cd backend
npx tsx src/utils/pseudonymGenerator.ts
```
**Vérification**: Le même ID génère toujours le même pseudonyme

### Test 2: Comptes génériques préservés
```bash
# Après migration
psql $DATABASE_URL -c "SELECT email FROM utilisateurs WHERE email IN ('admin@tetrix.com', 'conseiller@tetrix.com', 'gestionnaire@tetrix.com', 'traducteur@tetrix.com');"
```
**Attendu**: 4 résultats avec emails inchangés

### Test 3: Aucun nom réel restant
```bash
# Après migration
npx tsx scripts/list-real-translators.ts
```
**Attendu**: 114 pseudonymes, 0 nom réel (sauf Jean Exemple)

---

## 📊 Statistiques

### Avant pseudonymisation
- 115 traducteurs
- 114 avec noms réels
- 1 compte générique (Jean Exemple)

### Après pseudonymisation
- 115 traducteurs
- 114 avec pseudonymes
- 1 compte générique (Jean Exemple) - inchangé

---

## 🔄 Rollback

En cas de problème, restaurer depuis le backup :

```bash
# Restaurer depuis backup PostgreSQL
psql $DATABASE_URL < backup-before-pseudonymization.sql

# OU restaurer depuis backup JSON automatique
npx tsx scripts/restore-from-backup.ts backup-before-pseudonymization-[timestamp].json
```

---

## ✅ Checklist de déploiement

- [ ] Génération des pseudonymes effectuée (`generate-all-pseudonyms.ts`)
- [ ] Fichier `pseudonym-mapping.json` créé (114 entrées)
- [ ] Dry-run testé sans erreur
- [ ] Backup manuel PostgreSQL créé
- [ ] Migration appliquée (`apply-pseudonyms.ts`)
- [ ] Vérification post-migration (0 nom réel restant)
- [ ] Fichiers sensibles ajoutés à `.gitignore`
- [ ] Backend API testé avec pseudonymes
- [ ] Frontend mis à jour pour afficher pseudonymes
- [ ] Tests de login avec emails pseudonymisés
- [ ] Documentation mise à jour

---

## 📞 Support

**Script d'inventaire**:
```bash
npx tsx scripts/list-real-translators.ts
```

**Régénération des pseudonymes**:
```bash
npx tsx scripts/generate-all-pseudonyms.ts
```

**Test dry-run**:
```bash
npx tsx scripts/apply-pseudonyms.ts --dry-run
```

---

## 📅 Historique

- **2025-01-XX**: Génération initiale des pseudonymes (114 traducteurs)
- **2025-01-XX**: Aucune collision détectée
- **2025-01-XX**: Migration prête pour application

---

**✅ SYSTÈME PRÊT POUR LA PSEUDONYMISATION**
