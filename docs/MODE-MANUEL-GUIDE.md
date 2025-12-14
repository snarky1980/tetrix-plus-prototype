# 🎨 MODE MANUEL - Guide complet

**Date**: 14 décembre 2025  
**Version**: 2.1  
**Statut**: ✅ Production Ready

---

## 🎯 Vue d'ensemble

Le mode MANUEL offre le **contrôle total** sur la répartition des heures, tout en bénéficiant de **suggestions intelligentes** pour faciliter la planification.

### Nouveauté V2.1
- ✨ **Suggestions automatiques** d'heures précises
- ✨ **Validation complète** des heures spécifiées
- ✨ **Prise en compte du contexte** (autres tâches, congés, etc.)

---

## 📋 Processus de planification

### 1️⃣ Saisie initiale

L'utilisateur spécifie **quand** et **combien** :

```json
{
  "traducteurId": "uuid-traducteur",
  "heuresTotal": 10,
  "dateEcheance": "2025-12-20",
  "modeDistribution": "MANUEL",
  "repartition": [
    { "date": "2025-12-15", "heures": 3 },
    { "date": "2025-12-16", "heures": 4 },
    { "date": "2025-12-17", "heures": 3 }
  ]
}
```

**Ce qui est requis :**
- ✅ Liste des dates (format ISO: `YYYY-MM-DD`)
- ✅ Heures par date
- ✅ Somme des heures = heuresTotal

**Ce qui est optionnel :**
- heureDebut / heureFin (si non fournis, système suggère)

### 2️⃣ Obtenir des suggestions

#### Endpoint
```
POST /api/repartition/suggerer-heures
```

#### Requête
```json
{
  "traducteurId": "uuid-traducteur",
  "repartition": [
    { "date": "2025-12-15", "heures": 3 },
    { "date": "2025-12-16", "heures": 4 },
    { "date": "2025-12-17", "heures": 3 }
  ],
  "ignorerTacheId": "uuid-tache-optionnel"
}
```

#### Réponse
```json
{
  "repartition": [
    { 
      "date": "2025-12-15", 
      "heures": 3,
      "heureDebut": "8h",
      "heureFin": "11h"
    },
    { 
      "date": "2025-12-16", 
      "heures": 4,
      "heureDebut": "8h",
      "heureFin": "12h"
    },
    { 
      "date": "2025-12-17", 
      "heures": 3,
      "heureDebut": "8h",
      "heureFin": "11h"
    }
  ]
}
```

### 3️⃣ Ajustements (optionnel)

L'utilisateur peut modifier les suggestions :

```json
{
  "repartition": [
    { "date": "2025-12-15", "heures": 3, "heureDebut": "8h", "heureFin": "11h" },     // Gardé
    { "date": "2025-12-16", "heures": 4, "heureDebut": "14h", "heureFin": "19h" },   // Modifié
    { "date": "2025-12-17", "heures": 3, "heureDebut": "15h", "heureFin": "18h" }    // Modifié
  ]
}
```

### 4️⃣ Validation et création

Le système valide automatiquement :
1. ✅ Somme des heures
2. ✅ Cohérence des plages horaires
3. ✅ Respect de l'horaire du traducteur
4. ✅ Capacité disponible
5. ✅ Pas de conflit avec autres tâches

---

## 🧠 Logique de suggestion

### Règle principale
**Suggérer le plus TÔT possible dans la journée où il y a de la capacité.**

### Algorithme

```typescript
Pour chaque jour de la répartition:
  1. Récupérer heures déjà allouées (autres tâches)
  2. Calculer point de départ:
     - Si aucune heure utilisée → début horaire (8h)
     - Si heures déjà utilisées → après celles-ci
  3. Calculer fin = début + heures à allouer
  4. Si traverse pause 12h-13h → ajouter 1h
  5. Retourner {heureDebut, heureFin}
```

### Exemples détaillés

#### Exemple 1: Journée vide
```
Configuration:
- Horaire: 8h-17h
- Heures déjà utilisées: 0h
- À allouer: 3h

Calcul:
- Début: 8h (début horaire)
- Fin: 8h + 3h = 11h
- Pas de pause traversée

Résultat: 8h-11h
```

