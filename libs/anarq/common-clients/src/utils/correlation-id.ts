import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a new correlation ID for tracing related events
 */
export function generateCorrelationId(): string {
  return uuidv4();
}

/**
 * Correlation ID context for tracking related operations
 */
export class CorrelationContext {
  private static current: string | null = null;

  /**
   * Sets the current correlation ID
   */
  static set(correlationId: string): void {
    this.current = correlationId;
  }

  /**
   * Gets the current correlation ID
   */
  static get(): string | null {
    return this.current;
  }

  /**
   * Clears the current correlation ID
   */
  static clear(): void {
    this.current = null;
  }

  /**
   * Executes a function with a specific correlation ID
   */
  static async withCorrelationId<T>(
    correlationId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const previous = this.current;
    this.set(correlationId);
    
    try {
      return await fn();
    } finally {
      if (previous) {
        this.set(previous);
      } else {
        this.clear();
      }
    }
  }

  /**
   * Gets or generates a correlation ID
   */
  static getOrGenerate(): string {
    return this.current || generateCorrelationId();
  }
}