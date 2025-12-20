# ✅ PLAN DE TESTS MANUELS - Date + Heure

**Objectif** : Valider manuellement que le système gère correctement les échéances avec heure précise

---

## 🎯 SCÉNARIOS DE TEST

### Test 1 : Création Tâche avec Deadline à 10:30

**Objectif** : Vérifier que le système respecte une deadline en milieu de journée

**Données:**
- Traducteur : Marie Dubois (horaire 07:15-15:15)
- Tâche : 3h de traduction
- Deadline : Demain à 10:30

**Étapes:**
1. Se connecter comme conseiller
2. Créer nouvelle tâche :
   - Traducteur : Marie Dubois
   - Type : Traduction
   - Heures : 3
   - Date échéance : [Demain]
   - Heure échéance : 10:30
   - Mode : JAT (auto)
3. Valider

**Résultat attendu:**
- ✅ Tâche créée avec succès
- ✅ Répartition : 3h le [Demain]
- ✅ Plages horaires affichées : environ 07:30-10:30

**Vérification DB:**
```sql
SELECT * FROM taches WHERE "numeroProjet" = 'le numéro';
-- dateEcheance doit contenir: YYYY-MM-DDT10:30:00

SELECT * FROM ajustements_temps WHERE "tacheId" = 'l\'id de la tâche';
-- heureDebut doit être défini (ex: "7h30")
-- heureFin doit être défini (ex: "10h30")
```

---

### Test 2 : Rejection Capacité Insuffisante

**Objectif** : Vérifier que le système détecte quand une tâche ne peut pas tenir avant la deadline

**Données:**
- Traducteur : Marie Dubois (horaire 07:15-15:15)
- Tâche : 6h de traduction
- Deadline : Demain à 10:30 (seulement 3.25h disponibles)

**Étapes:**
1. Se connecter comme conseiller
2. Créer nouvelle tâche :
   - Traducteur : Marie Dubois
   - Heures : 6
   - Date échéance : [Demain]
   - Heure échéance : 10:30
   - Mode : JAT (auto)
3. Tenter de valider

**Résultat attendu:**
- ❌ Erreur affichée : "Capacité insuffisante..."
- ❌ Message indique : "demandé: 6h, disponible: 3.25h" (ou similaire)
- ❌ Tâche NON créée

---

### Test 3 : Répartition Multi-Jours

**Objectif** : Vérifier allocation sur plusieurs jours avec deadline jour J

**Données:**
- Traducteur : Marie Dubois
- Tâche : 9h
- Deadline : Après-demain à 10:00

**Étapes:**
1. Créer tâche de 9h
2. Date échéance : Après-demain
3. Heure échéance : 10:00
4. Mode : JAT

**Résultat attendu:**
- ✅ Tâche créée
- ✅ Répartition sur 2 jours :
  - Jour 1 (demain) : environ 6.25h
  - Jour 2 (après-demain) : environ 2.75h (07:15-10:00)

**Vérification:**
```sql
SELECT date, heures, "heureDebut", "heureFin" 
FROM ajustements_temps 
WHERE "tacheId" = 'l\'id'
ORDER BY date;

-- 2 lignes attendues
-- Ligne 2 : heureFin = "10h" exactement
```

---

### Test 4 : Date Seule (Rétrocompatibilité)

**Objectif** : Vérifier que les anciennes tâches sans heure précise fonctionnent toujours

**Données:**
- Traducteur : Marie Dubois
- Tâche : 5h
- Deadline : Demain (SANS heure spécifiée)

**Étapes:**
1. Créer tâche
2. Date échéance : [Demain]
3. Heure échéance : (laisser vide ou 17:00 par défaut)
4. Mode : JAT

**Résultat attendu:**
- ✅ Tâche créée normalement
- ✅ Système utilise 17:00 comme heure par défaut
- ✅ Mais respecte horaire traducteur (15:15 max)

**Vérification DB:**
```sql
SELECT "dateEcheance" FROM taches WHERE id = '...';
-- Doit contenir soit T17:00:00 soit T00:00:00 (selon normalisation)
```

---

### Test 5 : Pause Midi Respectée

**Objectif** : Vérifier que la pause 12:00-13:00 est bien exclue

**Données:**
- Traducteur : Marie Dubois (07:15-15:15)
- Tâche : 5h
- Deadline : Demain 14:00

**Étapes:**
1. Créer tâche de 5h
2. Deadline : Demain 14:00

