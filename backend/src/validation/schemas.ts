import { z } from 'zod';

// Utilitaires communs
const uuid = () => z.string().uuid('Identifiant UUID invalide');
const dateISO = (field: string) => 
  z.string().refine(v => !isNaN(Date.parse(v)), `${field} invalide (ISO requis)`);

// Répartition item
const repartitionItemSchema = z.object({
  date: dateISO('date'),
  heures: z.number().positive('heures doit être > 0').max(24, 'heures > 24h impossible'),
});

// Tâches
export const creerTacheSchema = z.object({
  body: z.object({
    traducteurId: uuid(),
    clientId: uuid().optional(),
    sousDomaineId: uuid().optional(),
    paireLinguistiqueId: uuid(),
    description: z.string().min(3, 'Description trop courte'),
    heuresTotal: z.number().positive('heuresTotal doit être > 0').max(200, 'heuresTotal trop élevée'),
    dateEcheance: dateISO('dateEcheance'),
    repartition: z.array(repartitionItemSchema).optional(),
    repartitionAuto: z.boolean().optional(),
  }),
});

export const mettreAJourTacheSchema = z.object({
  params: z.object({ id: uuid() }),
  body: z.object({
    description: z.string().min(3).optional(),
    heuresTotal: z.number().positive().max(200).optional(),
    dateEcheance: dateISO('dateEcheance').optional(),
    statut: z.enum(['PLANIFIEE','EN_COURS','TERMINEE']).optional(),
    repartition: z.array(repartitionItemSchema).optional(),
    repartitionAuto: z.boolean().optional(),
  }),
});

// Planification individuelle
export const obtenirPlanificationSchema = z.object({
  params: z.object({ traducteurId: uuid() }),
  query: z.object({
    dateDebut: dateISO('dateDebut'),
    dateFin: dateISO('dateFin'),
  })
});

// Planification globale
export const obtenirPlanificationGlobaleSchema = z.object({
  query: z.object({
    dateDebut: dateISO('dateDebut'),
    dateFin: dateISO('dateFin'),
    division: z.string().optional(),
    client: z.string().optional(),
    domaine: z.string().optional(),
    langueSource: z.string().optional(),
    langueCible: z.string().optional(),
  })
});

// Blocage
export const creerBlocageSchema = z.object({
  body: z.object({
    traducteurId: uuid(),
    date: dateISO('date'),
    heures: z.number().positive().max(24),
  })
});

export const supprimerBlocageSchema = z.object({
  params: z.object({ id: uuid() })
});

// Traducteur
export const creerTraducteurSchema = z.object({
  body: z.object({
    nom: z.string().min(2),
    email: z.string().email(),
    motDePasse: z.string().min(6),
    division: z.string().min(2),
    domaines: z.array(z.string()).optional(),
    clientsHabituels: z.array(z.string()).optional(),
    capaciteHeuresParJour: z.number().positive().max(24).optional(),
  })
});

export const mettreAJourTraducteurSchema = z.object({
  params: z.object({ id: uuid() }),
  body: z.object({
    nom: z.string().min(2).optional(),
    division: z.string().min(2).optional(),
    domaines: z.array(z.string()).optional(),
    clientsHabituels: z.array(z.string()).optional(),
    capaciteHeuresParJour: z.number().positive().max(24).optional(),
    actif: z.boolean().optional(),
  })
});

export const desactiverTraducteurSchema = z.object({
  params: z.object({ id: uuid() })
});

// Paire linguistique
export const ajouterPaireLinguistiqueSchema = z.object({
  params: z.object({ traducteurId: uuid() }),
  body: z.object({
    langueSource: z.string().min(2),
    langueCible: z.string().min(2),
  })
});

export const supprimerPaireLinguistiqueSchema = z.object({
  params: z.object({ id: uuid() })
});

// Client
export const creerClientSchema = z.object({
  body: z.object({
    nom: z.string().min(2),
    sousDomaines: z.array(z.string()).optional(),
  })
});

export const mettreAJourClientSchema = z.object({
  params: z.object({ id: uuid() }),
  body: z.object({
    nom: z.string().min(2).optional(),
    sousDomaines: z.array(z.string()).optional(),
    actif: z.boolean().optional(),
  })
});

// Sous-domaine
export const creerSousDomaineSchema = z.object({
  body: z.object({
    nom: z.string().min(2),
    domaineParent: z.string().optional(),
  })
});

export const mettreAJourSousDomaineSchema = z.object({
  params: z.object({ id: uuid() }),
  body: z.object({
    nom: z.string().min(2).optional(),
    domaineParent: z.string().optional(),
    actif: z.boolean().optional(),
  })
});
