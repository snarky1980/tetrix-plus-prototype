/**
 * ═══════════════════════════════════════════════════════════════════════
 * GÉNÉRATEUR DE PSEUDONYMES DÉTERMINISTES
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Objectif: Générer des pseudonymes crédibles, prononçables et non-réversibles
 * à partir de noms réels, en utilisant une dérivation phonétique.
 * 
 * Méthode: Hash déterministe + transformation phonétique
 * ═══════════════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';

/**
 * Secret pour la génération déterministe
 * En production, utiliser process.env.PSEUDONYM_SECRET
 */
const PSEUDONYM_SECRET = process.env.PSEUDONYM_SECRET || 'tetrix-plus-secure-secret-2025';

/**
 * Prénoms et noms québécois par initiale pour variation phonétique
 */
const PRENOMS_PAR_INITIALE: { [key: string]: string[] } = {
  'A': ['Anne', 'Andrée', 'Annie', 'Annick', 'Annabelle', 'Aline', 'Audrey', 'Alice', 'Amélie', 'Alexandra'],
  'B': ['Brigitte', 'Béatrice', 'Barbara', 'Brigitte', 'Benoit', 'Bernard', 'Bruno'],
  'C': ['Catherine', 'Caroline', 'Carole', 'Céline', 'Chantal', 'Christine', 'Claire', 'Claudette', 'Christian', 'Claude'],
  'D': ['Diane', 'Danielle', 'Denise', 'Dominique', 'David', 'Daniel', 'Denis'],
  'E': ['Élise', 'Éric', 'Émilie', 'Élaine', 'Édith', 'Ève', 'Étienne', 'Emmanuel'],
  'F': ['France', 'Francine', 'François', 'Frédéric', 'Fernand'],
  'G': ['Ginette', 'Gisèle', 'Guylaine', 'Gilles', 'Guy', 'Gaston', 'Gabriel'],
  'H': ['Hélène', 'Hugo', 'Henri', 'Hubert'],
  'I': ['Isabelle', 'Irène', 'Ivan'],
  'J': ['Joanne', 'Johanne', 'Josée', 'Julie', 'Jacqueline', 'Jean', 'Jacques', 'Joseph', 'Julien'],
  'K': ['Karine', 'Karen', 'Kevin'],
  'L': ['Louise', 'Lucie', 'Linda', 'Lise', 'Lorraine', 'Luc', 'Louis', 'Laurent'],
  'M': ['Marie', 'Manon', 'Martine', 'Monique', 'Michelle', 'Marc', 'Martin', 'Michel', 'Mario'],
  'N': ['Nicole', 'Nathalie', 'Nancy', 'Normand', 'Nicolas'],
  'O': ['Odette', 'Olivier', 'Oscar'],
  'P': ['Patricia', 'Pauline', 'Pierrette', 'Pierre', 'Paul', 'Patrick', 'Philippe'],
  'R': ['Renée', 'Rachel', 'Raymonde', 'Richard', 'Robert', 'Roger', 'René', 'Réjean'],
  'S': ['Sylvie', 'Suzanne', 'Sophie', 'Stéphane', 'Simon', 'Serge', 'Sébastien'],
  'T': ['Thérèse', 'Théo', 'Thomas'],
  'V': ['Valérie', 'Véronique', 'Viviane', 'Vincent', 'Victor'],
  'W': ['William', 'Wilfred'],
  'Y': ['Yves', 'Yvon', 'Yvette', 'Yolande'],
  'Z': ['Zoé', 'Zacharie']
};

