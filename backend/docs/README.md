# 📚 Documentation Backend - Tetrix Plus

## Index des documents

### 🔍 Détection de Conflits (Nouveau!)
- **[API-CONFLICTS.md](./API-CONFLICTS.md)** - Documentation complète de l'API REST de détection de conflits
  - 5 endpoints documentés avec exemples
  - Types de conflits et suggestions
  - Score d'impact détaillé
  - Exemples d'utilisation

### 📁 Archives
Les anciennes documentations sont disponibles dans le dossier `archive/`.

---

## 🚀 Démarrage rapide

### Lancer les tests de conflits

```bash
cd backend
npm test -- conflict-detection.test.ts
```

### Démarrer le serveur

```bash
cd backend
npm start
```

Le serveur démarre sur `http://localhost:3001`

### Tester l'API de conflits

```bash
# Détecter les conflits d'une allocation
curl -X POST http://localhost:3001/api/conflicts/detect/allocation/{allocationId}

# Analyse complète (conflits + suggestions)
curl http://localhost:3001/api/conflicts/allocation/{allocationId}/full
```

---

## 📖 Documentation principale

- **Guide technique**: [/DETECTION-CONFLITS-GUIDE.md](../../DETECTION-CONFLITS-GUIDE.md)
- **Récapitulatif**: [/IMPLEMENTATION-CONFLICTS-SUMMARY.md](../../IMPLEMENTATION-CONFLICTS-SUMMARY.md)
- **Frontend**: [/frontend/INTEGRATION-CONFLICTS.md](../../frontend/INTEGRATION-CONFLICTS.md)

---

## 🧪 Tests

| Fichier | Description | Statut |
|---------|-------------|--------|
| `tests/conflict-detection.test.ts` | Tests unitaires (7 tests) | ✅ 7/7 passent |
| `tests/conflicts-api.integration.test.ts` | Tests d'intégration API (6 tests) | ✅ Prêts |

---

## 🔧 Services disponibles

### conflictDetectionService.ts
- **Détection**: 5 types de conflits
- **Suggestions**: 3 types de résolutions
- **Score d'impact**: Système à 5 facteurs
- **Performance**: < 8s pour analyse complète

---

*Dernière mise à jour: 19 décembre 2025*
