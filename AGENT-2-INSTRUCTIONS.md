# Instructions pour Agent 2 — UI Integrator

## 🎯 Mission exclusive

Vous êtes responsable **UNIQUEMENT** de l'interface visuelle. Ne touchez PAS à :
- La structure backend
- Les routes API
- La logique métier (répartition, validations)
- Les services API (déjà créés)

## ✅ Ce que vous devez faire

### 1. Importer le thème visuel

**Source obligatoire** : https://github.com/snarky1980/echo-BT-CTD

Analyser et extraire :
- Palette de couleurs
- Typographie
- Espacements et grilles
- Styles des boutons, inputs, cartes
- Animations et transitions

### 2. Créer le design system

Dans `frontend/src/styles/` :
- `colors.css` - Toutes les couleurs (primaire, secondaire, états, codes disponibilité)
- `typography.css` - Polices, tailles, poids
- `spacing.css` - Marges, paddings, grille
- `components.css` - Styles des composants de base

Variables CSS recommandées :
```css
:root {
  /* Couleurs */
  --color-primary: ...;
  --color-success: #4CAF50; /* Vert - disponibilité libre */
  --color-warning: #ff9800; /* Orange - presque plein */
  --color-danger: #f44336;  /* Rouge - plein/surcharge */
  
  /* Typographie */
  --font-family: ...;
  --font-size-base: 16px;
  
  /* Espacements */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

### 3. Créer les composants réutilisables

Dans `frontend/src/components/` :

**Composants de base**
- `Button.tsx` - Boutons (primaire, secondaire, danger)
- `Input.tsx` - Champs de texte, email, password
- `Select.tsx` - Listes déroulantes
- `Card.tsx` - Cartes conteneurs
- `Modal.tsx` - Modals/dialogues
- `Badge.tsx` - Badges de statut

**Composants métier**
- `Header.tsx` - En-tête avec logo, navigation, profil utilisateur
- `Calendar.tsx` - Calendrier 7/14 jours pour planning
- `PlanningGrid.tsx` - Grille multi-traducteurs (planning global)
- `DisponibiliteIndicator.tsx` - Indicateur visuel de disponibilité (vert/orange/rouge)
- `FilterPanel.tsx` - Panneau de filtres (division, client, domaine, paires, période)
- `TacheCard.tsx` - Carte pour afficher une tâche
- `BlocageCard.tsx` - Carte pour afficher un blocage
- `StatCard.tsx` - Carte de statistiques/résumé

### 4. Appliquer les principes UX/UI de la spec

**Règles absolues** :
- ✅ Interfaces légères, non intimidantes
- ✅ Éléments cliquables larges (touch-friendly)
- ✅ Terminologie simple (français uniquement)
- ✅ 3 clics maximum pour toute action
- ✅ Code couleur clair : vert = libre, orange = presque plein, rouge = plein
- ✅ Messages courts et encourageants
- ✅ Navigation minimale (3-4 écrans clés max)

**Interdictions** :
- ❌ Jargon technique
- ❌ Surcharge visuelle
- ❌ Petits boutons ou textes illisibles
- ❌ Interactions complexes

### 5. Implémenter les pages

Remplacer les squelettes temporaires :

**DashboardTraducteur** (`frontend/src/pages/DashboardTraducteur.tsx`)
- Résumé compact : Tâches X h, Blocages Y h, Libre Z h
- Calendrier simplifié 7 jours
- Gros bouton "Bloquer du temps"
- Modal de blocage (date/plage, heures float, case "Journée complète")

**DashboardConseiller** (`frontend/src/pages/DashboardConseiller.tsx`)
- Panneau de recherche traducteurs (filtres multiples)
- Liste de résultats avec actions
- Vue planning individuel (clic sur traducteur)
- Vue planning global (grille multi-traducteurs)
- Bouton "Créer une tâche"

**DashboardAdmin** (`frontend/src/pages/DashboardAdmin.tsx`)
- Gestion traducteurs (liste, création, modification)
- Gestion clients/domaines
- Gestion utilisateurs

### 6. Créer les modals/formulaires

**Modal : Bloquer du temps**
- Champs : Date (ou plage), Heures (float), Case "Journée complète"
- Validation visuelle en temps réel
- Message d'erreur si dépassement capacité

**Modal : Créer une tâche - Étape 1**
- Sélection traducteur (autocomplete)
- Client (optionnel)
- Sous-domaine (optionnel)
- Paire linguistique (obligatoire, liste déroulante)
- Description (textarea)
- Heures totales (input number float)
- Date d'échéance (datepicker)
- Bouton "Répartition automatique" (passe à l'étape 2)

**Modal : Créer une tâche - Étape 2 (répartition)**
- Tableau éditable : Date | Heures proposées | Déjà planifiées | Capacité restante
- Boutons : "Répartir uniformément", "Appliquer juste-à-temps", "Effacer"
- Validations visuelles : somme correcte, aucune surcharge
- Bouton "Enregistrer" (désactivé si erreurs)

### 7. Responsive (souhaitable mais pas obligatoire V1)

Si le temps le permet, rendre les interfaces utilisables sur tablette. Mobile pas nécessaire.

## 🚫 Ce que vous NE devez PAS faire

- Modifier `backend/` (aucun fichier)
- Modifier les services API dans `frontend/src/services/`
- Modifier les types dans `frontend/src/types/`
- Implémenter l'algorithme de répartition (Agent 3)
- Implémenter les validations métier (Agent 3)
- Créer de nouvelles routes API

## 📦 Librairies UI autorisées

Vous POUVEZ installer des librairies pour faciliter l'UI :
- **Date picker** : `react-datepicker` ou `date-fns`
- **Icons** : `lucide-react` ou `react-icons`
- **Tooltips** : `react-tooltip`
- **Drag & drop** (si utile) : `@dnd-kit`

**NE PAS** installer de frameworks UI complets (Material-UI, Ant Design, etc.) - créez vos composants selon le thème echo-BT-CTD.

## ✅ Checklist de validation

Avant de marquer votre travail terminé :

- [ ] Thème echo-BT-CTD importé et documenté
- [ ] Design system créé (`colors`, `typography`, `spacing`)
- [ ] Tous les composants de base fonctionnels
- [ ] Composants métier (Calendar, FilterPanel, Cards) implémentés
- [ ] Page Connexion stylisée
- [ ] DashboardTraducteur complet et stylisé
- [ ] DashboardConseiller complet et stylisé
- [ ] DashboardAdmin complet et stylisé
- [ ] Modals de blocage et création de tâche
- [ ] Code couleur disponibilité appliqué partout
- [ ] Navigation fluide et intuitive
- [ ] Pas d'élément trop petit ou illisible
- [ ] Terminologie en français uniquement
- [ ] Documentation des composants dans un README Agent 2

## 📄 Livrable attendu

Un fichier `AGENT-2-README.md` documentant :
- Source du thème (echo-BT-CTD)
- Structure du design system
- Liste des composants créés avec usage
- Décisions de design prises
- Screenshots (optionnel mais recommandé)

---

**Bonne chance, Agent 2 !** 🎨  
Créez une interface magnifique, simple et ergonomique.
