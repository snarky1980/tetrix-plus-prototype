# 🚀 GUIDE DE DÉPLOIEMENT - Corrections Date+Heure

**Date** : 18 décembre 2025  
**Version** : 2.2.0  
**Changements** : Suppression `heureEcheance` + Ajout plages horaires

---

## 📋 PRÉ-REQUIS

- [x] Rapport d'analyse lu et compris
- [x] Migration SQL créée
- [x] Tests de validation créés
- [x] Code backend adapté
- [ ] Backup de la base de données effectué
- [ ] Environnement de test validé

---

## 🎯 ÉTAPES DE DÉPLOIEMENT

### Phase 1 : Backup et Préparation

```bash
# 1. Backup de la base de données
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Vérifier état actuel des migrations
cd backend
npx prisma migrate status
```

---

### Phase 2 : Application de la Migration

#### Option A : Migration Automatique (Recommandé)

```bash
cd backend

# Appliquer la migration
npx prisma migrate deploy

# Vérifier que tout s'est bien passé
npx prisma migrate status
```

#### Option B : Migration Manuelle (Si option A échoue)

```bash
# Se connecter à la base de données
psql $DATABASE_URL

# Exécuter manuellement la migration
\i prisma/migrations/20251218_remove_heure_echeance_add_plages_horaires/migration.sql

# Vérifier les changements
\d taches
\d ajustements_temps

# Quitter
\q
```

---

### Phase 3 : Génération des Types

```bash
cd backend

# Régénérer les types Prisma avec les nouveaux champs
npx prisma generate

# Vérifier compilation TypeScript
npm run build
```

---

### Phase 4 : Activation du Code

#### Backend

Décommenter les lignes dans `tacheController.ts` :

```typescript
// Avant:
// TODO: Activer après application de la migration SQL
// heureDebut: ajust.heureDebut || null,
// heureFin: ajust.heureFin || null,

// Après:
heureDebut: ajust.heureDebut || null,  // ✅ ACTIVÉ
heureFin: ajust.heureFin || null,      // ✅ ACTIVÉ
```

#### Tests

Décommenter les assertions dans `validation-date-heure.test.ts` :

```typescript
// Avant:
// expect(ajustements[0].heureDebut).toBeDefined();

// Après:
expect(ajustements[0].heureDebut).toBeDefined();  // ✅ ACTIVÉ
```

---

### Phase 5 : Tests de Validation

```bash
cd backend

# Exécuter les tests de validation
npm test -- validation-date-heure.test.ts

# Si tous les tests passent ✅
# Sinon, rollback et investiguer
```

---

### Phase 6 : Déploiement Production

```bash
# 1. Commit des changements
git add .
git commit -m "feat: Remove heureEcheance, add plages horaires to AjustementTemps"

# 2. Push vers GitHub
git push origin main

# 3. Render détecte le push et redéploie automatiquement
# Surveiller les logs sur https://dashboard.render.com

# 4. Vérifier santé de l'application
curl https://your-backend-url.onrender.com/api/health
```

---

### Phase 7 : Mise à Jour Frontend (À Faire)

**Changements nécessaires:**

1. **Retirer champ `heureEcheance` du formulaire**
   ```typescript
   // frontend/src/components/CreateTaskForm.tsx
   // Supprimer:
   <input name="heureEcheance" type="time" />
   ```

2. **Utiliser datetime picker pour `dateEcheance`**
   ```typescript
   // Avant: <input type="date" />
   // Après: <input type="datetime-local" />
   ```

3. **Afficher plages horaires dans planification**
   ```typescript
   // Afficher "10h-14h (4h)" au lieu de juste "4h"
   ```

---

## ✅ CHECKLIST DE VALIDATION

### Après Migration SQL

- [ ] Colonne `heureEcheance` supprimée de `taches`
- [ ] Colonnes `heureDebut` et `heureFin` ajoutées à `ajustements_temps`
- [ ] Types Prisma régénérés
- [ ] Compilation TypeScript OK

### Après Activation du Code

- [ ] Création de tâche fonctionne
- [ ] Plages horaires sauvegardées en DB
- [ ] Tests de validation passent (5/5)

### En Production

