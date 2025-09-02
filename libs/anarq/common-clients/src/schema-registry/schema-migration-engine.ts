import {
  SchemaMigration,
  MigrationPlan,
  MigrationResult,
  EventEnvelope
} from '@anarq/common-schemas';
import { schemaRegistry } from './schema-registry';

/**
 * Schema Migration Engine - Handles complex schema migrations and evolution
 */
export class SchemaMigrationEngine {
  private migrationHistory: MigrationResult[] = [];

  /**
   * Migrates a single event to a target version
   */
  async migrateEvent(
    event: EventEnvelope,
    targetVersion: string
  ): Promise<{
    success: boolean;
    migratedEvent?: EventEnvelope;
    errors?: string[];
  }> {
    try {
      const currentVersion = event.schemaVersion;
      
      if (currentVersion === targetVersion) {
        return {
          success: true,
          migratedEvent: event
        };
      }

      const plan = schemaRegistry.createMigrationPlan(currentVersion, targetVersion);
      if (!plan) {
        return {
          success: false,
          errors: [`No migration path found from ${currentVersion} to ${targetVersion}`]
        };
      }

      let migratedEvent = { ...event };
      
      // Apply migrations in sequence
      for (const migration of plan.migrations) {
        migratedEvent.payload = migration.transformFunction(migratedEvent.payload);
        migratedEvent.schemaVersion = migration.toVersion;
      }

      return {
        success: true,
        migratedEvent
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Migration failed']
      };
    }
  }

  /**
   * Migrates a batch of events
   */
  async migrateBatch(
    events: EventEnvelope[],
    targetVersion: string,
    options?: {
      batchSize?: number;
      continueOnError?: boolean;
      progressCallback?: (processed: number, total: number) => void;
    }
  ): Promise<{
    success: boolean;
    migratedEvents: EventEnvelope[];
    errors: Array<{
      eventId: string;
      error: string;
    }>;
  }> {
    const batchSize = options?.batchSize || 100;
    const continueOnError = options?.continueOnError ?? true;
    const migratedEvents: EventEnvelope[] = [];
    const errors: Array<{ eventId: string; error: string }> = [];

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      
      for (const event of batch) {
        try {
          const result = await this.migrateEvent(event, targetVersion);
          
          if (result.success && result.migratedEvent) {
            migratedEvents.push(result.migratedEvent);
          } else {
            errors.push({
              eventId: event.id,
              error: result.errors?.join(', ') || 'Unknown error'
            });
            
            if (!continueOnError) {
              return {
                success: false,
                migratedEvents,
                errors
              };
            }
          }
        } catch (error) {
          errors.push({
            eventId: event.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          if (!continueOnError) {
            return {
              success: false,
              migratedEvents,
              errors
            };
          }
        }
      }

      // Report progress
      if (options?.progressCallback) {
        options.progressCallback(Math.min(i + batchSize, events.length), events.length);
      }
    }

    return {
      success: errors.length === 0,
      migratedEvents,
      errors
    };
  }

  /**
   * Creates a custom migration between two schema versions
   */
  createMigration(
    fromVersion: string,
    toVersion: string,
    transformFunction: (oldEvent: any) => any,
    options?: {
      description?: string;
      author?: string;
      breakingChanges?: string[];
      rollbackFunction?: (newEvent: any) => any;
      notes?: string;
    }
  ): SchemaMigration {
    return {
      fromVersion,
      toVersion,
      transformFunction,
      validationRules: {}, // Would be populated with actual validation schema
      rollbackSupport: !!options?.rollbackFunction,
      rollbackFunction: options?.rollbackFunction,
      metadata: {
        description: options?.description || `Migration from ${fromVersion} to ${toVersion}`,
        author: options?.author || 'system',
        createdAt: new Date().toISOString(),
        breakingChanges: options?.breakingChanges || [],
        notes: options?.notes
      }
    };
  }

  /**
   * Tests a migration without applying it
   */
  async testMigration(
    migration: SchemaMigration,
    testEvents: any[]
  ): Promise<{
    success: boolean;
    results: Array<{
      original: any;
      migrated?: any;
      error?: string;
    }>;
  }> {
    const results: Array<{
      original: any;
      migrated?: any;
      error?: string;
    }> = [];

    let success = true;

    for (const event of testEvents) {
      try {
        const migrated = migration.transformFunction(event);
        results.push({
          original: event,
          migrated
        });
      } catch (error) {
        success = false;
        results.push({
          original: event,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { success, results };
  }

  /**
   * Rollback a migration (if supported)
   */
  async rollbackMigration(
    migration: SchemaMigration,
    migratedEvents: any[]
  ): Promise<{
    success: boolean;
    rolledBackEvents?: any[];
    errors?: string[];
  }> {
    if (!migration.rollbackSupport || !migration.rollbackFunction) {
      return {
        success: false,
        errors: ['Migration does not support rollback']
      };
    }

    try {
      const rolledBackEvents = migratedEvents.map(event => 
        migration.rollbackFunction!(event)
      );

      return {
        success: true,
        rolledBackEvents
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Rollback failed']
      };
    }
  }

  /**
   * Gets migration history
   */
  getMigrationHistory(): MigrationResult[] {
    return [...this.migrationHistory];
  }

  /**
   * Records a migration result
   */
  recordMigrationResult(result: MigrationResult): void {
    this.migrationHistory.push(result);
    
    // Keep only last 100 migration results
    if (this.migrationHistory.length > 100) {
      this.migrationHistory.shift();
    }
  }

  /**
   * Validates migration compatibility
   */
  validateMigrationCompatibility(
    fromVersion: string,
    toVersion: string
  ): {
    compatible: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Extract version numbers
    const fromVersionNum = parseInt(fromVersion.replace('v', ''));
    const toVersionNum = parseInt(toVersion.replace('v', ''));

    // Check for major version jumps
    if (toVersionNum - fromVersionNum > 1) {
      warnings.push('Migrating across multiple major versions may have compatibility issues');
    }

    // Check for backward migration
    if (toVersionNum < fromVersionNum) {
      warnings.push('Backward migration may result in data loss');
    }

    return {
      compatible: errors.length === 0,
      warnings,
      errors
    };
  }
}

// Global migration engine instance
export const schemaMigrationEngine = new SchemaMigrationEngine();