**Résultat attendu:**
- ✅ Tâche créée
- ✅ Capacité disponible calculée :
  - 07:15-12:00 = 4.75h
  - 13:00-14:00 = 1h
  - Total = 5.75h ✅ (5h demandé OK)

**Vérification:**
Si on demande 6h avec deadline 14:00 :
- ❌ Doit être rejeté (seulement 5.75h disponibles)

---

### Test 6 : Horaire Traducteur Respecté

**Objectif** : Vérifier qu'on ne peut pas allouer hors horaire du traducteur

**Données:**
- Traducteur : Pierre Martin (horaire 10:00-18:00)
- Tâche : 8h
- Deadline : Demain 09:00 (AVANT son horaire !)

**Étapes:**
1. Créer tâche
2. Traducteur : Pierre Martin
3. Deadline : Demain 09:00

**Résultat attendu:**
- ❌ Capacité disponible = 0h (traducteur commence à 10:00)
- ❌ Erreur : "Capacité insuffisante"
- OU
- ⚠️ Warning : "Deadline avant début horaire traducteur"

---

### Test 7 : Modification Tâche Existante

**Objectif** : Vérifier que modifier une tâche avec nouvelle deadline fonctionne

**Pré-requis:**
- Tâche existante : 4h, deadline demain 17:00

**Étapes:**
1. Ouvrir tâche existante
2. Modifier deadline : demain 12:00 (au lieu de 17:00)
3. Sauvegarder

**Résultat attendu:**
- ✅ Modification acceptée SI capacité suffisante avant 12:00
- ✅ OU erreur SI capacité insuffisante
- ✅ AjustementTemps mis à jour avec nouvelles plages

---

### Test 8 : Visualisation Planification

**Objectif** : Vérifier affichage des plages horaires dans planification globale

**Étapes:**
1. Aller dans Planification Globale
2. Regarder une journée avec plusieurs tâches

**Résultat attendu:**
- ✅ Chaque allocation affiche plage horaire (ex: "10h-14h (4h)")
- ✅ Pas de chevauchement visible
- ✅ Pause midi visible comme bloc non allouable

---

## 📊 MATRICE DE VALIDATION

| Test | Statut | Date | Testeur | Commentaire |
|------|--------|------|---------|-------------|
| 1. Deadline 10:30 | ☐ | | | |
| 2. Capacité insuffisante | ☐ | | | |
| 3. Multi-jours | ☐ | | | |
| 4. Date seule (legacy) | ☐ | | | |
| 5. Pause midi | ☐ | | | |
| 6. Hors horaire | ☐ | | | |
| 7. Modification | ☐ | | | |
| 8. Visualisation | ☐ | | | |

**Légende:**
- ☐ Non testé
- ✅ Passé
- ❌ Échoué
- ⚠️ Passé avec réserves

---

## 🔍 CHECKLIST POST-TESTS

### Si tous les tests passent ✅

- [ ] Documenter résultats dans ticket JIRA/GitHub
- [ ] Marquer version 2.2.0 comme stable
- [ ] Former utilisateurs finaux sur nouvelle gestion heures
- [ ] Surveiller métriques pendant 1 semaine

### Si des tests échouent ❌

- [ ] Noter précisément quel test échoue
- [ ] Capturer logs backend (erreur SQL, stacktrace)
- [ ] Vérifier migration appliquée : `\d ajustements_temps`
- [ ] Vérifier types Prisma générés
- [ ] Ouvrir ticket de bug avec détails
- [ ] Considérer rollback si critique

---

## 📝 NOTES DE TEST

### Environnement de Test

- URL Backend : ___________________________
- URL Frontend : ___________________________
- Version déployée : 2.2.0
- Date tests : ___________________________
- Testeur : ___________________________

### Observations Générales

_Espace pour notes pendant les tests..._

---

### Bugs Découverts

| Bug ID | Description | Sévérité | Statut |
|--------|-------------|----------|--------|
| | | | |

---

### Améliorations Identifiées

- [ ] _Amélioration 1..._
- [ ] _Amélioration 2..._

---

## ✅ VALIDATION FINALE

**Je certifie que tous les tests ont été exécutés et que le système gère correctement les échéances date+heure.**

Signature : _________________  
Date : _________________  
Rôle : _________________

---

**Prochaine étape** : Si validation OK → Déploiement production  
**Sinon** : Investigation et correction bugs
