/**
 * Script pour restaurer la base depuis le backup original
 * et appliquer les nouveaux pseudonymes
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Mapping des noms originaux vers les nouveaux pseudonymes
const PSEUDONYM_MAPPING: Record<string, { pseudonymName: string; pseudonymEmail: string }> = {
  'Ahlgren, Anna': { pseudonymName: 'Aulgrenne, Annah', pseudonymEmail: 'annah.aulgrenne@tetrix.com' },
  'Armin-Pereda, Jennifer': { pseudonymName: 'Arvyn-Peréna, Jénifère', pseudonymEmail: 'jenifere.arvyn-perena@tetrix.com' },
  'Baillargeon, Véronique': { pseudonymName: 'Baillarjon, Véronike', pseudonymEmail: 'veronike.baillarjon@tetrix.com' },
  'Baldakin, Jennifer': { pseudonymName: 'Baldakyn, Jannifère', pseudonymEmail: 'jannifere.baldakyn@tetrix.com' },
  'Balkwill, Janna': { pseudonymName: 'Balkwil, Jannia', pseudonymEmail: 'jannia.balkwil@tetrix.com' },
  'Ballard, Natalie': { pseudonymName: 'Ballarde, Natalië', pseudonymEmail: 'natalie.ballarde@tetrix.com' },
  'Bayer, Annie': { pseudonymName: 'Bayère, Annye', pseudonymEmail: 'annye.bayere@tetrix.com' },
  'Beauchemin, Priscilla': { pseudonymName: 'Beauchamie, Priscelle', pseudonymEmail: 'priscelle.beauchamie@tetrix.com' },
  'Bel Hassan, Meriem': { pseudonymName: 'Bel Hassane, Mériam', pseudonymEmail: 'meriam.belhassane@tetrix.com' },
  'Bergeron, Julie': { pseudonymName: 'Berjeron, Julië', pseudonymEmail: 'julie.berjeron@tetrix.com' },
  'Bissonnette, Julie-Marie': { pseudonymName: 'Bissonnel, Julië-Maryse', pseudonymEmail: 'julie-maryse.bissonnel@tetrix.com' },
  'Blais, Marie-France': { pseudonymName: 'Blay, Mary-Françine', pseudonymEmail: 'mary-francine.blay@tetrix.com' },
  'Blouin, Anabel': { pseudonymName: 'Blouain, Anabèle', pseudonymEmail: 'anabele.blouain@tetrix.com' },
  'Borduas, Mylène': { pseudonymName: 'Bordoua, Mylayne', pseudonymEmail: 'mylayne.bordoua@tetrix.com' },
  'Brégent, Delphine': { pseudonymName: 'Brégand, Dalphine', pseudonymEmail: 'dalphine.bregand@tetrix.com' },
  'Cavanaugh, Mavis': { pseudonymName: 'Cavanô, Mavys', pseudonymEmail: 'mavys.cavano@tetrix.com' },
  'Centomo-Bozzo, Olivia': { pseudonymName: 'Centomo-Bozzi, Olivya', pseudonymEmail: 'olivya.centomo-bozzi@tetrix.com' },
  'Cerutti, Carol': { pseudonymName: 'Ceroutti, Caryle', pseudonymEmail: 'caryle.ceroutti@tetrix.com' },
  'Champagne, Stéphanie': { pseudonymName: 'Champaigne, Stéphanya', pseudonymEmail: 'stephanya.champaigne@tetrix.com' },
  'Charette, Léanne': { pseudonymName: 'Charrête, Léanna', pseudonymEmail: 'leanna.charrete@tetrix.com' },
  'Couture, Sharon': { pseudonymName: 'Couturie, Sharrone', pseudonymEmail: 'sharrone.couturie@tetrix.com' },
  'Cox, Trevor': { pseudonymName: 'Cokks, Trévyr', pseudonymEmail: 'trevyr.cokks@tetrix.com' },
  'Dalrymple, Sarah': { pseudonymName: 'Dalrimpel, Sarrah', pseudonymEmail: 'sarrah.dalrimpel@tetrix.com' },
  'De Angelis, Claudia': { pseudonymName: 'De Anjélis, Claudya', pseudonymEmail: 'claudya.deanjelis@tetrix.com' },
  'De Lorimier, Maya': { pseudonymName: 'De Lorimère, Mayah', pseudonymEmail: 'mayah.delorimere@tetrix.com' },
  'Deschênes, Valérie': { pseudonymName: 'Déchènes, Valérye', pseudonymEmail: 'valerye.dechenes@tetrix.com' },
  'Desharats, Sebastian': { pseudonymName: 'Décharats, Sébastyan', pseudonymEmail: 'sebastyan.decharats@tetrix.com' },
  'Deslippes, Maxime': { pseudonymName: 'Déslipes, Maxyme', pseudonymEmail: 'maxyme.deslipes@tetrix.com' },
  'Ducharme, Suzanne': { pseudonymName: 'Ducharmé, Suzaine', pseudonymEmail: 'suzaine.ducharme@tetrix.com' },
  'Duquette, Evan': { pseudonymName: 'Duquêtte, Évann', pseudonymEmail: 'evann.duquette@tetrix.com' },
  'Echeverri, Sergio': { pseudonymName: 'Échévéry, Sérjio', pseudonymEmail: 'serjio.echevery@tetrix.com' },
  'Eland, Andrea': { pseudonymName: 'Élande, Andréya', pseudonymEmail: 'andreya.elande@tetrix.com' },
  'Feltes, Michael': { pseudonymName: 'Feltès, Mickaël', pseudonymEmail: 'mickael.feltes@tetrix.com' },
  'Fennebresque, Claire': { pseudonymName: 'Fennebresk, Clére', pseudonymEmail: 'clere.fennebresk@tetrix.com' },
  'Forster, Kate': { pseudonymName: 'Forstère, Kaïte', pseudonymEmail: 'kaite.forstere@tetrix.com' },
  'Foucreault, Luna': { pseudonymName: 'Foucrô, Lunah', pseudonymEmail: 'lunah.foucro@tetrix.com' },
  'Fraser, Jennifer': { pseudonymName: 'Frézère, Jénifère', pseudonymEmail: 'jenifere.frezere@tetrix.com' },
  'Fritz, Monica': { pseudonymName: 'Fritze, Mônika', pseudonymEmail: 'monika.fritze@tetrix.com' },
  'Fung, Hillary': { pseudonymName: 'Fonge, Hilarya', pseudonymEmail: 'hilarya.fonge@tetrix.com' },
  'Gagnon, Hugo': { pseudonymName: 'Gagnône, Hugot', pseudonymEmail: 'hugot.gagnone@tetrix.com' },
  'Gelhoas, Mathilde': { pseudonymName: 'Gelhoaz, Mathylde', pseudonymEmail: 'mathylde.gelhoaz@tetrix.com' },
  'Gow, Francie': { pseudonymName: 'Gaud, Francy', pseudonymEmail: 'francy.gaud@tetrix.com' },
  'Grant, Gail': { pseudonymName: 'Grante, Gaëlle', pseudonymEmail: 'gaelle.grante@tetrix.com' },
  'Gueglietta, Daniela': { pseudonymName: 'Guélietta, Danyéla', pseudonymEmail: 'danyela.guelietta@tetrix.com' },
  'Harries, Emma': { pseudonymName: 'Haryès, Emmah', pseudonymEmail: 'emmah.haryes@tetrix.com' },
  'Hentel, Magda': { pseudonymName: 'Hentelle, Magdah', pseudonymEmail: 'magdah.hentelle@tetrix.com' },
  'Hill, Kara': { pseudonymName: 'Hille, Karah', pseudonymEmail: 'karah.hille@tetrix.com' },
  'Hosek Lee, Jane': { pseudonymName: 'Hossek Li, Jaine', pseudonymEmail: 'jaine.hossekli@tetrix.com' },
  'Humbert, Alexandra': { pseudonymName: 'Hombair, Alexandrah', pseudonymEmail: 'alexandrah.hombair@tetrix.com' },
  'Isailovic, Renata': { pseudonymName: 'Isaylovitch, Rénatah', pseudonymEmail: 'renatah.isaylovitch@tetrix.com' },
  'Jean Exemple': { pseudonymName: 'Jéhan Exomple', pseudonymEmail: 'traducteur@tetrix.com' }, // Garde l'email original pour le compte test
  'Julien-Fillion, Marie-Ève': { pseudonymName: 'Julièn-Filyon, Marry-Èva', pseudonymEmail: 'marry-eva.julien-filyon@tetrix.com' },
  'Kadnikov, Patrick': { pseudonymName: 'Kadnikoff, Patrik', pseudonymEmail: 'patrik.kadnikoff@tetrix.com' },
  'Klamph, Efraim Iederman': { pseudonymName: 'Klampf, Ephraïm Iédermon', pseudonymEmail: 'ephraim.klampf@tetrix.com' },
  'Kratz, Johanna': { pseudonymName: 'Krats, Johannah', pseudonymEmail: 'johannah.krats@tetrix.com' },
  'La Salle, Ginette': { pseudonymName: 'La Sâle, Ginnette', pseudonymEmail: 'ginnette.lasale@tetrix.com' },
  'LaPalme, Hazel': { pseudonymName: 'La Palm, Hazelle', pseudonymEmail: 'hazelle.lapalm@tetrix.com' },
  'Lacasse, Mélanie': { pseudonymName: 'Lacasseau, Mélanya', pseudonymEmail: 'melanya.lacasseau@tetrix.com' },
  'Lampron, Jimmy': { pseudonymName: 'Lamprôn, Jymmy', pseudonymEmail: 'jymmy.lampron@tetrix.com' },
  'Laroche, Christian': { pseudonymName: 'Laroshe, Christyan', pseudonymEmail: 'christyan.laroshe@tetrix.com' },
  'Lavigne, Benoit': { pseudonymName: 'Lavin, Bénwâ', pseudonymEmail: 'benwa.lavin@tetrix.com' },
  'Leblanc, Patrick': { pseudonymName: 'Leblann, Patrik', pseudonymEmail: 'patrik.leblann@tetrix.com' },
  'Leclerc, Claude': { pseudonymName: 'Leclaire, Claud', pseudonymEmail: 'claud.leclaire@tetrix.com' },
  'Lee, Pamela': { pseudonymName: 'Lhée, Pamyla', pseudonymEmail: 'pamyla.lhee@tetrix.com' },
  'Legault, Michèle': { pseudonymName: 'Légô, Michela', pseudonymEmail: 'michela.lego@tetrix.com' },
  'Leighton, Heather': { pseudonymName: 'Layton, Hèther', pseudonymEmail: 'hether.layton@tetrix.com' },
  'Li, Baoyu': { pseudonymName: 'Lhi, Baoyun', pseudonymEmail: 'baoyun.lhi@tetrix.com' },
  'Longchamps, Christine': { pseudonymName: 'Longshan, Christyne', pseudonymEmail: 'christyne.longshan@tetrix.com' },
  'Mabuishi, Espérance': { pseudonymName: 'Mabouïshi, Espéranza', pseudonymEmail: 'esperanza.mabouishi@tetrix.com' },
  'Manktelow, Jennifer': { pseudonymName: 'Manktelô, Jannifère', pseudonymEmail: 'jannifere.manktelo@tetrix.com' },
  'Mann, Elizabeth': { pseudonymName: 'Mâne, Élyzabeth', pseudonymEmail: 'elyzabeth.mane@tetrix.com' },
  'Mar, Vincent': { pseudonymName: 'Marr, Vincant', pseudonymEmail: 'vincant.marr@tetrix.com' },
  'Mardirosian, Alexandros': { pseudonymName: 'Mardirozian, Aléxandros', pseudonymEmail: 'alexandros.mardirozian@tetrix.com' },
  'Martin, Isabelle': { pseudonymName: 'Martyn, Ysabelle', pseudonymEmail: 'ysabelle.martyn@tetrix.com' },
  'Maurice, Annie': { pseudonymName: 'Morisse, Anny', pseudonymEmail: 'anny.morisse@tetrix.com' },
  'McCarthy, Stephanie': { pseudonymName: 'McCarthie, Stéphanya', pseudonymEmail: 'stephanya.mccarthie@tetrix.com' },
  'McFarlane, Elizabeth': { pseudonymName: 'MacFarlenn, Élyzabeth', pseudonymEmail: 'elyzabeth.macfarlenn@tetrix.com' },
  'McGivern, Vanessa': { pseudonymName: 'McGiverne, Vanéssa', pseudonymEmail: 'vanessa.mcgiverne@tetrix.com' },
  'Mean, Sun-Kiri': { pseudonymName: 'Miène, Sun-Kyree', pseudonymEmail: 'sun-kyree.miene@tetrix.com' },
  'Mercy, Madeleine': { pseudonymName: 'Mersy, Madelène', pseudonymEmail: 'madelene.mersy@tetrix.com' },
  'Michaud, Marie-Ève': { pseudonymName: 'Mischô, Marry-Èva', pseudonymEmail: 'marry-eva.mischo@tetrix.com' },
  'Michel, Natacha': { pseudonymName: 'Michèl, Natasha', pseudonymEmail: 'natasha.michel@tetrix.com' },
  'Milliard, Sophie': { pseudonymName: 'Milyar, Sophy', pseudonymEmail: 'sophy.milyar@tetrix.com' },
  'Mirarabshahi, Seyedsina': { pseudonymName: 'Mirarabchahi, Seyed-Sena', pseudonymEmail: 'seyed-sena.mirarabchahi@tetrix.com' },
  'Mullin, Maryann': { pseudonymName: 'Mullane, Mariann', pseudonymEmail: 'mariann.mullane@tetrix.com' },
  'Oettel, Jason': { pseudonymName: 'Oettell, Jayson', pseudonymEmail: 'jayson.oettell@tetrix.com' },
  'Omer, Semra-Denise': { pseudonymName: 'Ômer, Selmra-Dénize', pseudonymEmail: 'selmra-denize.omer@tetrix.com' },
  'Oostveen, Karen A': { pseudonymName: 'Oostvane, Karenn A.', pseudonymEmail: 'karenn.oostvane@tetrix.com' },
  'Ouellet, Diane': { pseudonymName: 'Ouellay, Dyanne', pseudonymEmail: 'dyanne.ouellay@tetrix.com' },
  'Pagé, Stéphanie': { pseudonymName: 'Paget, Stéphanya', pseudonymEmail: 'stephanya.paget@tetrix.com' },
  'Palles, Michael': { pseudonymName: 'Pallès, Mickaël', pseudonymEmail: 'mickael.palles@tetrix.com' },
  'Pang, Wingshun': { pseudonymName: 'Pangg, Wingzun', pseudonymEmail: 'wingzun.pangg@tetrix.com' },
  'Papadopetrakis, Mélanie': { pseudonymName: 'Papadopétris, Mélanya', pseudonymEmail: 'melanya.papadopetris@tetrix.com' },
  'Paquette, Lyne': { pseudonymName: 'Paquète, Lynne', pseudonymEmail: 'lynne.paquete@tetrix.com' },
  'Parent, Geneviève': { pseudonymName: 'Parant, Génévyève', pseudonymEmail: 'genevyeve.parant@tetrix.com' },
  'Paul, Eloise': { pseudonymName: 'Paule, Éloyze', pseudonymEmail: 'eloyze.paule@tetrix.com' },
  'Perles, Michelle': { pseudonymName: 'Perlès, Michèlle', pseudonymEmail: 'michelle.perles@tetrix.com' },
  'Rabussier, Juliette': { pseudonymName: 'Rabussièrre, Juliètte', pseudonymEmail: 'juliette.rabussierre@tetrix.com' },
  'Rathjen, Claudia': { pseudonymName: 'Ratjenn, Claudya', pseudonymEmail: 'claudya.ratjenn@tetrix.com' },
  'Rubio, Zoubair': { pseudonymName: 'Roubio, Zoubayr', pseudonymEmail: 'zoubayr.roubio@tetrix.com' },
  'Ruddock, Amber': { pseudonymName: 'Ruddok, Ambre', pseudonymEmail: 'ambre.ruddok@tetrix.com' },
  'Schultz, Barbara': { pseudonymName: 'Schultze, Barbarah', pseudonymEmail: 'barbarah.schultze@tetrix.com' },
  'Tan, Elizabeth': { pseudonymName: 'Tann, Élyzabeth', pseudonymEmail: 'elyzabeth.tann@tetrix.com' },
  'Tardif, Caroline': { pseudonymName: 'Tardiffe, Karolyne', pseudonymEmail: 'karolyne.tardiffe@tetrix.com' },
  'Tremblay, Geneviève': { pseudonymName: 'Tremblé, Génévyève', pseudonymEmail: 'genevyeve.tremble@tetrix.com' },
  'Trudel, Josée': { pseudonymName: 'Trudèl, Jozée', pseudonymEmail: 'jozee.trudel@tetrix.com' },
  'Tsuruta, Sayuri': { pseudonymName: 'Tsurruta, Sayoury', pseudonymEmail: 'sayoury.tsurruta@tetrix.com' },
  'Turpin, Laurie': { pseudonymName: 'Turpyn, Laury', pseudonymEmail: 'laury.turpyn@tetrix.com' },
  'Urdininea, Frances': { pseudonymName: 'Urdinéea, Françès', pseudonymEmail: 'frances.urdineea@tetrix.com' },
  'Vaughan, Nicholas': { pseudonymName: 'Vôghan, Nikolas', pseudonymEmail: 'nikolas.voghan@tetrix.com' },
  'Vega Iraneta, Beatriz De': { pseudonymName: 'Véga Irenata, Béatryce De', pseudonymEmail: 'beatryce.vegairenata@tetrix.com' },
  'Vincent, Jean-François': { pseudonymName: 'Vincènt, Jéan-Françoix', pseudonymEmail: 'jean-francoix.vincent@tetrix.com' },
  'Whimster, Peter': { pseudonymName: 'Wimstère, Pêter', pseudonymEmail: 'peter.wimstere@tetrix.com' },
  'Winfield, Stefan': { pseudonymName: 'Wynfeld, Stéfan', pseudonymEmail: 'stefan.wynfeld@tetrix.com' },
  'Winslow, Kimberley': { pseudonymName: 'Wynslô, Kimbêrley', pseudonymEmail: 'kimberley.wynslo@tetrix.com' },
};

async function restoreAndPseudonymize() {
  console.log('🔄 Restauration et pseudonymisation en cours...\n');

  // Charger le backup original
  const backupPath = path.join(__dirname, '../prisma/backup-before-pseudonymization-1766101667697.json');
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

  console.log(`📦 ${backupData.length} traducteurs à traiter\n`);

  const mappingData: any[] = [];
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const traducteur of backupData) {
    const realName = traducteur.nom;
    const pseudonym = PSEUDONYM_MAPPING[realName];

    if (!pseudonym) {
      console.log(`⏭️  ${realName} - Pas de pseudonyme (ignoré)`);
      skippedCount++;
      continue;
    }

    try {
      // Créer ou mettre à jour l'utilisateur
      const utilisateurData = traducteur.utilisateur;
      const utilisateur = await prisma.utilisateur.upsert({
        where: { id: utilisateurData.id },
        update: {
          email: pseudonym.pseudonymEmail,
          role: utilisateurData.role,
          actif: utilisateurData.actif,
        },
        create: {
          id: utilisateurData.id,
          email: pseudonym.pseudonymEmail,
          motDePasse: utilisateurData.motDePasse,
          nom: utilisateurData.nom,
          prenom: utilisateurData.prenom,
          role: utilisateurData.role,
          actif: utilisateurData.actif,
          creeLe: new Date(utilisateurData.creeLe),
          modifieLe: new Date(utilisateurData.modifieLe),
        },
      });

      // Créer ou mettre à jour le traducteur avec le pseudonyme
      await prisma.traducteur.upsert({
        where: { id: traducteur.id },
        update: {
          nom: pseudonym.pseudonymName,
          division: traducteur.division,
          domaines: traducteur.domaines,
          clientsHabituels: traducteur.clientsHabituels,
          capaciteHeuresParJour: traducteur.capaciteHeuresParJour,
          actif: traducteur.actif,
          classification: traducteur.classification,
          horaire: traducteur.horaire,
          notes: traducteur.notes,
          specialisations: traducteur.specialisations,
          disponiblePourTravail: traducteur.disponiblePourTravail,
          commentaireDisponibilite: traducteur.commentaireDisponibilite,
        },
        create: {
          id: traducteur.id,
          nom: pseudonym.pseudonymName,
          division: traducteur.division,
          domaines: traducteur.domaines,
          clientsHabituels: traducteur.clientsHabituels,
          capaciteHeuresParJour: traducteur.capaciteHeuresParJour,
          actif: traducteur.actif,
          utilisateurId: utilisateur.id,
          creeLe: new Date(traducteur.creeLe),
          modifieLe: new Date(traducteur.modifieLe),
          classification: traducteur.classification,
          horaire: traducteur.horaire,
          notes: traducteur.notes,
          specialisations: traducteur.specialisations,
          disponiblePourTravail: traducteur.disponiblePourTravail,
          commentaireDisponibilite: traducteur.commentaireDisponibilite,
        },
      });

      // Enregistrer dans le mapping
      mappingData.push({
        traducteurId: traducteur.id,
        realName,
        pseudonymName: pseudonym.pseudonymName,
        realEmail: utilisateurData.email,
        pseudonymEmail: pseudonym.pseudonymEmail,
      });

      successCount++;
      console.log(`✅ ${realName} → ${pseudonym.pseudonymName}`);
    } catch (error: any) {
      errorCount++;
      console.error(`❌ ${realName}:`, error.message);
    }
  }

  // Sauvegarder le mapping final
  const mappingPath = path.join(__dirname, '../prisma/pseudonym-mapping-final.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mappingData, null, 2));

  console.log(`\n📊 Résultat:`);
  console.log(`   ✅ Succès: ${successCount}`);
  console.log(`   ❌ Erreurs: ${errorCount}`);
  console.log(`   ⏭️  Ignorés: ${skippedCount}`);
  console.log(`   📝 Total: ${backupData.length}`);
  console.log(`\n📄 Mapping sauvegardé: ${mappingPath}`);
}

restoreAndPseudonymize()
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
