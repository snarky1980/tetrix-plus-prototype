# Plages Horaires Éditables - Formulaire de Création de Tâche

**Date:** 20 décembre 2025  
**Fichier modifié:** `frontend/src/pages/PlanificationGlobale.tsx`

## Fonctionnalité

Le formulaire de création de tâche permet maintenant de **visualiser et modifier les plages horaires** proposées avant de créer la tâche.

## Modifications Apportées

### 1. ✅ Heure du délai visible et éditable

**Champ:** Date d'échéance (Étape 1)  
**Composant:** `DateTimeInput` avec `includeTime={true}`  
**Emplacement:** Ligne ~1922

```tsx
<DateTimeInput
  label="Date d'échéance"
  value={formTache.dateEcheance}
  onChange={(value) => setFormTache({ ...formTache, dateEcheance: value })}
  includeTime={true}
  required
/>
```

**Fonctionnalité:**
- Affiche la date ET l'heure du délai
- Permet de modifier les deux (date et heure)
- Format: `YYYY-MM-DD` + `HH:MM` (ex: 2025-12-23 à 16:00)

---

### 2. ✅ Plages horaires éditables (Étape 2)

**Section:** Prévisualisation de la répartition  
**Emplacement:** Lignes 2304-2368

#### Ancien affichage (tableau en lecture seule)

```tsx
<table className="w-full text-xs">
  <tbody>
    {previewRepartition.map((r, idx) => (
      <tr>
        <td>{formatDateAvecJour(r.date)}</td>
        <td>{r.heures.toFixed(2)}h ({r.heureDebut}-{r.heureFin})</td>
      </tr>
    ))}
  </tbody>
</table>
```

#### Nouveau affichage (éditable)

```tsx
<div className="divide-y divide-border">
  {previewRepartition.map((r, idx) => (
    <div className="px-3 py-3">
      {/* Date et heures éditables */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-semibold">{formatDateAvecJour(r.date)}</span>
        <Input
          type="number"
          step="0.25"
          min="0"
          value={r.heures}
          onChange={(e) => {
            const newPreview = [...previewRepartition];
            newPreview[idx].heures = parseFloat(e.target.value) || 0;
            setPreviewRepartition(newPreview);
          }}
        />
        <span>h</span>
      </div>
      
      {/* Plages horaires éditables */}
      <div className="flex items-center gap-2">
        <span>De</span>
        <Input
          type="time"
          value={r.heureDebut || '09:00'}
          onChange={(e) => {
            const newPreview = [...previewRepartition];
            newPreview[idx].heureDebut = e.target.value;
            setPreviewRepartition(newPreview);
          }}
        />
        <span>à</span>
        <Input
          type="time"
          value={r.heureFin || '17:00'}
          onChange={(e) => {
            const newPreview = [...previewRepartition];
            newPreview[idx].heureFin = e.target.value;
            setPreviewRepartition(newPreview);
          }}
        />
      </div>
    </div>
  ))}
</div>
```

## Fonctionnalités Clés

### Modification des heures allouées
- Champ numérique avec incrément de 0.25h
- Minimum: 0h
- Le total est recalculé en temps réel

### Modification des plages horaires
- **Heure de début:** Sélecteur `type="time"` (format HH:MM)
- **Heure de fin:** Sélecteur `type="time"` (format HH:MM)
- Valeurs par défaut: 09:00 et 17:00 si non définies

### Bouton Recalculer
- Permet de régénérer la répartition automatique
- Utile si les modifications manuelles ne conviennent pas

## Workflow Utilisateur

1. **Étape 1 - Configuration:**
   - Saisir les informations de base
   - **Définir la date ET l'heure du délai** (ex: 23 déc 2025 à 16:00)
   - Choisir le mode de répartition (JAT, PEPS, ÉQUILIBRÉ, MANUEL)

2. **Étape 2 - Prévisualisation:**
   - Voir la répartition calculée automatiquement
   - **Modifier les heures** pour chaque jour (ex: 3.5h → 4h)
   - **Ajuster les plages horaires** (ex: 14h-17h → 13h-16h)
   - Recalculer si nécessaire

3. **Création:**
   - Valider la tâche avec les modifications appliquées

## Exemples d'Utilisation

### Exemple 1: Ajuster les heures du dernier jour

**Répartition initiale (JAT):**
- Lun 23 déc: 6h (9h-12h, 13h-16h)
- Mar 24 déc: 4h (13h-17h)

**Modification utilisateur:**
- Lun 23 déc: 5h ✏️ (modifié)
- Mar 24 déc: 5h ✏️ (modifié)
- Ajuster plages: Lun 9h-12h, 13h-15h | Mar 12h-17h

### Exemple 2: Décaler les heures en fin de journée

**Répartition initiale (ÉQUILIBRÉ):**
- Mer 20 déc: 3h (14h-17h)
- Jeu 21 déc: 3h (14h-17h)

**Modification utilisateur:**
- Mer 20 déc: Changer 14h-17h → **13h-16h** ✏️
- Garder Jeu 21 déc inchangé

## Interface Utilisateur

### Titre de la section
```
📅 Répartition calculée (modifiable)
```

### Layout responsive
- Date et heures sur 2 lignes pour meilleure lisibilité
- Fond alterné (blanc/gris) pour faciliter la lecture
- Survol en bleu clair pour l'interaction

### Total dynamique
```
Total: 14.00h sur 5 jours
```

## Règles de Validation

✅ **Pas de validation stricte** - l'utilisateur peut modifier librement  
⚠️ **Recommandation:** Le total des heures devrait correspondre aux heures totales de la tâche  
ℹ️ **Note:** Les modifications ne vérifient pas automatiquement les conflits (c'est fait au moment de la création)

## Corrections TypeScript

**Problème:** Type incompatible pour `onClick={handleSubmitTache}`  
**Solution:** Wrapper dans une fonction anonyme `onClick={() => handleSubmitTache()}`

```tsx
// ❌ Avant
<Button onClick={handleSubmitTache}>Créer</Button>

// ✅ Après
<Button onClick={() => handleSubmitTache()}>Créer</Button>
```

## Impact sur l'Expérience Utilisateur

### ✅ Avantages
1. **Contrôle total:** L'utilisateur peut ajuster finement la répartition
2. **Flexibilité:** Possibilité de modifier avant création (pas besoin de supprimer/recréer)
3. **Transparence:** Voir exactement quand et combien d'heures seront allouées
4. **Efficacité:** Modifications en temps réel sans rechargement

### 🎯 Cas d'usage
- Ajuster les heures pour s'adapter à des réunions prévues
- Décaler les plages horaires pour des préférences personnelles
- Corriger une estimation automatique jugée inadéquate
- Répartir différemment pour équilibrer la charge

---

**Serveur redémarré:** Frontend sur port 5173 ✅  
**Aucune erreur de compilation** ✅
