# Guide de Revue Qualité – Agent 4

## Objectif de la revue
Valider que l’implémentation réalisée (Agents 1–3) respecte la spécification fonctionnelle V1.2, les principes d’architecture, la maintenabilité, la robustesse, la sécurité et l’accessibilité avant d’étendre ou industrialiser.

## Synthèse des livrables actuels
- Backend Node/Express + Prisma (PostgreSQL) : modèles, authentification JWT, routes tâches / planning / traducteurs / clients / sous-domaines, services métier (répartition JAT, uniformes, validation, capacité, couleur planning), endpoint preview JAT.
- Frontend React + Vite + Tailwind : design system (tokens), composants UI (Button, Card, Input, Select, Modal, Layout), pages dashboards + création tâche + planning global, hooks (`usePlanning`, `usePlanningGlobal`, `useRepartition`).
- Tests Vitest backend : couleur disponibilité, répartition uniforme, capacité journalière.

## Priorités de vérification
1. Conformité aux règles métier (répartition, capacité, couleurs).
2. Exactitude du modèle de données vs spécification (Prisma schema).
3. Intégrité des contrôleurs (validation entrées, retours JSON cohérents, codes HTTP).
4. Sécurité (auth, rôles, absence de fuites d’infos, validation données).
5. Cohérence UI/UX et accessibilité minimale (ARIA, focus potentiel, contrastes couleur).
6. Qualité du code (lisibilité, découplage, absence de duplication critique).
7. Tests : couverture critique des algorithmes sensibles (manque éventuel JAT complet).
8. Performance & scalabilité préliminaires (requêtes répétées, N+1, pagination manquante).

## Checklist Détaillée
### A. Modèle & Base de données
- [ ] Vérifier enums et relations Prisma alignées avec Spec V1.2 (roles, statut tâche, types ajustement).
- [ ] Unicité et intégrité référentielle (paires linguistiques, liens tache → ajustements).
- [ ] Types numériques (heures) cohérents (float) et tolérance arrondis acceptable.
- [ ] Besoin d’indexes supplémentaires (filtrage fréquent par date + traducteur, domaine, langues).

### B. Services Métier
- [ ] `repartitionJusteATemps` : boucle back depuis échéance, arrêt sur capacité insuffisante, pas de dépassement journalier.
- [ ] `repartitionUniforme` : somme exacte après correction flottante.
- [ ] `validerRepartition` : somme, négatifs, dépassements journaliers (vérifier cas limite capacité exacte).
- [ ] `verifierCapaciteJournaliere` : calcul disponible + flag dépassement.
- [ ] Couleurs planning : seuils (>=100% plein, >=80% presque-plein, sinon libre) conformes.

### C. Contrôleurs & Routes
- [ ] `tacheController` : `repartitionAuto` applique JAT si pas de répartition manuelle fournie, validation erreurs renvoyée clairement.
- [ ] `planningController` : couleurs ajoutées, blocages validés par capacité.
- [ ] `repartitionController` : preview JAT sans persistance, paramètres requis filtrés.
- [ ] Codes HTTP : 200/201/400/404/500 conformes aux cas.
- [ ] Absence de logique métier duplicative dans contrôleurs (déléguée aux services).

### D. Validation & Sécurité
- [ ] Auth middleware : vérification des rôles sur routes sensibles (planning global, preview JAT).
- [ ] Aucune donnée sensible (hash mot de passe, token) renvoyée.
- [ ] Ajouter (si manquant) validation stricte Schroemas (Zod) pour entrées critiques (tache création, blocage) – à confirmer.
- [ ] Vérifier qu’un traducteur ne peut consulter que son propre planning (middleware `verifierAccesTraducteur`).

### E. UI / Frontend
- [ ] Composants respectent hiérarchie sémantique (titres, listes, rôle tableau pour répartition).
- [ ] Couleurs d’état (vert/orange/rouge) contraste AA (vérifier sur fond clair).
- [ ] Modal : focus initial / tab ordre (amélioration potentielle, actuellement basique).
- [ ] Pages création tâche : retours d’erreur validation visibles (actuellement erreurs JAT/uniforme listées).
- [ ] Hooks ne déclenchent pas de requêtes inutiles (dépendances mémorisées correctement).

### F. Tests & Qualité
- [ ] Tests existants passent (Vitest) – OK.
- [ ] Couverture manquante : scénario JAT avec capacité insuffisante (devrait lever erreur).
- [ ] Manque test `validerRepartition` pour dépassement et somme incorrecte.
- [ ] Ajouter test couleur planning pour limites exactes (0%, 79.99%, 80%, 100%).

### G. Performance / Scalabilité
- [ ] Requêtes dans JAT : potentiellement nombreuses (une requête findMany + findUnique par jour). Suggestion: pré-charger jours de la fenêtre (batch) pour réduire round-trips.
- [ ] Pagination absente sur planning global (mentionnée si >150 traducteurs).
- [ ] Index potentiellement nécessaires sur `(traducteurId, date)` pour ajustements.

### H. Robustesse & Erreurs
- [ ] Messages erreurs cohérents en français, format uniforme `{ erreur: string, details?: string[] }`.
- [ ] Vérifier absence d’exceptions non catchées (services JAT déjà try/catch dans contrôleur).

### I. Sécurité Avancée (Préparation)
- [ ] Taux potentiels de DOS sur endpoint preview JAT (limiter nombre de jours / heuristiques cache futur).
- [ ] Revue future : audit dépendances vulnérabilités (npm audit : 4 moderate).

### J. Accessibilité & i18n
- [ ] ARIA: labels présents sur cellules planning; vérifier usage rôle `table` si besoin.
- [ ] Messages dynamiques (loading, erreurs) ont `aria-live` là où critique (résumé quotidien partiellement couvert).
- [ ] Prévoir externalisation des chaînes pour i18n future.

## Points d’Amélioration Suggérés
| Domaine | Action Prioritaire |
|---------|--------------------|
| Performance | Batch fetch pour JAT au lieu de requêtes par jour |
| Tests | Ajouter cas limites JAT & validation manuelle |
| Sécurité | Renforcer validation d'entrée (Zod sur chaque payload) |
| Accessibilité | Gérer focus trap Modal + aria-live sur erreurs répartition |
| Pagination | Implémenter pagination planning global |
| Observabilité | Ajouter logs structurés (niveau info/warn/error) |

## Risques / Dettes Techniques
- Algorithme JAT non optimisé pour grande plage (risque latence). 
- Manque de tests sur scénarios impossibles (capacité insuffisante). 
- Absence de couche DTO/Schema centralisée (validation partielle). 
- Couleurs codées en dur (extraire vers tokens config si évolutions). 

## Feuille de Route Post-Revue (Proposition)
1. Ajouter tests manquants (JAT insuffisant, validerRepartition erreurs). 
2. Introduire Zod sur toutes entrées POST/PUT (tâches, blocages). 
3. Refactor JAT: Pré-calcul des disponibilités sur intervalle → allocation. 
4. Pagination + filtres avancés sur planning global. 
5. Accessibilité: focus trap Modal + feedback live. 
6. Audit sécurité dépendances (npm audit fix). 

## Critères de Validation Finale
- 0 erreur TypeScript build + tests verts. 
- Checklist A–E ≥ 90% conforme; items critiques (sécurité, logique métier) 100%. 
- Recommandations acceptées ou planifiées. 
- Documentation (README + Guide Revue) à jour. 

---
_Préparé pour Agent 4 : évaluation structurée, mesure des écarts, validation ou demande de correctifs._
