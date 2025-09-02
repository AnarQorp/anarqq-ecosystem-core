/**
 * Schema Migration - Defines how to migrate between schema versions
 */
export interface SchemaMigration {
  /** Source schema version */
  fromVersion: string;
  /** Target schema version */
  toVersion: string;
  /** Migration function that transforms old events to new format */
  transformFunction: (oldEvent: any) => any;
  /** JSON Schema for validating the transformed result */
  validationRules: any; // JSONSchema7
  /** Whether this migration supports rollback */
  rollbackSupport: boolean;
  /** Rollback function (if supported) */
  rollbackFunction?: (newEvent: any) => any;
  /** Migration metadata */
  metadata: {
    /** Migration description */
    description: string;
    /** Migration author */
    author: string;
    /** When migration was created */
    createdAt: string;
    /** Breaking changes introduced */
    breakingChanges: string[];
    /** Migration notes */
    notes?: string;
  };
}

/**
 * Migration Plan - Defines a sequence of migrations to reach target version
 */
export interface MigrationPlan {
  /** Source version */
  fromVersion: string;
  /** Target version */
  toVersion: string;
  /** Ordered list of migrations to apply */
  migrations: SchemaMigration[];
  /** Estimated migration time */
  estimatedDuration?: string;
  /** Migration risks and considerations */
  risks?: string[];
}

/**
 * Migration Result - Result of applying a migration
 */
export interface MigrationResult {
  /** Whether migration was successful */
  success: boolean;
  /** Source version */
  fromVersion: string;
  /** Target version */
  toVersion: string;
  /** Number of events migrated */
  eventsProcessed: number;
  /** Number of events that failed migration */
  eventsFailed: number;
  /** Migration duration in milliseconds */
  durationMs: number;
  /** Error details (if any) */
  errors?: Array<{
    eventId: string;
    error: string;
    originalEvent?: any;
  }>;
  /** Migration metadata */
  metadata: {
    /** When migration started */
    startedAt: string;
    /** When migration completed */
    completedAt: string;
    /** Migration executor */
    executor: string;
  };
}

/**
 * Validates a SchemaMigration object
 */
export function isValidSchemaMigration(migration: any): migration is SchemaMigration {
  return (
    typeof migration === 'object' &&
    migration !== null &&
    typeof migration.fromVersion === 'string' &&
    migration.fromVersion.length > 0 &&
    typeof migration.toVersion === 'string' &&
    migration.toVersion.length > 0 &&
    typeof migration.transformFunction === 'function' &&
    typeof migration.validationRules === 'object' &&
    migration.validationRules !== null &&
    typeof migration.rollbackSupport === 'boolean' &&
    (migration.rollbackFunction === undefined || typeof migration.rollbackFunction === 'function') &&
    typeof migration.metadata === 'object' &&
    migration.metadata !== null &&
    typeof migration.metadata.description === 'string' &&
    typeof migration.metadata.author === 'string' &&
    typeof migration.metadata.createdAt === 'string' &&
    Array.isArray(migration.metadata.breakingChanges)
  );
}