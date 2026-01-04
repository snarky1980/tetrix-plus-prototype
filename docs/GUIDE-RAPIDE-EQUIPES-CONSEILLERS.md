# Guide Rapide - Équipes Conseillers

## Démarrage en 3 étapes

### 1. Initialiser les équipes de base (une seule fois)

```bash
cd backend
npm run seed:equipes-conseiller
```

Cela crée les 6 équipes :
- ✅ Équipe A (EQ-A)
- ✅ Équipe B (EQ-B)
- ✅ Équipe C (EQ-C)
- ✅ Équipe D (EQ-D)
- ✅ Équipe G (EQ-G)
- ✅ Équipe Anglo (EQ-ANGLO)

### 2. Assigner des conseillers aux équipes

**Dans l'interface Admin :**

1. Se connecter comme ADMIN ou GESTIONNAIRE
2. Aller dans **Administration** → **Équipes Conseillers**
3. Cliquer sur une équipe (ex: Équipe A)
4. Cliquer "Ajouter" dans la section membres
5. Sélectionner un conseiller
6. Choisir le rôle (Chef ou Membre)
7. Valider

**💡 Astuce :** Un conseiller peut être ajouté à plusieurs équipes !

### 3. Partager des notes avec l'équipe

**Lors de la création d'une note :**

1. Aller dans **Mes Notes** ou sur une entité (Client, Traducteur, etc.)
2. Créer une nouvelle note
3. Dans **Visibilité**, sélectionner "Équipe Conseiller"
4. Choisir l'équipe cible (ex: Équipe A)
5. Seuls les membres de l'Équipe A verront cette note

## Cas d'usage courants

### Scénario 1 : Conseiller multi-équipes

Marie est conseillère spécialisée en immigration ET en droit.

1. L'admin l'ajoute à l'Équipe A comme MEMBRE
2. L'admin l'ajoute à l'Équipe G comme CHEF

Marie voit maintenant les notes des deux équipes !

### Scénario 2 : Note partagée entre équipes

Pour partager avec plusieurs équipes :
- Option 1 : Créer une note par équipe
- Option 2 : Utiliser visibilité "EQUIPE" (visible par tous les conseillers)
- Option 3 : Utiliser visibilité "PUBLIC" (visible par tous)

### Scénario 3 : Réorganisation d'équipes

Pour retirer un conseiller d'une équipe :

1. Ouvrir l'équipe
2. Cliquer l'icône ❌ à côté du membre
3. Confirmer

Le conseiller reste dans ses autres équipes.

## FAQ Rapide

**Q : Un conseiller peut-il être dans plusieurs équipes ?**  
✅ Oui ! Il suffit de l'ajouter à chaque équipe.

**Q : Peut-il avoir des rôles différents par équipe ?**  
✅ Oui ! CHEF dans une équipe, MEMBRE dans une autre.

**Q : Qui peut gérer les équipes ?**  
👤 ADMIN et GESTIONNAIRE uniquement.

**Q : Qui peut être membre ?**  
👥 CONSEILLER, GESTIONNAIRE et ADMIN.

**Q : Comment voir mes équipes ?**  
📋 GET `/api/equipes-conseiller/mes-equipes`

**Q : Les traducteurs peuvent-ils être membres ?**  
❌ Non. Les traducteurs utilisent les "Équipes Projet".

## Commandes utiles

```bash
# Créer les équipes de base
npm run seed:equipes-conseiller

# Tester l'API
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/equipes-conseiller

# Démonstration multi-équipes
npx tsx scripts/exemple-multi-equipes.ts
```

## Prochaines étapes

- [ ] Assigner tous les conseillers à leurs équipes
- [ ] Former les utilisateurs sur la visibilité des notes
- [ ] Créer des notes d'équipe pour tester
- [ ] Ajuster les équipes selon les besoins

---

**Documentation complète** : [EQUIPES-CONSEILLERS.md](./EQUIPES-CONSEILLERS.md)
