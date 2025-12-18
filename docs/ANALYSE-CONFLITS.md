# Analyse des Types de Conflits - Tetrix PLUS

## Vue d'Ensemble

Cette analyse identifie **10 types de conflits** possibles dans le système de gestion de tâches, leur niveau de risque, et les solutions recommandées.

---

## 1. ✅ Double Booking (Création Simultanée)

**Status** : **PROTÉGÉ** ✅

**Scénario** :
- Conseiller A et B créent des tâches pour le traducteur X au même moment
- Traducteur X a 7h de capacité, 5h utilisées
- Les deux tentent d'assigner 3h

**Impact** : Surcharge (11h/7h = 157%)

**Protection Actuelle** :
```typescript
// Dans tacheController.ts - creerTache()
await prisma.$transaction(async (tx) => {
  // Lecture atomique des ajustements existants
  const ajustementsExistants = await tx.ajustementTemps.findMany({...});
  
  // Validation de capacité
  if (heures > disponible) {
    throw new Error('Conflit de capacité détecté');
  }
  
  // Création seulement si validé
  await tx.tache.create({...});
});
```

**Niveau de Risque** : 🔴 CRITIQUE → ✅ **RÉSOLU**

---

## 2. ⚠️ Modification Concurrente de Tâche

**Status** : **NON PROTÉGÉ** ⚠️

**Scénario** :
```
T0: User A et B ouvrent la tâche #123 (heuresTotal: 5h)
T1: User A modifie → heuresTotal: 7h, sauvegarde
T2: User B modifie → description: "Urgent", sauvegarde
Résultat: La modification de A (7h) est perdue!
```

**Impact** : 
- Perte de données silencieuse
- Incohérence entre répartition et heures totales
- Frustration utilisateur

**Solution Recommandée** : **Optimistic Locking**

### Migration Prisma :
```prisma
model Tache {
  // ... champs existants
  version    Int      @default(0)  // ← Nouveau champ
}
```

### Code :
```typescript
export const mettreAJourTache = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { version, ...data } = req.body;
  
  const tache = await prisma.tache.update({
    where: { 
      id,
      version // ← Vérification atomique
    },
    data: {
      ...data,
      version: { increment: 1 }
    }
  });
  
  if (!tache) {
    return res.status(409).json({ 
      erreur: 'Conflit: cette tâche a été modifiée par un autre utilisateur',
      code: 'VERSION_CONFLICT'
    });
  }
  
  res.json(tache);
};
```

**Niveau de Risque** : 🟠 ÉLEVÉ (Très probable en production)

**Priorité** : **P1 - Critique**

---

## 3. ⚠️ Suppression Pendant Modification

**Status** : **NON PROTÉGÉ** ⚠️

**Scénario** :
```
T0: User A ouvre tâche #456 pour modification
T1: User B supprime tâche #456
T2: User A clique "Sauvegarder"
Résultat: Erreur 404 ou création involontaire
```

**Impact** :
- Perte de travail utilisateur
- Message d'erreur cryptique

**Solution** :
```typescript
export const mettreAJourTache = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  // Vérifier existence au début de la transaction
  const existe = await prisma.tache.findUnique({ 
    where: { id },
    select: { id: true } 
  });
  
  if (!existe) {
    return res.status(410).json({ 
      erreur: 'Cette tâche a été supprimée',
      code: 'DELETED_ENTITY'
    });
  }
  
  // Reste de la logique...
};
```

**Niveau de Risque** : 🟡 MOYEN

**Priorité** : **P2 - Haute**

---

## 4. ⚠️ Conflit Blocage vs Tâche

**Status** : **PARTIELLEMENT PROTÉGÉ** ⚠️

**Scénario** :
```
Traducteur X: 7h capacité
- 09:00-11:00: Blocage (formation) = 2h
- Conseiller crée tâche de 6h le même jour

Résultat possible: 6h tâche + 2h blocage = 8h > 7h capacité
```