const NOMS_PAR_INITIALE: { [key: string]: string[] } = {
  'A': ['Allard', 'Arsenault', 'Auger', 'Archambault', 'Auclair'],
  'B': ['Bélanger', 'Bouchard', 'Boucher', 'Bergeron', 'Bernard', 'Beauchamp', 'Beaulieu', 'Bisson', 'Blais', 'Boivin'],
  'C': ['Côté', 'Caron', 'Cloutier', 'Comeau', 'Couture', 'Charest'],
  'D': ['Dubois', 'Dufour', 'Dupuis', 'Demers', 'Desrosiers', 'Desjardins', 'Drouin'],
  'E': ['Éthier', 'Émond'],
  'F': ['Fortin', 'Fournier', 'Fontaine', 'Fillion'],
  'G': ['Gagnon', 'Gauthier', 'Girard', 'Guérin', 'Gilbert', 'Gosselin'],
  'H': ['Harvey', 'Houle', 'Hébert'],
  'I': ['Isabelle'],
  'J': ['Jean', 'Jalbert', 'Jodoin'],
  'K': ['Kennedy', 'King'],
  'L': ['Lavoie', 'Leblanc', 'Leclerc', 'Lefebvre', 'Lemieux', 'Lévesque', 'Lalonde', 'Landry', 'Lachance', 'Labelle'],
  'M': ['Morin', 'Martineau', 'Martel', 'Martin', 'Michaud', 'Mercier', 'Moreau'],
  'N': ['Nadeau', 'Noël'],
  'O': ['Ouellet', 'Ouellette'],
  'P': ['Pelletier', 'Perron', 'Paquette', 'Poirier', 'Parent', 'Proulx', 'Paré'],
  'Q': ['Quesnel'],
  'R': ['Roy', 'Richard', 'Richer', 'Rousseau', 'Riopel', 'Renaud'],
  'S': ['Savard', 'Simard', 'St-Pierre', 'St-Laurent', 'Sauvé'],
  'T': ['Tremblay', 'Tessier', 'Thibault', 'Turcotte', 'Tardif'],
  'V': ['Vachon', 'Villeneuve', 'Vincent', 'Vézina'],
  'W': ['Wilson', 'Walsh'],
  'Y': ['Young'],
  'Z': ['Zampini']
};

/**
 * Génère un hash déterministe à partir d'un ID et d'un nom
 */
