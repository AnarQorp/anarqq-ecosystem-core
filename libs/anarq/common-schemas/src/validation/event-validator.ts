import { EventEnvelope, EventSchema } from '../events';
import { schemaValidator } from './schema-validator';

/**
 * Event Validator - Validates events against their schemas
 */
export class EventValidator {
  private schemas: Map<string, EventSchema> = new Map();

  /**
   * Registers an event schema
   */
  registerSchema(schema: EventSchema): void {
    const key = `${schema.topic}:${schema.version}`;
    this.schemas.set(key, schema);
    
    // Add to AJV validator
    schemaValidator.addSchema(schema.schema, key);
  }

  /**
   * Gets a registered schema
   */
  getSchema(topic: string, version: string): EventSchema | undefined {
    const key = `${topic}:${version}`;
    return this.schemas.get(key);
  }

  /**
   * Lists all registered schemas
   */
  listSchemas(): EventSchema[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Validates an event envelope structure
   */
  validateEnvelope(envelope: EventEnvelope): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    // Validate envelope structure
    if (!envelope.id || typeof envelope.id !== 'string') {
      errors.push('Event ID is required and must be a string');
    }

    if (!envelope.topic || typeof envelope.topic !== 'string') {
      errors.push('Event topic is required and must be a string');
    } else if (!/^q\.[a-z]+\.[a-z]+\.v\d+$/.test(envelope.topic)) {
      errors.push('Event topic must follow format: q.<module>.<action>.<version>');
    }

    if (!envelope.schemaVersion || typeof envelope.schemaVersion !== 'string') {
      errors.push('Schema version is required and must be a string');
    }

    if (!envelope.actor || typeof envelope.actor !== 'object') {
      errors.push('Actor is required and must be an object');
    }

    if (!envelope.timestamp || typeof envelope.timestamp !== 'string') {
      errors.push('Timestamp is required and must be a string');
    }

    if (!envelope.source || typeof envelope.source !== 'string') {
      errors.push('Source is required and must be a string');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validates an event payload against its schema
   */
  validatePayload(topic: string, version: string, payload: any): {
    valid: boolean;
    errors?: string[];
  } {
    const schema = this.getSchema(topic, version);
    if (!schema) {
      return {
        valid: false,
        errors: [`No schema registered for ${topic}:${version}`]
      };
    }

    const result = schemaValidator.validate(schema.schema as any, payload);
    return {
      valid: result.valid,
      errors: result.errors
    };
  }

  /**
   * Validates a complete event (envelope + payload)
   */
  validateEvent(envelope: EventEnvelope): {
    valid: boolean;
    errors?: string[];
  } {
    // First validate envelope structure
    const envelopeResult = this.validateEnvelope(envelope);
    if (!envelopeResult.valid) {
      return envelopeResult;
    }

    // Then validate payload against schema
    const payloadResult = this.validatePayload(
      envelope.topic,
      envelope.schemaVersion,
      envelope.payload
    );

    if (!payloadResult.valid) {
      return payloadResult;
    }

    return { valid: true };
  }

  /**
   * Checks if a schema version is compatible with another
   */
  checkCompatibility(
    fromTopic: string,
    fromVersion: string,
    toTopic: string,
    toVersion: string
  ): {
    compatible: boolean;
    reason?: string;
  } {
    if (fromTopic !== toTopic) {
      return {
        compatible: false,
        reason: 'Different topics are not compatible'
      };
    }

    const fromSchema = this.getSchema(fromTopic, fromVersion);
    const toSchema = this.getSchema(toTopic, toVersion);

    if (!fromSchema || !toSchema) {
      return {
        compatible: false,
        reason: 'One or both schemas not found'
      };
    }

    // Simple version-based compatibility check
    // In a real implementation, this would do semantic schema comparison
    const fromVersionNum = parseInt(fromVersion.replace('v', ''));
    const toVersionNum = parseInt(toVersion.replace('v', ''));

    switch (toSchema.compatibility) {
      case 'BACKWARD':
        return {
          compatible: toVersionNum >= fromVersionNum,
          reason: toVersionNum >= fromVersionNum ? undefined : 'Backward compatibility broken'
        };
      case 'FORWARD':
        return {
          compatible: toVersionNum <= fromVersionNum,
          reason: toVersionNum <= fromVersionNum ? undefined : 'Forward compatibility broken'
        };
      case 'FULL':
        return { compatible: true };
      case 'NONE':
        return {
          compatible: fromVersion === toVersion,
          reason: fromVersion === toVersion ? undefined : 'No compatibility guaranteed'
        };
      default:
        return {
          compatible: false,
          reason: 'Unknown compatibility mode'
        };
    }
  }
}

// Global event validator instance
export const eventValidator = new EventValidator();