**Impact** : Surcharge non détectée

**Protection Actuelle** :
Le code de vérification de capacité lit TOUS les ajustements :
```typescript
const ajustementsExistants = await tx.ajustementTemps.findMany({
  where: {
    traducteurId,
    date: dateJour,
    // ← Inclut automatiquement type: 'BLOCAGE' et type: 'TACHE'
  }
});
```

**Analyse** : ✅ **Déjà protégé** car les blocages sont des `ajustementTemps`

**Niveau de Risque** : 🟢 FAIBLE (Déjà géré)

---

## 5. ⚠️ Modification de Répartition Concurrente

**Status** : **NON PROTÉGÉ** ⚠️

**Scénario** :
```
T0: Tâche #789 a répartition: [Lun 3h, Mar 2h]
T1: User A modifie → [Lun 2h, Mar 3h]
T2: User B modifie → [Lun 4h, Mar 1h]
Résultat: Les ajustements de A sont supprimés puis recréés avec les valeurs de B
```

**Impact** :
- Perte de modifications
- Répartition incorrecte
- Incohérence planification

**Solution** : Utiliser le `version` de la tâche parent

```typescript
export const mettreAJourTache = async (req: AuthRequest, res: Response) => {
  const { id, version, repartition } = req.body;
  
  await prisma.$transaction(async (tx) => {
    // Vérifier version de la tâche
    const tache = await tx.tache.findUnique({ 
      where: { id, version } 
    });
    
    if (!tache) {
      throw new Error('VERSION_CONFLICT');
    }
    
    // Supprimer et recréer ajustements
    await tx.ajustementTemps.deleteMany({ where: { tacheId: id } });
    // ... création
    
    // Incrémenter version
    await tx.tache.update({
      where: { id },
      data: { version: { increment: 1 } }
    });
  });
};
```

**Niveau de Risque** : 🟠 ÉLEVÉ

