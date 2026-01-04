import prisma from '../config/database';
import { auditService } from './auditService';

/**
 * Liste des tables à exporter/importer
 * L'ordre est important pour respecter les dépendances des clés étrangères
 */
const TABLES_EXPORT_ORDER = [
  'utilisateurs',
  'divisions',
  'divisionAccess',
  'equipeProjetAccess',
  // Nouveaux référentiels normalisés
  'langues',
  'specialisations',
  'domaines',
  // Traducteurs et relations
  'traducteurs',
  'traducteurSpecialisations',
  'traducteurDomaines',
  'traducteurDivisions',
  'traducteurClients',
  'pairesLinguistiques',
  'liaisonReviseurs',
  'clients',
  'sousDomaines',
  'taches',
  'historiqueTaches',
  'ajustementsTemps',
  'notifications',
  'joursFeries',
  'equipesProjet',
  'equipeProjetMembres',
  'equipesConseiller',
  'equipesConseillerMembres',
  'demandesRessources',
  'interetsDemandes',
  'notes',
  'piecesJointes',
  'sessions',
  'auditLogs',
] as const;

type TableName = typeof TABLES_EXPORT_ORDER[number];

interface BackupMetadata {
  version: string;
  createdAt: string;
  createdBy: string;
  tables: string[];
  counts: Record<string, number>;
  environment: string;
}

interface BackupData {
  metadata: BackupMetadata;
  data: Record<string, unknown[]>;
}

interface RestoreResult {
  success: boolean;
  tablesRestored: string[];
  errors: string[];
  counts: Record<string, { imported: number; errors: number }>;
}

/**
 * Service de sauvegarde et restauration de la base de données
 */
class BackupService {
  /**
   * Exporter toutes les données de la base
   */
  async exportDatabase(utilisateurId: string): Promise<BackupData> {
    console.log('[BackupService] Démarrage export complet...');
    
    const data: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};

    // Export de chaque table
    for (const table of TABLES_EXPORT_ORDER) {
      try {
        const records = await this.exportTableData(table);
        data[table] = records;
        counts[table] = records.length;
        console.log(`  ✓ ${table}: ${records.length} enregistrements`);
      } catch (error: any) {
        console.error(`  ✗ ${table}: ${error.message}`);
        data[table] = [];
        counts[table] = 0;
      }
    }

