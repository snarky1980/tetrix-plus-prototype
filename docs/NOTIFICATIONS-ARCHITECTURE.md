# Architecture du Module de Notifications

## Vue d'ensemble

Le système de notifications de Tetrix PLUS comprend deux mécanismes distincts:

1. **Notifications système (cloche)** - Alertes liées aux statuts des tâches
2. **Compteurs globaux (badges header)** - Indicateurs temps réel d'activité

---

## 1. Notifications Système (Cloche)

### Composants

```
frontend/src/
├── components/common/
│   └── NotificationBell.tsx     # Composant UI de la cloche
├── hooks/
│   └── useNotificationBell.ts   # Logique métier (polling, marquage)
├── types/
│   └── index.ts                 # TypeNotificationSysteme, NotificationSysteme
└── config/
    └── constants.ts             # Intervalles de polling, limites
```

### Types de notifications

| Type | Description | Icône |
|------|-------------|-------|
| `TACHE_EN_COURS` | Tâche démarrée automatiquement | 🕐 (bleu) |
| `TACHE_EN_RETARD` | Échéance dépassée | ⚠️ (rouge) |
| `TACHE_TERMINEE` | Tâche fermée | ✅ (vert) |
| `ESCALADE_GESTIONNAIRE` | Retard > 2h, escalade | ⚠️ (orange) |
| `RAPPEL_FERMETURE` | Rappel répété | 🔔 (jaune) |

### Flux de données

```
┌─────────────────┐     GET /notifications/systeme/count
│ NotificationBell│ ◄───────────────────────────────────────┐
│                 │                                          │
│  useNotification│     GET /notifications/systeme          │
│  Bell (hook)    │ ◄───────────────────────────────────────│
│                 │                                          │
│                 │    POST /notifications/systeme/:id/lue  │
│                 │ ─────────────────────────────────────────►
└─────────────────┘                                    BACKEND
```

### Configuration

Voir [constants.ts](frontend/src/config/constants.ts):

```typescript
NOTIFICATION_POLLING_INTERVAL_MS = 60_000  // 1 minute
NOTIFICATION_FETCH_LIMIT = 20
NOTIFICATION_COUNT_MAX_DISPLAY = 99
```

---

## 2. Compteurs Globaux (Header)

### Composants

```
frontend/src/
├── contexts/
│   └── NotificationContext.tsx  # Provider React pour compteurs
├── services/
│   └── notificationService.ts   # API calls
└── components/layout/
    └── AppLayout.tsx            # Affichage badges header
```

### Compteurs disponibles

| Compteur | Visible par | Description |
|----------|-------------|-------------|
| `traducteursCherchentTravail` | Conseillers, Gestionnaires | Badge ✋ vert |
| `demandesRessourcesActives` | Traducteurs | Badge 📢 bleu |

### Configuration

```typescript
COMPTEURS_POLLING_INTERVAL_MS = 30_000  // 30 secondes
```

---

## Optimisations

### Pause sur onglet caché

Les deux systèmes vérifient `document.hidden` avant de faire des requêtes:

```typescript
if (document.hidden) return;
```

Et reprennent immédiatement au retour sur l'onglet:

```typescript
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refresh();
});
```

### Accessibilité (WCAG 2.1)

- Attributs ARIA sur tous les contrôles interactifs
- Navigation clavier (Tab, Enter, Escape)
- Labels dynamiques (`aria-label` avec compteur)
- Focus visible sur les éléments interactifs

---

## API Backend

### Endpoints notifications système

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/notifications/systeme` | Liste les notifications |
| GET | `/notifications/systeme/count` | Compte les non-lues |
| POST | `/notifications/systeme/:id/lue` | Marque comme lue |
| POST | `/notifications/systeme/lire-toutes` | Marque toutes lues |

### Endpoints compteurs

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/notifications/compteurs` | Compteurs agrégés |
| GET | `/notifications/traducteurs-disponibles` | Liste détaillée |
| GET | `/notifications/demandes-ressources` | Demandes actives |

---

## Schéma base de données

```prisma
model Notification {
  id              String              @id @default(uuid())
  type            TypeNotification
  titre           String
  message         String
  lue             Boolean             @default(false)
  destinataireId  String
  tacheId         String?
  creeLe          DateTime            @default(now())
  lueLe           DateTime?
  
  tache           Tache?              @relation(...)
  
  @@index([destinataireId, lue])
  @@index([destinataireId, creeLe])
}
```

---

## Bonnes pratiques

1. **Séparation des responsabilités** - Hook pour la logique, composant pour l'UI
2. **Types centralisés** - Définis dans `types/index.ts`
3. **Constantes partagées** - Pas de magic numbers
4. **Gestion d'erreurs** - Console.error avec préfixe identifiable
5. **Cleanup** - Tous les intervals et listeners nettoyés au démontage