#### Exemple 2: Après d'autres tâches
```
Configuration:
- Horaire: 8h-17h
- Heures déjà utilisées: 2h (9h-11h autre tâche)
- À allouer: 3h

Calcul:
- Début: 8h + 2h = 10h (après tâches existantes)
- Fin: 10h + 3h = 13h
- Traverse pause 12h-13h → ajouter 1h
- Fin ajustée: 14h

Résultat: 10h-14h
```

#### Exemple 3: Traversée de pause
```
Configuration:
- Horaire: 8h-17h
- Heures déjà utilisées: 0h
- À allouer: 5h

Calcul:
- Début: 8h
- Fin: 8h + 5h = 13h
- Traverse pause 12h-13h → ajouter 1h
- Fin ajustée: 14h

Résultat: 8h-14h (soit 8h-12h + 13h-14h = 5h)
```

---

## ✅ Règles de validation

### 1. Somme des heures
```typescript
somme(repartition.heures) === heuresTotal
```

**Exemple valide:**
```json
heuresTotal: 10
repartition: [
  { "date": "2025-12-15", "heures": 3 },  // 3h
  { "date": "2025-12-16", "heures": 4 },  // 4h
  { "date": "2025-12-17", "heures": 3 }   // 3h
]
Total: 3 + 4 + 3 = 10 ✓
```

### 2. Cohérence des plages horaires
```typescript
heureDebut < heureFin
```

**Exemple invalide:**
```json
{ "heureDebut": "15h", "heureFin": "14h" }  // ✗ Fin avant début
```

### 3. Respect de l'horaire
```typescript
heureDebut >= horaire.debut
heureFin <= horaire.fin
```

**Exemple avec horaire 8h-17h:**
```json
✓ { "heureDebut": "8h", "heureFin": "12h" }   // OK
✓ { "heureDebut": "14h", "heureFin": "17h" }  // OK
✗ { "heureDebut": "6h", "heureFin": "10h" }   // Avant 8h
✗ { "heureDebut": "15h", "heureFin": "19h" }  // Après 17h
```

### 4. Durée cohérente avec pause
```typescript
dureeCalculee = heureFin - heureDebut
if (traverse_pause_12h_13h) {
  dureeCalculee -= 1
}
abs(dureeCalculee - heures) <= 0.1  // Tolérance 6 minutes
```

**Exemples:**
```json
✓ { "heures": 4, "heureDebut": "8h", "heureFin": "12h" }    // 4h sans pause
✓ { "heures": 4, "heureDebut": "10h", "heureFin": "15h" }   // 4h avec pause (5h - 1h)
✗ { "heures": 5, "heureDebut": "8h", "heureFin": "11h" }    // 3h != 5h
```

### 5. Capacité disponible
```typescript
heuresUtilisees + heuresNouvelles <= capaciteNette
```

**Exemple:**
```
Capacité nette: 8h/jour
Déjà utilisées: 3h
À allouer: 6h
Résultat: 3h + 6h = 9h > 8h ✗ Refusé
```

---

## 🎨 Cas d'usage et exemples

### Cas 1: Contraintes personnelles

**Situation:** Traducteur a des rendez-vous certains jours

```json
Lundi: Rendez-vous 9h-11h → Allouer après
{
  "date": "2025-12-15",
  "heures": 4,
  "heureDebut": "11h",  // Après rendez-vous
  "heureFin": "16h"     // 4h + pause
}

Mardi: Disponible toute la journée
{
  "date": "2025-12-16",
  "heures": 6,
  "heureDebut": "8h",   // Dès le matin
  "heureFin": "15h"     // 6h + pause
}
```

### Cas 2: Équilibrer plusieurs projets

**Situation:** 2 projets en parallèle

```json
Projet A (urgent): Matins
[
  { "date": "2025-12-15", "heures": 4, "heureDebut": "8h", "heureFin": "12h" },
  { "date": "2025-12-16", "heures": 4, "heureDebut": "8h", "heureFin": "12h" }
]

Projet B (normal): Après-midis
[
  { "date": "2025-12-15", "heures": 3, "heureDebut": "13h", "heureFin": "16h" },
  { "date": "2025-12-16", "heures": 3, "heureDebut": "13h", "heureFin": "16h" }
]
```

### Cas 3: Productivité variable

**Situation:** Traducteur plus efficace l'après-midi

```json
Stratégie: Concentrer tâches difficiles l'après-midi
{
  "date": "2025-12-17",
  "heures": 5,
  "heureDebut": "13h",  // Après-midi
  "heureFin": "18h"     // Jusqu'en fin de journée
}
```

