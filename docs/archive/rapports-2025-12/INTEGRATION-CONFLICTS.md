# Guide d'Intégration Frontend - Détection de Conflits

## 🎯 Objectif

Intégrer le système de détection de conflits dans l'interface utilisateur de Tetrix Plus pour permettre aux conseillers de visualiser et résoudre les conflits d'allocation.

---

## 📦 Composants disponibles

### 1. `ConflictDetectionModal`

Modal principal affichant les conflits et suggestions pour une allocation donnée.

**Props:**
```typescript
{
  allocationId: string;        // ID de l'allocation à analyser
  isOpen: boolean;            // Contrôle de visibilité
  onClose: () => void;        // Callback fermeture
  onApplySuggestion: (suggestion: Suggestion) => Promise<void>; // Callback application
}
```

**Utilisation:**
```tsx
import { ConflictDetectionModal } from '@/components/ConflictDetection';

function AllocationEditor() {
  const [showConflicts, setShowConflicts] = useState(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState('');

  const handleApplySuggestion = async (suggestion: Suggestion) => {
    // Implémenter la logique d'application de la suggestion
    if (suggestion.type === 'REPARATION_LOCALE') {
      // Modifier l'allocation existante avec les nouvelles plages
      await updateAllocation(suggestion.tacheId, suggestion.plagesProposees);
    } else if (suggestion.type === 'REATTRIBUTION') {
      // Réassigner la tâche à un autre traducteur
      await reassignTask(suggestion.tacheId, suggestion.traducteurPropose);
    }
  };

  return (
    <>
      <button onClick={() => setShowConflicts(true)}>
        Vérifier les conflits
      </button>

      <ConflictDetectionModal
        allocationId={selectedAllocationId}
        isOpen={showConflicts}
        onClose={() => setShowConflicts(false)}
        onApplySuggestion={handleApplySuggestion}
      />
    </>
  );
}
```

---

### 2. `ConflictBadge`

Badge de notification compact à afficher dans les listes d'allocations.

**Props:**
```typescript
{
  allocationId: string;        // ID de l'allocation
  onClick: () => void;         // Callback au clic
}
```

**Utilisation:**
```tsx
import { ConflictBadge } from '@/components/ConflictDetection';

function AllocationRow({ allocation }) {
  return (
    <div className="flex items-center gap-2">
      <span>{allocation.tache}</span>
      <ConflictBadge
        allocationId={allocation.id}
        onClick={() => openConflictModal(allocation.id)}
      />
    </div>
  );
}
```

---

## 🔧 Intégration étape par étape

### Étape 1: Installer les dépendances

Le composant utilise `lucide-react` pour les icônes:

```bash
npm install lucide-react
```

### Étape 2: Copier le composant

Copier le fichier `ConflictDetection.tsx` dans votre projet:

```
frontend/src/components/ConflictDetection.tsx
```

### Étape 3: Ajouter le hook de vérification automatique

Ajouter une vérification automatique lors de la création/modification d'une allocation:

```tsx
// Dans votre formulaire de création d'allocation
const handleSaveAllocation = async (allocationData) => {
  // 1. Sauvegarder l'allocation
  const newAllocation = await createAllocation(allocationData);

  // 2. Vérifier automatiquement les conflits
  const conflictCheck = await fetch(`/api/conflicts/allocation/${newAllocation.id}/full`);
  const result = await conflictCheck.json();

  // 3. Si des conflits sont détectés, afficher le modal
  if (result.data.hasConflicts) {
    setSelectedAllocationId(newAllocation.id);
    setShowConflictModal(true);
  } else {
    // Pas de conflit, fermer le formulaire normalement
    onClose();
    showSuccessNotification('Allocation créée sans conflit');
  }
};
```

### Étape 4: Ajouter la vérification lors de la création de blocages

```tsx
// Dans votre formulaire de création de blocage
const handleCreateBlocage = async (blocageData) => {
  // 1. Créer le blocage
  const newBlocage = await createBlocage(blocageData);

  // 2. Vérifier les conflits causés par ce blocage
  const conflictCheck = await fetch(`/api/conflicts/detect/blocage/${newBlocage.id}`, {
    method: 'POST'
  });
  const result = await conflictCheck.json();

  // 3. Si des conflits sont détectés, afficher une alerte
  if (result.data.count > 0) {
    showConflictAlert(`⚠️ Ce blocage entre en conflit avec ${result.data.count} allocation(s)`);
    // Proposer de voir les suggestions
    setShowConflictResolution(true);
  }
};
```

### Étape 5: Implémenter l'application des suggestions

