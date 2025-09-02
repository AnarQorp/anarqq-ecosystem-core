import {
  EventSchema,
  SchemaMigration,
  MigrationPlan,
  MigrationResult,
  eventValidator,
  parseEventTopic,
  createEventTopic
} from '@anarq/common-schemas';

/**
 * Schema Registry - Manages event schemas and their evolution
 */
export class SchemaRegistry {
  private schemas: Map<string, EventSchema> = new Map();
  private migrations: Map<string, SchemaMigration[]> = new Map();
  private deprecationSchedule: Map<string, Date> = new Map();

  /**
   * Registers a new event schema
   */
  registerSchema(schema: EventSchema): {
    success: boolean;
    errors?: string[];
  } {
    try {
      // Validate schema structure
      if (!this.isValidSchema(schema)) {
        return {
          success: false,
          errors: ['Invalid schema structure']
        };
      }

      // Check for conflicts
      const existingSchema = this.getSchema(schema.topic, schema.version);
      if (existingSchema && !this.schemasEqual(existingSchema, schema)) {
        return {
          success: false,
          errors: [`Schema ${schema.topic}:${schema.version} already exists with different definition`]
        };
      }

      // Register with event validator
      eventValidator.registerSchema(schema);

      // Store in registry
      const key = `${schema.topic}:${schema.version}`;
      this.schemas.set(key, schema);

      // Handle deprecation
      if (schema.deprecated && schema.deprecationDate) {
        this.deprecationSchedule.set(key, new Date(schema.deprecationDate));
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Gets a schema by topic and version
   */
  getSchema(topic: string, version: string): EventSchema | undefined {
    const key = `${topic}:${version}`;
    return this.schemas.get(key);
  }

  /**
   * Lists all schemas for a topic
   */
  getSchemaVersions(topic: string): EventSchema[] {
    const schemas: EventSchema[] = [];
    for (const [key, schema] of this.schemas) {
      if (schema.topic === topic) {
        schemas.push(schema);
      }
    }
    return schemas.sort((a, b) => {
      const aVersion = parseInt(a.version.replace('v', ''));
      const bVersion = parseInt(b.version.replace('v', ''));
      return aVersion - bVersion;
    });
  }

  /**
   * Lists all schemas for a module
   */
  getModuleSchemas(module: string): EventSchema[] {
    const schemas: EventSchema[] = [];
    for (const schema of this.schemas.values()) {
      const parsed = parseEventTopic(schema.topic);
      if (parsed && parsed.module === module) {
        schemas.push(schema);
      }
    }
    return schemas;
  }

  /**
   * Gets the latest version of a schema
   */
  getLatestSchema(topic: string): EventSchema | undefined {
    const versions = this.getSchemaVersions(topic);
    return versions.length > 0 ? versions[versions.length - 1] : undefined;
  }

  /**
   * Registers a schema migration
   */
  registerMigration(migration: SchemaMigration): {
    success: boolean;
    errors?: string[];
  } {
    try {
      // Validate migration
      if (!this.isValidMigration(migration)) {
        return {
          success: false,
          errors: ['Invalid migration structure']
        };
      }

      // Check that source and target schemas exist
      const fromSchema = this.getSchemaByVersion(migration.fromVersion);
      const toSchema = this.getSchemaByVersion(migration.toVersion);

      if (!fromSchema || !toSchema) {
        return {
          success: false,
          errors: ['Source or target schema not found']
        };
      }

      // Store migration
      const key = `${migration.fromVersion}->${migration.toVersion}`;
      const migrations = this.migrations.get(key) || [];
      migrations.push(migration);
      this.migrations.set(key, migrations);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Creates a migration plan between two versions
   */
  createMigrationPlan(fromVersion: string, toVersion: string): MigrationPlan | null {
    // Simple direct migration for now
    // In a real implementation, this would find the optimal path through multiple versions
    const key = `${fromVersion}->${toVersion}`;
    const migrations = this.migrations.get(key);

    if (!migrations || migrations.length === 0) {
      return null;
    }

    return {
      fromVersion,
      toVersion,
      migrations,
      estimatedDuration: this.estimateMigrationDuration(migrations),
      risks: this.assessMigrationRisks(migrations)
    };
  }

  /**
   * Executes a migration plan
   */
  async executeMigration(
    plan: MigrationPlan,
    events: any[],
    options?: {
      dryRun?: boolean;
      batchSize?: number;
    }
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: true,
      fromVersion: plan.fromVersion,
      toVersion: plan.toVersion,
      eventsProcessed: 0,
      eventsFailed: 0,
      durationMs: 0,
      errors: [],
      metadata: {
        startedAt: new Date().toISOString(),
        completedAt: '',
        executor: 'schema-registry'
      }
    };

    try {
      const batchSize = options?.batchSize || 100;
      
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        
        for (const event of batch) {
          try {
            let migratedEvent = event;
            
            // Apply each migration in sequence
            for (const migration of plan.migrations) {
              migratedEvent = migration.transformFunction(migratedEvent);
              
              // Validate transformed event
              const validation = eventValidator.validateEvent(migratedEvent);
              if (!validation.valid) {
                throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
              }
            }
            
            result.eventsProcessed++;
            
            // In a real implementation, we'd persist the migrated event
            if (!options?.dryRun) {
              // Persist migrated event
            }
          } catch (error) {
            result.eventsFailed++;
            result.errors?.push({
              eventId: event.id || 'unknown',
              error: error instanceof Error ? error.message : 'Unknown error',
              originalEvent: event
            });
          }
        }
      }
    } catch (error) {
      result.success = false;
      result.errors?.push({
        eventId: 'migration',
        error: error instanceof Error ? error.message : 'Migration failed'
      });
    }

    result.durationMs = Date.now() - startTime;
    result.metadata.completedAt = new Date().toISOString();

    return result;
  }

  /**
   * Deprecates a schema version
   */
  deprecateSchema(
    topic: string,
    version: string,
    deprecationDate: Date,
    migrationPath?: string
  ): {
    success: boolean;
    errors?: string[];
  } {
    const schema = this.getSchema(topic, version);
    if (!schema) {
      return {
        success: false,
        errors: ['Schema not found']
      };
    }

    // Update schema
    const updatedSchema: EventSchema = {
      ...schema,
      deprecated: true,
      deprecationDate: deprecationDate.toISOString(),
      migrationPath
    };

    // Re-register updated schema
    const key = `${topic}:${version}`;
    this.schemas.set(key, updatedSchema);
    this.deprecationSchedule.set(key, deprecationDate);

    return { success: true };
  }

  /**
   * Gets deprecated schemas
   */
  getDeprecatedSchemas(): Array<{
    schema: EventSchema;
    deprecationDate: Date;
  }> {
    const deprecated: Array<{ schema: EventSchema; deprecationDate: Date }> = [];
    
    for (const [key, date] of this.deprecationSchedule) {
      const schema = this.schemas.get(key);
      if (schema) {
        deprecated.push({ schema, deprecationDate: date });
      }
    }

    return deprecated.sort((a, b) => a.deprecationDate.getTime() - b.deprecationDate.getTime());
  }

  /**
   * Gets registry statistics
   */
  getStats(): {
    totalSchemas: number;
    schemasByModule: Record<string, number>;
    deprecatedSchemas: number;
    totalMigrations: number;
  } {
    const schemasByModule: Record<string, number> = {};
    let deprecatedCount = 0;

    for (const schema of this.schemas.values()) {
      const parsed = parseEventTopic(schema.topic);
      if (parsed) {
        schemasByModule[parsed.module] = (schemasByModule[parsed.module] || 0) + 1;
      }
      
      if (schema.deprecated) {
        deprecatedCount++;
      }
    }

    return {
      totalSchemas: this.schemas.size,
      schemasByModule,
      deprecatedSchemas: deprecatedCount,
      totalMigrations: this.migrations.size
    };
  }

  private isValidSchema(schema: EventSchema): boolean {
    return (
      typeof schema.topic === 'string' &&
      /^q\.[a-z]+\.[a-z]+\.v\d+$/.test(schema.topic) &&
      typeof schema.version === 'string' &&
      typeof schema.schema === 'object' &&
      ['BACKWARD', 'FORWARD', 'FULL', 'NONE'].includes(schema.compatibility) &&
      typeof schema.deprecated === 'boolean'
    );
  }

  private isValidMigration(migration: SchemaMigration): boolean {
    return (
      typeof migration.fromVersion === 'string' &&
      typeof migration.toVersion === 'string' &&
      typeof migration.transformFunction === 'function' &&
      typeof migration.rollbackSupport === 'boolean' &&
      typeof migration.metadata === 'object'
    );
  }

  private schemasEqual(a: EventSchema, b: EventSchema): boolean {
    return JSON.stringify(a.schema) === JSON.stringify(b.schema);
  }

  private getSchemaByVersion(version: string): EventSchema | undefined {
    for (const schema of this.schemas.values()) {
      if (schema.version === version) {
        return schema;
      }
    }
    return undefined;
  }

  private estimateMigrationDuration(migrations: SchemaMigration[]): string {
    // Simple estimation based on number of migrations
    const minutes = migrations.length * 5; // 5 minutes per migration
    return `PT${minutes}M`;
  }

  private assessMigrationRisks(migrations: SchemaMigration[]): string[] {
    const risks: string[] = [];
    
    for (const migration of migrations) {
      if (migration.metadata.breakingChanges.length > 0) {
        risks.push(`Breaking changes in ${migration.fromVersion} -> ${migration.toVersion}`);
      }
      
      if (!migration.rollbackSupport) {
        risks.push(`No rollback support for ${migration.fromVersion} -> ${migration.toVersion}`);
      }
    }

    return risks;
  }
}

// Global schema registry instance
export const schemaRegistry = new SchemaRegistry();