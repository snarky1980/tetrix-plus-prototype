## Audit Performance & Accessibilité (Agent 4)

Date: 2025-11-29
Portée: Frontend (React/Vite/Tailwind) + Backend (Express/Prisma) – focus sur points critiques pour passage en pré-production.

### Synthèse
- Frontend prêt pour déploiement statique (GitHub Pages) après ajout `base` dans Vite.
- Bundle initial (~233 KB min, ~75 KB gzip) acceptable pour prototype mais améliorable (objectif < 50 KB gzip interactif).
- Accessibilité de base: couleurs revues, focus visible, modal avec piège de focus, structure partiellement sémantique. Quelques améliorations restantes (navigation par landmarks, barre de progression ARIA).
- Backend: JAT refactor réduit requêtes N+1; validation Zod exhaustive sur principaux endpoints; manque instrumentation (APM/log). Pas d’index additionnels requis immédiats.

### Performance Frontend
| Aspect | Constat | Recommandations |
|--------|---------|-----------------|
| Bundle JS | 233 KB (75 KB gzip) single chunk | Activer code splitting (lazy load dashboards), analyser rapport (`vite-plugin-visualizer`). |
| CSS | 14.85 KB | OK. Purge Tailwind déjà gérée. |
| Images/Icones | Aucune image lourde | Introduire icones via sprite ou lib légère si besoin. |
| Caching | Fichiers générés par Vite avec hash | Ajouter directives HTTP via Pages (cache immutable). |
| Runtime | Peu de state lourde; pas de mem leaks visibles | Profiler interactions si croissance. |
| Date-fns | Inclus complet (v3) | Importer fonctions ponctuelles (tree-shaking) déjà partiellement fait; vérifier build rapport. |
| React Router | Non utilisé (placeholder) | Ajouter pour code splitting opportuniste. |

#### Optimisations Prioritaires (P1)
1. Ajouter `base` dans `vite.config.ts` pour Pages.
2. Introduire lazy import pour pages non critiques (e.g. `PlanningGlobal`, `DashboardAdmin`).
3. Installer `@vitejs/plugin-legacy` si support navigateurs anciens requis.
4. Activer compression préventive côté backend (si hébergé séparément) pour API réponses JSON volumineuses (ex. planning global). 

### Performance Backend
| Domaine | Constat | Recommandations |
|---------|---------|-----------------|
| Requêtes JAT | Passées de N par jour à 2 requêtes (traducteur + ajustements range) | Ajouter index composite `(traducteurId, date)` déjà présent sur ajustements. OK. |
| Validation | Zod sur toutes routes critiques | Ajouter superRefine pour somme répartition vs heuresTotal. |
| Pagination | Planning global renvoie tous traducteurs | Implémenter `limit/offset` + tri charge (P2). |
| Logs | Console simple | Intégrer pino + correlation id (P1). |
| Sécurité | JWT 24h; pas de rate limiting | Ajouter `express-rate-limit` (P2). |
| Tests | Algorithmes + JAT insuff; manque tests contrôleurs | Étendre tests sur validation erreurs (P2). |

### Accessibilité Frontend
| Aspect | Constat | Recommandations |
|--------|---------|-----------------|
| Langue | `lang="fr"` présent | OK. |
| Contraste | Palette révisée (#b45309 etc.) | Vérifier contraste avec outils (axe) sur petits textes. |
| Focus | Outline visible + modal trap | Ajouter retour focus heading après navigation (P2). |
| Landmarks | Absence de `<header>`, `<main>` explicite dans layout | Envelopper contenu par `<main role="main">`. |
| Progression | Barre JourDetail sans `role="progressbar"` (retiré pour lint) | Réintroduire composant accessible custom (P2). |
| ARIA | Utilisation labels & aria-live pour heures | Éviter aria-label redondant sur éléments déjà textuels. |
| Clavier | Modal accessible, boutons focusables | Vérifier navigation globale après ajout router. |

#### Accessibilité Priorités (P1)
1. Landmarks sémantiques (`<main>`, `<nav>`, `<footer>` si nécessaire).
2. Description visible et associée à progress bar accessible.
3. Nettoyage ARIA redondant (réduire bruit screen reader).

### Préparation Déploiement
Frontend: GitHub Pages (build statique `frontend/dist`). Backend: nécessite hébergement séparé (Railway / Render / Fly.io / Docker). Variables env sensibles (JWT secret, DATABASE_URL) ne doivent jamais être exposées sur Pages.

### Risques Restants
- Absence d’observabilité (logs structurés, monitoring latence DB/API).
- Pas de limitation de requêtes (risque DoS basique).
- Pas de stratégie d’invalidation de cache adaptative pour planning (global recalcul potentiellement volumineux).

### Décision de Readiness
Statut: "Pré-production READY" (exigences principales couvertes, sécurité & perf basiques). Pour "Production READY" il reste: pagination + logs structurés + tests supplémentaires + landmarks + progressbar accessible.

### Feuille de Route Post-Audit
| Ordre | Item | Type |
|-------|------|------|
| 1 | Ajouter landmarks `<main>` + progressbar accessible | A11y |
| 2 | Pino logging + req id | Observabilité |
| 3 | Pagination planning global + tri charge | Performance |
| 4 | superRefine répartition + tests erreurs | Qualité |
| 5 | Rate limiting (auth/planification) | Sécurité |

### Outils Suggestés
- `vite-plugin-visualizer` pour audit bundle.
- `axe-core` script pour test rapide sur pages.
- `pino`, `pino-http` pour logs.
- `express-rate-limit` pour protection API.

---
Document généré par Agent 4.