```tsx
const applySuggestion = async (suggestion: Suggestion) => {
  try {
    if (suggestion.type === 'REPARATION_LOCALE') {
      // Supprimer l'ancienne allocation
      await deleteAllocation(suggestion.conflitsResolus[0]);

      // Créer de nouvelles allocations pour chaque plage proposée
      for (const plage of suggestion.plagesProposees) {
        await createAllocation({
          tacheId: suggestion.tacheId,
          traducteurId: suggestion.traducteurActuel,
          date: plage.date,
          heureDebut: plage.heureDebut,
          heureFin: plage.heureFin,
          heures: plage.heuresDisponibles
        });
      }

      showSuccessNotification('Allocation déplacée avec succès');
    } 
    else if (suggestion.type === 'REATTRIBUTION') {
      // Mettre à jour la tâche avec le nouveau traducteur
      await updateTask(suggestion.tacheId, {
        traducteurId: suggestion.traducteurPropose
      });

      // Supprimer les anciennes allocations en conflit
      for (const allocationId of suggestion.conflitsResolus) {
        await deleteAllocation(allocationId);
      }

      // Créer les nouvelles allocations pour le nouveau traducteur
      for (const plage of suggestion.plagesProposees) {
        await createAllocation({
          tacheId: suggestion.tacheId,
          traducteurId: suggestion.traducteurPropose,
          date: plage.date,
          heureDebut: plage.heureDebut,
          heureFin: plage.heureFin,
          heures: plage.heuresDisponibles
        });
      }

      showSuccessNotification(`Tâche réattribuée à ${suggestion.candidatsAlternatifs?.[0]?.traducteurNom}`);
    }

    // Rafraîchir les données
    await refreshAllocations();
    
  } catch (error) {
    showErrorNotification('Erreur lors de l\'application de la suggestion');
    console.error(error);
  }
};
```

---

## 🎨 Personnalisation du style

Le composant utilise Tailwind CSS. Vous pouvez personnaliser les couleurs:

```tsx
// Couleurs d'impact
const impactColors = {
  FAIBLE: 'bg-green-100 border-green-300 text-green-800',
  MODERE: 'bg-amber-100 border-amber-300 text-amber-800',
  ELEVE: 'bg-red-100 border-red-300 text-red-800'
};

// Couleurs de type
const typeColors = {
  REPARATION_LOCALE: 'text-blue-600',
  REATTRIBUTION: 'text-purple-600',
  IMPOSSIBLE: 'text-red-600'
};
```

---

## 📊 Affichage dans un tableau de bord

Créer une vue récapitulative des conflits:

```tsx
function ConflictDashboard() {
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    // Récupérer tous les conflits actifs
    const fetchConflicts = async () => {
      const allocations = await getAllActiveAllocations();
      const allConflicts = [];

      for (const allocation of allocations) {
        const response = await fetch(`/api/conflicts/allocation/${allocation.id}/full`);
        const data = await response.json();
        
        if (data.data.hasConflicts) {
          allConflicts.push({
            allocation,
            conflicts: data.data.conflits,
            suggestions: data.data.suggestions
          });
        }
      }

      setConflicts(allConflicts);
    };

    fetchConflicts();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Conflits en attente</h2>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="text-4xl font-bold text-red-900">{conflicts.length}</div>
        <div className="text-sm text-red-600">Allocations en conflit</div>
      </div>

      <div className="space-y-4">
        {conflicts.map((item) => (
          <div key={item.allocation.id} className="bg-white border rounded-lg p-4">
            <div className="font-medium">{item.allocation.tache}</div>
            <div className="text-sm text-gray-600">{item.allocation.traducteur}</div>
            <div className="mt-2">
              <ConflictBadge
                allocationId={item.allocation.id}
                onClick={() => openModal(item.allocation.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🔔 Notifications temps réel

Pour implémenter des notifications en temps réel lorsqu'un conflit apparaît:

```tsx
// Utiliser WebSocket ou polling
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch('/api/conflicts/active');
    const data = await response.json();
    
    if (data.newConflicts > 0) {
      showNotification(`⚠️ ${data.newConflicts} nouveau(x) conflit(s) détecté(s)`);
    }
  }, 30000); // Vérifier toutes les 30 secondes

  return () => clearInterval(interval);
}, []);
```

---

## ✅ Checklist d'intégration

- [ ] Installer `lucide-react`
- [ ] Copier le composant `ConflictDetection.tsx`
- [ ] Ajouter le hook de vérification après création d'allocation
- [ ] Ajouter le hook de vérification après création de blocage
- [ ] Implémenter la fonction `applySuggestion`
- [ ] Ajouter les badges de conflit dans les listes
- [ ] Créer le dashboard de conflits (optionnel)
- [ ] Implémenter les notifications (optionnel)
- [ ] Tester avec des cas réels
- [ ] Former les utilisateurs

---

## 🐛 Dépannage

### Le modal ne s'affiche pas
- Vérifier que `isOpen` est bien à `true`
- Vérifier que l'`allocationId` est valide
- Vérifier la console pour les erreurs API

### Les suggestions ne s'affichent pas
- Vérifier que l'API `/api/conflicts/allocation/:id/full` répond correctement
- Vérifier les permissions et l'authentification
- Vérifier que les conflits ont bien été détectés

### L'application d'une suggestion échoue
- Vérifier que la fonction `applySuggestion` est bien implémentée
- Vérifier les permissions de modification
- Vérifier que les allocations/tâches existent encore

---

## 📚 Ressources

- **API Documentation**: `backend/docs/API-CONFLICTS.md`
- **Backend Service**: `backend/src/services/conflictDetectionService.ts`
- **Types TypeScript**: Voir les interfaces dans le composant
- **Tests**: `backend/tests/conflict-detection.test.ts`