    const metadata: BackupMetadata = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      createdBy: utilisateurId,
      tables: TABLES_EXPORT_ORDER.slice(),
      counts,
      environment: process.env.NODE_ENV || 'development',
    };

    // Logger l'action d'audit
    await auditService.log({
      utilisateurId,
      action: 'EXPORT_DONNEES',
      entite: 'Backup',
      details: { 
        type: 'export_complet',
        tablesExportees: Object.keys(counts).length,
        totalEnregistrements: Object.values(counts).reduce((a, b) => a + b, 0),
      },
    });

    console.log('[BackupService] Export terminé');
    return { metadata, data };
  }

  /**
   * Exporter une table spécifique (méthode interne)
   */
  private async exportTableData(table: TableName): Promise<unknown[]> {
    switch (table) {
      case 'utilisateurs':
        return prisma.utilisateur.findMany({
          select: {
            id: true,
            email: true,
            motDePasse: true,
            nom: true,
            prenom: true,
            role: true,
            actif: true,
            creeLe: true,
            modifieLe: true,
            isPlayground: true,
            playgroundNote: true,
          },
        });

      case 'divisions':
        return prisma.division.findMany();

      case 'divisionAccess':
        return prisma.divisionAccess.findMany();

      case 'equipeProjetAccess':
        return prisma.equipeProjetAccess.findMany();

      // Nouveaux référentiels normalisés
      case 'langues':
        return prisma.langue.findMany();

      case 'specialisations':
        return prisma.specialisation.findMany();

      case 'domaines':
        return prisma.domaine.findMany();

      case 'traducteurs':
        return prisma.traducteur.findMany();

      // Tables de jonction normalisées
      case 'traducteurSpecialisations':
        return prisma.traducteurSpecialisation.findMany();

      case 'traducteurDomaines':
        return prisma.traducteurDomaine.findMany();

      case 'traducteurDivisions':
        return prisma.traducteurDivision.findMany();

      case 'traducteurClients':
        return prisma.traducteurClient.findMany();

      case 'pairesLinguistiques':
        return prisma.paireLinguistique.findMany();

      case 'liaisonReviseurs':
        return prisma.liaisonReviseur.findMany();

      case 'clients':
        return prisma.client.findMany();

      case 'sousDomaines':
        return prisma.sousDomaine.findMany();

      case 'taches':
        return prisma.tache.findMany();

      case 'historiqueTaches':
        return prisma.historiqueTache.findMany();

      case 'ajustementsTemps':
        return prisma.ajustementTemps.findMany();

      case 'notifications':
        return prisma.notification.findMany();

      case 'joursFeries':
        return prisma.jourFerie.findMany();

      case 'equipesProjet':
        return prisma.equipeProjet.findMany();

      case 'equipeProjetMembres':
        return prisma.equipeProjetMembre.findMany();

      case 'equipesConseiller':
        return prisma.equipeConseiller.findMany();

      case 'equipesConseillerMembres':
        return prisma.equipeConseillerMembre.findMany();

      case 'demandesRessources':
        return prisma.demandeRessource.findMany();

      case 'interetsDemandes':
        return prisma.interetDemande.findMany();

      case 'notes':
        return prisma.note.findMany();

      case 'piecesJointes':
        return prisma.pieceJointe.findMany();

      case 'sessions':
        return prisma.session.findMany();

      case 'auditLogs':
        return prisma.auditLog.findMany();

      default:
        return [];
    }
  }

  /**
   * Obtenir les statistiques actuelles de la base
   */
  async getStatistiques(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    for (const table of TABLES_EXPORT_ORDER) {
      try {
        counts[table] = await this.countTable(table);
      } catch {
        counts[table] = 0;
      }
    }

    return counts;
  }

  /**
   * Compter les enregistrements d'une table
   */
  private async countTable(table: TableName): Promise<number> {
    switch (table) {
      case 'utilisateurs': return prisma.utilisateur.count();
      case 'divisions': return prisma.division.count();
      case 'divisionAccess': return prisma.divisionAccess.count();
      case 'equipeProjetAccess': return prisma.equipeProjetAccess.count();
      // Nouveaux référentiels normalisés
      case 'langues': return prisma.langue.count();
      case 'specialisations': return prisma.specialisation.count();
      case 'domaines': return prisma.domaine.count();
      case 'traducteurs': return prisma.traducteur.count();
      // Tables de jonction normalisées
      case 'traducteurSpecialisations': return prisma.traducteurSpecialisation.count();
      case 'traducteurDomaines': return prisma.traducteurDomaine.count();
      case 'traducteurDivisions': return prisma.traducteurDivision.count();
      case 'traducteurClients': return prisma.traducteurClient.count();
      case 'pairesLinguistiques': return prisma.paireLinguistique.count();
      case 'liaisonReviseurs': return prisma.liaisonReviseur.count();
      case 'clients': return prisma.client.count();
      case 'sousDomaines': return prisma.sousDomaine.count();
      case 'taches': return prisma.tache.count();
      case 'historiqueTaches': return prisma.historiqueTache.count();
      case 'ajustementsTemps': return prisma.ajustementTemps.count();
      case 'notifications': return prisma.notification.count();
      case 'joursFeries': return prisma.jourFerie.count();
      case 'equipesProjet': return prisma.equipeProjet.count();
      case 'equipeProjetMembres': return prisma.equipeProjetMembre.count();
      case 'equipesConseiller': return prisma.equipeConseiller.count();
      case 'equipesConseillerMembres': return prisma.equipeConseillerMembre.count();
      case 'demandesRessources': return prisma.demandeRessource.count();
      case 'interetsDemandes': return prisma.interetDemande.count();
      case 'notes': return prisma.note.count();
      case 'piecesJointes': return prisma.pieceJointe.count();
      case 'sessions': return prisma.session.count();
      case 'auditLogs': return prisma.auditLog.count();
      default: return 0;
    }
  }

  /**
   * Valider un fichier de backup avant restauration
   */
  validateBackup(backup: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!backup || typeof backup !== 'object') {
      return { valid: false, errors: ['Format de backup invalide'] };
    }

    const data = backup as Record<string, unknown>;

    // Vérifier les métadonnées
    if (!data.metadata || typeof data.metadata !== 'object') {
      errors.push('Métadonnées manquantes');
    } else {
      const meta = data.metadata as Record<string, unknown>;
      if (!meta.version) errors.push('Version manquante dans les métadonnées');
      if (!meta.createdAt) errors.push('Date de création manquante');
      if (!meta.tables || !Array.isArray(meta.tables)) errors.push('Liste des tables manquante');
    }

    // Vérifier les données
    if (!data.data || typeof data.data !== 'object') {
      errors.push('Données manquantes');
    } else {
      const tables = data.data as Record<string, unknown>;
      for (const [tableName, records] of Object.entries(tables)) {
        if (!Array.isArray(records)) {
          errors.push(`Table ${tableName}: format invalide (doit être un tableau)`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Restaurer la base depuis un backup
   * ATTENTION: Cette opération est destructive!
   */
  async restoreDatabase(
    backup: BackupData,
    utilisateurId: string,
    options: {
      skipTables?: string[];
      clearExisting?: boolean;
    } = {}
  ): Promise<RestoreResult> {
    console.log('[BackupService] Démarrage restauration...');
    
    const { skipTables = [], clearExisting = true } = options;
    const result: RestoreResult = {
      success: true,
      tablesRestored: [],
      errors: [],
      counts: {},
    };

    // Validation préalable
    const validation = this.validateBackup(backup);
    if (!validation.valid) {
      return {
        success: false,
        tablesRestored: [],
        errors: validation.errors,
        counts: {},
      };
    }

    // Ordre inverse pour la suppression (respecter les FK)
    const deleteOrder = [...TABLES_EXPORT_ORDER].reverse();

    try {
      // Supprimer les données existantes si demandé
      if (clearExisting) {
        console.log('[BackupService] Suppression des données existantes...');
        for (const table of deleteOrder) {
          if (skipTables.includes(table)) continue;
          try {
            await this.clearTable(table);
            console.log(`  ✓ ${table}: vidé`);
          } catch (error: any) {
            console.error(`  ✗ ${table}: ${error.message}`);
          }
        }
      }

      // Restaurer dans l'ordre des dépendances
      console.log('[BackupService] Restauration des données...');
      for (const table of TABLES_EXPORT_ORDER) {
        if (skipTables.includes(table)) {
          console.log(`  ⊘ ${table}: ignoré`);
          continue;
        }

        const records = backup.data[table];
        if (!records || !Array.isArray(records) || records.length === 0) {
          result.counts[table] = { imported: 0, errors: 0 };
          continue;
        }

        try {
          const imported = await this.restoreTable(table, records);
          result.tablesRestored.push(table);
          result.counts[table] = { imported, errors: 0 };
          console.log(`  ✓ ${table}: ${imported} enregistrements restaurés`);
        } catch (error: any) {
          result.errors.push(`${table}: ${error.message}`);
          result.counts[table] = { imported: 0, errors: records.length };
          console.error(`  ✗ ${table}: ${error.message}`);
        }
      }

      // Logger l'action d'audit
      await auditService.log({
        utilisateurId,
        action: 'IMPORT_DONNEES',
        entite: 'Backup',
        details: {
          type: 'restore_complet',
          backupDate: backup.metadata.createdAt,
          backupVersion: backup.metadata.version,
          tablesRestaurees: result.tablesRestored.length,
          erreurs: result.errors.length,
        },
      });

      result.success = result.errors.length === 0;
      console.log('[BackupService] Restauration terminée');

    } catch (error: any) {
      result.success = false;
      result.errors.push(`Erreur globale: ${error.message}`);
    }

    return result;
  }

  /**
   * Vider une table
   */
  private async clearTable(table: TableName): Promise<void> {
    switch (table) {
      case 'utilisateurs': await prisma.utilisateur.deleteMany(); break;
      case 'divisions': await prisma.division.deleteMany(); break;
      case 'divisionAccess': await prisma.divisionAccess.deleteMany(); break;
      case 'equipeProjetAccess': await prisma.equipeProjetAccess.deleteMany(); break;
      // Nouveaux référentiels normalisés
      case 'langues': await prisma.langue.deleteMany(); break;
      case 'specialisations': await prisma.specialisation.deleteMany(); break;
      case 'domaines': await prisma.domaine.deleteMany(); break;
      case 'traducteurs': await prisma.traducteur.deleteMany(); break;
      // Tables de jonction normalisées
      case 'traducteurSpecialisations': await prisma.traducteurSpecialisation.deleteMany(); break;
      case 'traducteurDomaines': await prisma.traducteurDomaine.deleteMany(); break;
      case 'traducteurDivisions': await prisma.traducteurDivision.deleteMany(); break;
      case 'traducteurClients': await prisma.traducteurClient.deleteMany(); break;
      case 'pairesLinguistiques': await prisma.paireLinguistique.deleteMany(); break;
      case 'liaisonReviseurs': await prisma.liaisonReviseur.deleteMany(); break;
      case 'clients': await prisma.client.deleteMany(); break;
      case 'sousDomaines': await prisma.sousDomaine.deleteMany(); break;
      case 'taches': await prisma.tache.deleteMany(); break;
      case 'historiqueTaches': await prisma.historiqueTache.deleteMany(); break;
      case 'ajustementsTemps': await prisma.ajustementTemps.deleteMany(); break;
      case 'notifications': await prisma.notification.deleteMany(); break;
      case 'joursFeries': await prisma.jourFerie.deleteMany(); break;
      case 'equipesProjet': await prisma.equipeProjet.deleteMany(); break;
      case 'equipeProjetMembres': await prisma.equipeProjetMembre.deleteMany(); break;
      case 'equipesConseiller': await prisma.equipeConseiller.deleteMany(); break;
      case 'equipesConseillerMembres': await prisma.equipeConseillerMembre.deleteMany(); break;
      case 'demandesRessources': await prisma.demandeRessource.deleteMany(); break;
      case 'interetsDemandes': await prisma.interetDemande.deleteMany(); break;
      case 'notes': await prisma.note.deleteMany(); break;
      case 'piecesJointes': await prisma.pieceJointe.deleteMany(); break;
      case 'sessions': await prisma.session.deleteMany(); break;
      case 'auditLogs': await prisma.auditLog.deleteMany(); break;
    }
  }

  /**
   * Restaurer les données d'une table
   */
  private async restoreTable(table: TableName, records: unknown[]): Promise<number> {
    let imported = 0;

    // Convertir les dates string en objets Date
    const processedRecords = records.map(record => this.processRecordDates(record));

    switch (table) {
      case 'utilisateurs':
        for (const record of processedRecords) {
          await prisma.utilisateur.create({ data: record as any });
          imported++;
        }
        break;

      case 'divisions':
        for (const record of processedRecords) {
          await prisma.division.create({ data: record as any });
          imported++;
        }
        break;

      case 'divisionAccess':
        for (const record of processedRecords) {
          await prisma.divisionAccess.create({ data: record as any });
          imported++;
        }
        break;

      case 'equipeProjetAccess':
        for (const record of processedRecords) {
          await prisma.equipeProjetAccess.create({ data: record as any });
          imported++;
        }
        break;

      // Nouveaux référentiels normalisés
      case 'langues':
        for (const record of processedRecords) {
          await prisma.langue.create({ data: record as any });
          imported++;
        }
        break;

      case 'specialisations':
        for (const record of processedRecords) {
          await prisma.specialisation.create({ data: record as any });
          imported++;
        }
        break;

      case 'domaines':
        for (const record of processedRecords) {
          await prisma.domaine.create({ data: record as any });
          imported++;
        }
        break;

      case 'traducteurs':
        for (const record of processedRecords) {
          await prisma.traducteur.create({ data: record as any });
          imported++;
        }
        break;

      // Tables de jonction normalisées
      case 'traducteurSpecialisations':
        for (const record of processedRecords) {
          await prisma.traducteurSpecialisation.create({ data: record as any });
          imported++;
        }
        break;

      case 'traducteurDomaines':
        for (const record of processedRecords) {
          await prisma.traducteurDomaine.create({ data: record as any });
          imported++;
        }
        break;

      case 'traducteurDivisions':
        for (const record of processedRecords) {
          await prisma.traducteurDivision.create({ data: record as any });
          imported++;
        }
        break;

      case 'traducteurClients':
        for (const record of processedRecords) {
          await prisma.traducteurClient.create({ data: record as any });
          imported++;
        }
        break;

      case 'pairesLinguistiques':
        for (const record of processedRecords) {
          await prisma.paireLinguistique.create({ data: record as any });
          imported++;
        }
        break;

      case 'liaisonReviseurs':
        for (const record of processedRecords) {
          await prisma.liaisonReviseur.create({ data: record as any });
          imported++;
        }
        break;

      case 'clients':
        for (const record of processedRecords) {
          await prisma.client.create({ data: record as any });
          imported++;
        }
        break;

      case 'sousDomaines':
        for (const record of processedRecords) {
          await prisma.sousDomaine.create({ data: record as any });
          imported++;
        }
        break;

      case 'taches':
        for (const record of processedRecords) {
          await prisma.tache.create({ data: record as any });
          imported++;
        }
        break;

      case 'historiqueTaches':
        for (const record of processedRecords) {
          await prisma.historiqueTache.create({ data: record as any });
          imported++;
        }
        break;

      case 'ajustementsTemps':
        for (const record of processedRecords) {
          await prisma.ajustementTemps.create({ data: record as any });
          imported++;
        }
        break;

      case 'notifications':
        for (const record of processedRecords) {
          await prisma.notification.create({ data: record as any });
          imported++;
        }
        break;

      case 'joursFeries':
        for (const record of processedRecords) {
          await prisma.jourFerie.create({ data: record as any });
          imported++;
        }
        break;

      case 'equipesProjet':
        for (const record of processedRecords) {
          await prisma.equipeProjet.create({ data: record as any });
          imported++;
        }
        break;

      case 'equipeProjetMembres':
        for (const record of processedRecords) {
          await prisma.equipeProjetMembre.create({ data: record as any });
          imported++;
        }
        break;

      case 'equipesConseiller':
        for (const record of processedRecords) {
          await prisma.equipeConseiller.create({ data: record as any });
          imported++;
        }
        break;

      case 'equipesConseillerMembres':
        for (const record of processedRecords) {
          await prisma.equipeConseillerMembre.create({ data: record as any });
          imported++;
        }
        break;

      case 'demandesRessources':
        for (const record of processedRecords) {
          await prisma.demandeRessource.create({ data: record as any });
          imported++;
        }
        break;

      case 'interetsDemandes':
        for (const record of processedRecords) {
          await prisma.interetDemande.create({ data: record as any });
          imported++;
        }
        break;

      case 'notes':
        for (const record of processedRecords) {
          await prisma.note.create({ data: record as any });
          imported++;
        }
        break;

      case 'piecesJointes':
        for (const record of processedRecords) {
          await prisma.pieceJointe.create({ data: record as any });
          imported++;
        }
        break;

      case 'sessions':
        for (const record of processedRecords) {
          await prisma.session.create({ data: record as any });
          imported++;
        }
        break;

      case 'auditLogs':
        for (const record of processedRecords) {
          await prisma.auditLog.create({ data: record as any });
          imported++;
        }
        break;
    }

    return imported;
  }

  /**
   * Convertir les champs date string en objets Date
   */
  private processRecordDates(record: unknown): unknown {
    if (!record || typeof record !== 'object') return record;

    const processed = { ...record as Record<string, unknown> };
    const dateFields = [
      'creeLe', 'modifieLe', 'dateDebut', 'dateFin', 'dateEcheance',
      'dernierAcces', 'expireA', 'lueLe', 'date', 'supprimeLe',
    ];

    for (const field of dateFields) {
      if (processed[field] && typeof processed[field] === 'string') {
        processed[field] = new Date(processed[field] as string);
      }
    }

    return processed;
  }

  /**
   * Exporter une table spécifique uniquement
   */
  async exportSingleTable(tableName: string, utilisateurId: string): Promise<{ data: unknown[]; count: number }> {
    if (!TABLES_EXPORT_ORDER.includes(tableName as TableName)) {
      throw new Error(`Table inconnue: ${tableName}`);
    }

    const data = await this.exportTableData(tableName as TableName);
    
    await auditService.log({
      utilisateurId,
      action: 'EXPORT_DONNEES',
      entite: 'Backup',
      details: { 
        type: 'export_table',
        table: tableName,
        count: data.length,
      },
    });

    return { data, count: data.length };
  }

  /**
   * Obtenir la liste des tables disponibles
   */
  getTables(): string[] {
    return TABLES_EXPORT_ORDER.slice();
  }
}

export const backupService = new BackupService();
export default backupService;