function generateHash(id: string, name: string): string {
  const data = `${id}:${name}:${PSEUDONYM_SECRET}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Extrait un nombre déterministe du hash
 */
function hashToNumber(hash: string, max: number): number {
  const subset = hash.substring(0, 8);
  const num = parseInt(subset, 16);
  return num % max;
}

/**
 * Extrait les initiales d'un nom
 */
function extractInitials(name: string): { firstInitial: string; lastInitial: string } {
  // Format attendu: "Nom, Prénom" ou "Nom, Prénom-Composé"
  const parts = name.split(',').map(p => p.trim());
  
  let lastName = '';
  let firstName = '';
  
  if (parts.length >= 2) {
    lastName = parts[0];
    firstName = parts[1];
  } else {
    // Fallback si format différent
    const words = name.split(/\s+/);
    firstName = words[0] || '';
    lastName = words[words.length - 1] || '';
  }
  
  const firstInitial = firstName.charAt(0).toUpperCase() || 'A';
  const lastInitial = lastName.charAt(0).toUpperCase() || 'B';
  
  return { firstInitial, lastInitial };
}

/**
 * Génère un prénom pseudonyme à partir du hash et de l'initiale
 */
function generateFirstName(hash: string, initial: string): string {
  const prenoms = PRENOMS_PAR_INITIALE[initial] || PRENOMS_PAR_INITIALE['A'];
  const idx = hashToNumber(hash.substring(0, 8), prenoms.length);
  
  return prenoms[idx];
}

/**
 * Génère un nom de famille pseudonyme à partir du hash et de l'initiale
 */
function generateLastName(hash: string, initial: string): string {
  const noms = NOMS_PAR_INITIALE[initial] || NOMS_PAR_INITIALE['B'];
  const idx = hashToNumber(hash.substring(16, 24), noms.length);
  
  return noms[idx];
}

/**
 * Génère un email à partir du pseudonyme
 */
function generateEmail(firstName: string, lastName: string): string {
  const cleanFirst = firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanLast = lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  return `${cleanFirst}.${cleanLast}@tetrix.com`;
}

/**
 * Interface pour un pseudonyme généré
 */
export interface Pseudonym {
  displayName: string;      // "Marie Belmont"
  email: string;            // "marie.belmont@tetrix.com"
  firstName: string;        // "Marie"
  lastName: string;         // "Belmont"
}

/**
 * Génère un pseudonyme complet pour un traducteur
 * 
 * @param traducteurId ID du traducteur (UUID)
 * @param realName Nom réel du traducteur (format: "Nom, Prénom")
 * @returns Pseudonyme généré de façon déterministe avec mêmes initiales
 */
export function generatePseudonym(traducteurId: string, realName: string): Pseudonym {
  // Extraire les initiales du nom réel
  const { firstInitial, lastInitial } = extractInitials(realName);
  
  // Générer hash déterministe
  const hash = generateHash(traducteurId, realName);
  
  // Générer prénom et nom avec les mêmes initiales
  const firstName = generateFirstName(hash, firstInitial);
  const lastName = generateLastName(hash, lastInitial);
  
  // Générer email
  const email = generateEmail(firstName, lastName);
  
  // Construire nom complet
  const displayName = `${lastName}, ${firstName}`;
  
  return {
    displayName,
    email,
    firstName,
    lastName
  };
}

/**
 * Vérifie si un email est un compte générique à ne pas pseudonymiser
 */
export function isGenericAccount(email: string): boolean {
  const generics = [
    'admin@tetrix.com',
    'conseiller@tetrix.com',
    'gestionnaire@tetrix.com',
    'traducteur@tetrix.com'
  ];
  
  return generics.includes(email.toLowerCase());
}

/**
 * Détecte et résout les collisions de pseudonymes
 */
export function resolveCollision(
  pseudonym: Pseudonym,
  existingPseudonyms: Set<string>,
  attempt: number = 0
): Pseudonym {
  const key = `${pseudonym.firstName}:${pseudonym.lastName}`;
  
  if (!existingPseudonyms.has(key) || attempt === 0) {
    existingPseudonyms.add(key);
    return pseudonym;
  }
  
  // Ajouter suffixe en cas de collision
  const suffix = String.fromCharCode(65 + attempt - 1); // A, B, C, ...
  
  return {
    displayName: `${pseudonym.lastName}, ${pseudonym.firstName} ${suffix}`,
    email: `${pseudonym.firstName.toLowerCase()}.${pseudonym.lastName.toLowerCase()}.${suffix.toLowerCase()}@tetrix.com`,
    firstName: `${pseudonym.firstName} ${suffix}`,
    lastName: pseudonym.lastName
  };
}

// Tests unitaires si exécuté directement
if (require.main === module) {
  console.log('\n🧪 Tests du générateur de pseudonymes\n');
  
  const testCases = [
    { id: '1', name: 'Bissonnette, Julie-Marie' },
    { id: '2', name: 'Leduc, André' },
    { id: '3', name: 'Tremblay, Marie' },
    { id: '1', name: 'Bissonnette, Julie-Marie' } // Même ID = même pseudo
  ];
  
  testCases.forEach((test, idx) => {
    const pseudo = generatePseudonym(test.id, test.name);
    console.log(`Test ${idx + 1}: ${test.name}`);
    console.log(`  → ${pseudo.displayName}`);
    console.log(`  → ${pseudo.email}\n`);
  });
  
  // Vérifier déterminisme
  const p1 = generatePseudonym('1', 'Bissonnette, Julie-Marie');
  const p2 = generatePseudonym('1', 'Bissonnette, Julie-Marie');
  console.log(`✅ Déterminisme: ${p1.displayName === p2.displayName ? 'OK' : 'FAIL'}`);
}