- [ ] Backend démarre sans erreur
- [ ] Logs ne montrent pas d'erreurs SQL
- [ ] Création de tâche via UI fonctionne
- [ ] Ancienne données affichées correctement

---

## 🔙 PROCÉDURE DE ROLLBACK

### Si problème détecté APRÈS migration

```bash
cd backend

# Créer migration de rollback
npx prisma migrate dev --name rollback_plages_horaires --create-only

# Éditer le fichier de migration créé avec:
ALTER TABLE "ajustements_temps" DROP COLUMN IF EXISTS "heureDebut";
ALTER TABLE "ajustements_temps" DROP COLUMN IF EXISTS "heureFin";
ALTER TABLE "taches" ADD COLUMN IF NOT EXISTS "heureEcheance" TEXT DEFAULT '17:00';

# Appliquer
npx prisma migrate deploy

# Régénérer types
npx prisma generate

# Redéployer
git revert HEAD
git push origin main
```

### Si problème détecté AVANT commit

```bash
# Restaurer fichiers modifiés
git restore backend/src/controllers/tacheController.ts
git restore backend/prisma/schema.prisma

# Supprimer migration
rm -rf backend/prisma/migrations/20251218_remove_heure_echeance_add_plages_horaires/

# Régénérer types
cd backend && npx prisma generate
```

---

## 📊 MÉTRIQUES DE SUCCÈS

### Indicateurs Clés

1. **Aucune erreur SQL** dans les logs après déploiement
2. **100% des tests** de validation passent
3. **Temps de réponse** création de tâche inchangé (< 500ms)
4. **Taux d'erreur** UI reste à 0%

### Monitoring Post-Déploiement

```bash
# Surveiller logs backend
heroku logs --tail --app your-app

# Ou sur Render
# Dashboard → Services → votre-service → Logs

# Vérifier aucune erreur contenant:
# - "column heureEcheance does not exist"
# - "column heureDebut does not exist"
```

---

## 🆘 SUPPORT ET DÉPANNAGE

### Problème 1 : Migration échoue

**Erreur :** `column "heureEcheance" does not exist`

**Solution :** La colonne a déjà été supprimée. Modifier la migration :
```sql
-- Remplacer:
ALTER TABLE "taches" DROP COLUMN "heureEcheance";

-- Par:
ALTER TABLE "taches" DROP COLUMN IF EXISTS "heureEcheance";
```

---

### Problème 2 : Types Prisma pas à jour

**Erreur :** `Property 'heureDebut' does not exist`

**Solution :**
```bash
cd backend
rm -rf node_modules/.prisma
npx prisma generate
npm run build
```

---

### Problème 3 : Tests échouent

**Erreur :** Tests de validation rouges

**Actions :**
1. Vérifier que migration est appliquée : `\d ajustements_temps`
2. Vérifier types générés : `cat node_modules/.prisma/client/index.d.ts | grep heureDebut`
3. Vérifier code décommenté dans tacheController.ts
4. Examiner logs détaillés : `npm test -- validation-date-heure.test.ts --reporter=verbose`

---

## 📝 NOTES IMPORTANTES

### Données Existantes

- ✅ **Tâches existantes** : Aucune modification (dateEcheance préservé)
- ✅ **Ajustements existants** : heureDebut/heureFin = NULL (acceptable)
- ✅ **Nouveaux ajustements** : heureDebut/heureFin renseignés automatiquement

### Performance

- Migration très rapide (< 1 seconde)
- Aucun impact sur requêtes existantes
- Index non modifiés

### Compatibilité

- ✅ API : Inchangée (dateEcheance accepte toujours date OU datetime)
- ✅ UI : Compatible (heureEcheance jamais lu donc suppression transparente)
- ⚠️ Scripts externes : Vérifier si utilisent `heureEcheance`

---

## 🎉 FIN DU DÉPLOIEMENT

Si tous les tests passent et aucune erreur n'apparaît dans les logs :

✅ **Déploiement réussi !**

Prochaines étapes :
1. Mettre à jour documentation utilisateur
2. Former l'équipe sur nouvelle gestion des échéances
3. Surveiller métriques pendant 48h
4. Planifier Phase 2 (détection conflits intra-journée)

---

**Responsable déploiement** : _________________  
**Date effective** : _________________  
**Version déployée** : 2.2.0
