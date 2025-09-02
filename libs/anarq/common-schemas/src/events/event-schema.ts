import { JSONSchema7 } from 'json-schema';

/**
 * Event Schema - Defines the structure and metadata for an event type
 */
export interface EventSchema {
  /** Event topic following q.<module>.<action>.<version> convention */
  topic: string;
  /** Schema version */
  version: string;
  /** JSON Schema definition for the event payload */
  schema: JSONSchema7;
  /** Compatibility mode for schema evolution */
  compatibility: 'BACKWARD' | 'FORWARD' | 'FULL' | 'NONE';
  /** Whether this schema version is deprecated */
  deprecated: boolean;
  /** Date when schema was deprecated (ISO 8601) */
  deprecationDate?: string;
  /** Path to migration documentation or tools */
  migrationPath?: string;
  /** Human-readable description of the event */
  description?: string;
  /** Examples of valid event payloads */
  examples?: any[];
}

/**
 * Validates an EventSchema object
 */
export function isValidEventSchema(schema: any): schema is EventSchema {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    typeof schema.topic === 'string' &&
    /^q\.[a-z]+\.[a-z]+\.v\d+$/.test(schema.topic) &&
    typeof schema.version === 'string' &&
    schema.version.length > 0 &&
    typeof schema.schema === 'object' &&
    schema.schema !== null &&
    ['BACKWARD', 'FORWARD', 'FULL', 'NONE'].includes(schema.compatibility) &&
    typeof schema.deprecated === 'boolean' &&
    (schema.deprecationDate === undefined || typeof schema.deprecationDate === 'string') &&
    (schema.migrationPath === undefined || typeof schema.migrationPath === 'string') &&
    (schema.description === undefined || typeof schema.description === 'string') &&
    (schema.examples === undefined || Array.isArray(schema.examples))
  );
}

/**
 * Parses a topic string into its components
 */
export function parseEventTopic(topic: string): {
  module: string;
  action: string;
  version: string;
} | null {
  const match = topic.match(/^q\.([a-z]+)\.([a-z]+)\.v(\d+)$/);
  if (!match) {
    return null;
  }
  
  return {
    module: match[1],
    action: match[2],
    version: match[3]
  };
}

/**
 * Creates a topic string from components
 */
export function createEventTopic(module: string, action: string, version: number): string {
  return `q.${module}.${action}.v${version}`;
}