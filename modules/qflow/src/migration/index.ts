/**
 * Migration Module Index
 * 
 * Exports all migration-related components for n8n to Qflow migration
 */

export { N8nWorkflowImporter } from './N8nWorkflowImporter';
export { CompatibilityLayer } from './CompatibilityLayer';
export { MigrationValidator } from './MigrationValidator';
export { MigrationCLI } from './MigrationCLI';

export type {
  N8nWorkflow,
  N8nNode,
  N8nConnections,
  N8nSettings,
  MigrationOptions,
  MigrationResult,
  MigrationWarning,
  MigrationError,
  MigrationTestCase
} from './N8nWorkflowImporter';

export type {
  CompatibilityConfig,
  N8nExecutionData,
  N8nNodeExecutionData,
  QflowExecutionContext,
  CredentialMapping,
  DataFormatTranslation
} from './CompatibilityLayer';

export type {
  ValidationConfig,
  ValidationReport,
  StructuralValidationResult,
  SemanticValidationResult,
  PerformanceValidationResult,
  SecurityValidationResult,
  CompatibilityValidationResult,
  ValidationIssue,
  TestExecutionResult,
  MigrationTestSuite
} from './MigrationValidator';

export type {
  CLIOptions,
  MigrationConfig
} from './MigrationCLI';