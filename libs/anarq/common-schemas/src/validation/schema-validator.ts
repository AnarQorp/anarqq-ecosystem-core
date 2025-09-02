import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';

/**
 * Schema Validator - Validates data against JSON schemas
 */
export class SchemaValidator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true,
      verbose: true,
      strict: false
    });
    addFormats(this.ajv);
  }

  /**
   * Validates data against a JSON schema
   */
  validate<T>(schema: JSONSchemaType<T>, data: any): {
    valid: boolean;
    errors?: string[];
    data?: T;
  } {
    const validate = this.ajv.compile(schema);
    const valid = validate(data);

    if (valid) {
      return { valid: true, data: data as T };
    }

    const errors = validate.errors?.map(error => {
      const path = error.instancePath || 'root';
      return `${path}: ${error.message}`;
    }) || ['Unknown validation error'];

    return { valid: false, errors };
  }

  /**
   * Validates data against a schema and throws on error
   */
  validateOrThrow<T>(schema: JSONSchemaType<T>, data: any): T {
    const result = this.validate(schema, data);
    if (!result.valid) {
      throw new Error(`Validation failed: ${result.errors?.join(', ')}`);
    }
    return result.data!;
  }

  /**
   * Adds a custom schema to the validator
   */
  addSchema(schema: any, key?: string): void {
    this.ajv.addSchema(schema, key);
  }

  /**
   * Removes a schema from the validator
   */
  removeSchema(key: string): void {
    this.ajv.removeSchema(key);
  }

  /**
   * Compiles a schema for repeated validation
   */
  compile<T>(schema: JSONSchemaType<T>) {
    return this.ajv.compile(schema);
  }
}

// Global schema validator instance
export const schemaValidator = new SchemaValidator();