**Priorité** : **P1 - Critique** (Lié au conflit #2)

---

## 6. ⚠️ Changement de Disponibilité du Traducteur

**Status** : **NON PROTÉGÉ** ⚠️

**Scénario** :
```
T0: Traducteur X est actif, disponiblePourTravail: true
T1: Conseiller commence à créer une tâche pour X
T2: Admin désactive X (maladie, congé)
T3: Conseiller sauvegarde la tâche
Résultat: Tâche assignée à un traducteur indisponible!
```

**Impact** :
- Tâche non réalisable
- Incohérence planification
- Réassignation nécessaire

**Solution** :
```typescript
export const creerTache = async (req: AuthRequest, res: Response) => {
  const { traducteurId } = req.body;
  
  await prisma.$transaction(async (tx) => {
    // 1. Vérifier disponibilité DANS la transaction
    const traducteur = await tx.traducteur.findUnique({
      where: { id: traducteurId },
      select: { 
        id: true, 
        actif: true, 
        disponiblePourTravail: true,
        nom: true
      }
    });
    
    if (!traducteur) {
      throw new Error('Traducteur introuvable');
    }
    
    if (!traducteur.actif) {
      throw new Error(
        `${traducteur.nom} est désactivé(e) et ne peut pas recevoir de nouvelles tâches`
      );
    }
    
    if (!traducteur.disponiblePourTravail) {
      throw new Error(
        `${traducteur.nom} est marqué(e) comme indisponible pour le moment`
      );
    }
    
    // 2. Vérifier capacité...
    // 3. Créer tâche...
  });
};
```

**Niveau de Risque** : 🟠 ÉLEVÉ (Impact opérationnel majeur)

**Priorité** : **P1 - Critique**

---

## 7. ⚠️ Suppression de Paire Linguistique

**Status** : **RISQUE DE CONTRAINTE** ⚠️

**Scénario** :
```
T0: Admin supprime paire linguistique EN→FR (ID: abc123)
T1: Conseiller crée tâche avec paireLinguistiqueId: abc123
Résultat: Erreur de contrainte FK ou paire invalide
```

**Impact** : Erreur lors de la création

**Protection Actuelle** : Contraintes de clé étrangère PostgreSQL

**Schema** :
```prisma
model Tache {
  paireLinguistiqueId String?
  paireLinguistique   PaireLinguistique? @relation(fields: [paireLinguistiqueId], references: [id])
  // ← Par défaut: onDelete: SetNull (safe)
}
```

**Amélioration** :
```typescript
// Vérifier existence dans transaction
if (paireLinguistiqueId) {
  const paire = await tx.paireLinguistique.findUnique({
    where: { id: paireLinguistiqueId }
  });
  
  if (!paire) {
    throw new Error('Cette paire linguistique n\'existe plus');
  }
}
```

**Niveau de Risque** : 🟡 MOYEN (Géré par contraintes DB)

**Priorité** : **P3 - Moyenne**

---

## 8. ⚠️ Changement d'Accès aux Divisions

**Status** : **NON PROTÉGÉ** ⚠️

**Scénario** :
```
T0: Conseiller A a accès à "CISR" et "Droit 1"
T1: Conseiller A commence à créer tâche pour traducteur dans "CISR"
T2: Admin retire accès "CISR" à Conseiller A
T3: Conseiller A sauvegarde la tâche
Résultat: Tâche créée dans division non autorisée
```

**Impact** :
- Violation des règles d'accès
- Problème de sécurité/audit

**Solution** :
```typescript
export const creerTache = async (req: AuthRequest, res: Response) => {
  const { traducteurId } = req.body;
  const utilisateur = req.utilisateur!;
  
  await prisma.$transaction(async (tx) => {
    // 1. Récupérer division du traducteur
    const traducteur = await tx.traducteur.findUnique({
      where: { id: traducteurId },
      select: { division: true }
    });
    
    // 2. Re-vérifier accès DANS la transaction
    if (utilisateur.role !== 'ADMIN') {
      const acces = await tx.divisionAccess.findFirst({
        where: {
          utilisateurId: utilisateur.id,
          division: { nom: traducteur.division },
          peutEcrire: true
        }
      });
      
      if (!acces) {
        throw new Error(
          `Vous n'avez plus accès en écriture à la division ${traducteur.division}`
        );
      }
    }
    
    // 3. Créer tâche...
  });
};
```

**Niveau de Risque** : 🟠 ÉLEVÉ (Sécurité)

**Priorité** : **P1 - Critique**

---

## 9. ⚠️ Dépassement d'Échéance

**Status** : **VALIDATION EXISTANTE** ⚠️

**Scénario** :
```
Tâche: échéance 2025-12-20 17:00
Répartition proposée:
- 2025-12-19: 3h
- 2025-12-20: 2h
- 2025-12-21: 2h ← APRÈS l'échéance!
```

**Impact** : Répartition invalide

**Protection Actuelle** :
```typescript
// Dans repartitionService.ts - validerRepartition()
for (const r of repartition) {
  if (r.date > dateEcheance) {
    erreurs.push(`${r.date}: après l'échéance (${dateEcheance})`);
  }
}
```

**Analyse** : ✅ Déjà validé dans `validerRepartition()`

**Niveau de Risque** : 🟢 FAIBLE (Déjà géré)

---

## 10. ⚠️ Cascade de Suppressions

**Status** : **CONFIGURATION SCHEMA** ⚠️

**Scénario** :
```
Admin supprime Client "Bureau du Traduction"
→ 150 tâches associées sont supprimées en cascade
→ Perte de données historiques
```

**Impact** : Perte de données majeure

**Configuration Actuelle** :
```prisma
model Tache {
  clientId    String?
  client      Client? @relation(fields: [clientId], references: [id])
  // Par défaut: onDelete: SetNull (safe)
}
```

**Options** :
- `SetNull` : Garde tâche, supprime référence ✅ (actuel)
- `Cascade` : Supprime tâche ❌ (dangereux)
- `Restrict` : Empêche suppression si tâches existent ⚠️

**Recommandation** : Garder `SetNull` ou ajouter soft delete

**Niveau de Risque** : 🟡 MOYEN (Déjà safe)

---

## Matrice de Priorisation

| # | Conflit | Risque | Probabilité | Impact | Priorité |
|---|---------|--------|-------------|--------|----------|
| 1 | Double Booking | 🔴 | Haute | Critique | ✅ **RÉSOLU** |
| 2 | Modification Concurrente | 🟠 | Haute | Majeur | **P1** |
| 3 | Suppression Pendant Modif | 🟡 | Moyenne | Majeur | **P2** |
| 4 | Blocage vs Tâche | 🟢 | Faible | - | ✅ **RÉSOLU** |
| 5 | Répartition Concurrente | 🟠 | Haute | Majeur | **P1** |
| 6 | Disponibilité Traducteur | 🟠 | Moyenne | Critique | **P1** |
| 7 | Paire Linguistique | 🟡 | Faible | Mineur | **P3** |
| 8 | Accès Division | 🟠 | Faible | Critique | **P1** |
| 9 | Dépassement Échéance | 🟢 | Faible | - | ✅ **RÉSOLU** |
| 10 | Cascade Suppression | 🟡 | Faible | Majeur | **P3** |

---

## Plan d'Action Recommandé

### Phase 1 : Protections Critiques (Sprint actuel)

1. **Ajouter champ `version` au modèle Tache**
   - Migration Prisma
   - Optimistic locking sur UPDATE

2. **Vérifier disponibilité traducteur**
   - Check `actif` et `disponiblePourTravail` dans transaction
   - Message d'erreur explicite

3. **Re-vérifier accès division**
   - Validation des permissions dans transaction
   - Protection contre changements d'accès concurrents

### Phase 2 : Robustesse (Sprint suivant)

4. **Gestion suppression pendant modification**
   - Vérifier existence en début de transaction
   - Code d'erreur 410 Gone

5. **Validation paires linguistiques**
   - Check existence dans transaction
   - Message d'erreur clair

### Phase 3 : Améliorations (Backlog)

6. **WebSocket pour notifications temps réel**
   - Alertes de modification concurrente
   - Auto-refresh optimisé

7. **Audit trail complet**
   - Log de toutes les modifications
   - Traçabilité des conflits

8. **Soft delete**
   - Éviter suppressions définitives
   - Possibilité de restauration

---

## Tests de Validation

### Test de Modification Concurrente
```bash
# Terminal 1
curl -X PUT http://localhost:3001/api/taches/123 \
  -d '{"version": 0, "heuresTotal": 7}'

# Terminal 2 (immédiatement)
curl -X PUT http://localhost:3001/api/taches/123 \
  -d '{"version": 0, "description": "Urgent"}'

# Attendu: 2ème requête retourne 409 Conflict
```

### Test de Disponibilité
```bash
# Terminal 1: Désactiver traducteur
curl -X PUT http://localhost:3001/api/traducteurs/xyz \
  -d '{"actif": false}'

# Terminal 2 (immédiatement): Créer tâche
curl -X POST http://localhost:3001/api/taches \
  -d '{"traducteurId": "xyz", ...}'

# Attendu: 400 avec "traducteur désactivé"
```

---

## Conclusion

Sur 10 types de conflits identifiés :
- ✅ **3 sont déjà protégés** (#1, #4, #9)
- 🟠 **4 sont critiques** et nécessitent une action immédiate (#2, #5, #6, #8)
- 🟡 **3 sont à risque moyen/faible** et peuvent être traités ultérieurement (#3, #7, #10)

**Recommandation** : Implémenter les protections critiques (Phase 1) dans le prochain sprint pour garantir la cohérence des données en environnement multi-utilisateur.