### Cas 4: Deadline très serrée avec contraintes

**Situation:** 20h à faire en 3 jours, mais réunions

```json
Jour 1: Réunion 14h-16h
{ "date": "2025-12-18", "heures": 6, "heureDebut": "8h", "heureFin": "14h" }  // Matin

Jour 2: Jour complet
{ "date": "2025-12-19", "heures": 8, "heureDebut": "8h", "heureFin": "17h" }  // Toute la journée

Jour 3: Réunion 10h-12h
{ "date": "2025-12-20", "heures": 6, "heureDebut": "13h", "heureFin": "19h" }  // Après-midi
```

---

## 🛠️ Implémentation technique

### Fonction de suggestion

```typescript
export async function suggererHeuresManuel(
  traducteurId: string,
  repartition: RepartitionItem[],
  ignorerTacheId?: string
): Promise<RepartitionItem[]>
```

**Paramètres:**
- `traducteurId`: ID du traducteur
- `repartition`: Liste `{date, heures}` (optionnel: `heureDebut/Fin`)
- `ignorerTacheId`: ID de tâche à ignorer (pour édition)

**Retour:**
- Répartition enrichie avec `heureDebut` et `heureFin`
- Heures déjà spécifiées sont préservées

### Fonction de validation

```typescript
export async function validerRepartition(
  traducteurId: string,
  repartition: RepartitionItem[],
  heuresTotalAttendu: number,
  ignorerTacheId?: string,
  dateEcheanceInput?: DateInput
): Promise<{ valide: boolean; erreurs: string[] }>
```

**Validations effectuées:**
1. Somme des heures
2. Heures précises cohérentes (si fournies)
3. Dans l'horaire du traducteur
4. Durée correcte avec pause
5. Capacité disponible

---

## 📊 Comparaison avec autres modes

| Critère | JAT | ÉQUILIBRÉ | PEPS | MANUEL |
|---------|-----|-----------|------|--------|
| **Contrôle utilisateur** | ❌ Aucun | ❌ Aucun | ❌ Aucun | ✅ **Total** |
| **Temps de setup** | ⚡ Instant | ⚡ Instant | ⚡ Instant | 🐌 Plus long |
| **Suggestions** | ❌ Non | ❌ Non | ❌ Non | ✅ **Oui** |
| **Flexibilité** | ❌ Faible | ❌ Faible | ❌ Faible | ✅ **Maximale** |
| **Validation** | ✅ Auto | ✅ Auto | ✅ Auto | ✅ **Complète** |
| **Cas d'usage** | Urgences | Standard | Priorités | **Contraintes spécifiques** |

---

## 🧪 Tests et validation

### Tests unitaires

```bash
npm test -- repartitionManuel.test.ts
```

**Couverture:**
- ✅ Suggestions heures par défaut
- ✅ Prise en compte heures existantes
- ✅ Préservation heures spécifiées
- ✅ Validation cohérence
- ✅ Validation horaires
- ✅ Validation durée avec pause
- ✅ Scénarios complets

**Résultats:** 11 tests passés ✓

### Tests d'intégration

```bash
npm test
```

**Résultats:** 236 tests passés (dont 11 mode MANUEL) ✓

---

## 📚 Ressources

### Code source
- Service: `/backend/src/services/repartitionService.ts`
- Controller: `/backend/src/controllers/repartitionController.ts`
- Routes: `/backend/src/routes/repartitionRoutes.ts`
- Tests: `/backend/tests/repartitionManuel.test.ts`

### Documentation
- Guide général: `/docs/MODES-DISTRIBUTION-GUIDE.md`
- Index: `/docs/INDEX-DOCUMENTATION.md`
- Changements V2: `/docs/CHANGEMENTS-LOGIQUE-V2.md`

---

## ✨ Conclusion

Le mode MANUEL offre maintenant le **meilleur des deux mondes** :
- 🎨 **Contrôle total** pour les cas complexes
- 🤖 **Suggestions intelligentes** pour gagner du temps
- ✅ **Validation complète** pour éviter les erreurs
- 🧠 **Contexte pris en compte** automatiquement

**Idéal pour:** Contraintes spécifiques, multi-projets, préférences personnelles

---

**Fin du guide MODE MANUEL**
