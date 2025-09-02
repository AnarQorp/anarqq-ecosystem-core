import { createHash } from 'crypto';
import { QHeaders, QResponse, RequestContext } from '../types/client.js';

/**
 * Idempotency record for tracking request state
 */
export interface IdempotencyRecord {
  key: string;
  requestHash: string;
  response?: QResponse;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  expiresAt: string;
  requestContext?: RequestContext;
  metadata?: Record<string, any>;
}

/**
 * Idempotency configuration
 */
export interface IdempotencyConfig {
  /** Default expiration time for idempotency records (in milliseconds) */
  defaultTtl: number;
  /** Maximum number of records to keep in memory */
  maxRecords: number;
  /** Cleanup interval for expired records (in milliseconds) */
  cleanupInterval: number;
  /** Whether to include request body in fingerprint */
  includeBodyInFingerprint: boolean;
  /** Headers to include in request fingerprint */
  fingerprintHeaders: string[];
}

/**
 * Idempotency manager for handling duplicate request detection and response caching
 */
export class IdempotencyManager {
  private records = new Map<string, IdempotencyRecord>();
  private cleanupTimer?: NodeJS.Timeout;
  private readonly config: Required<IdempotencyConfig>;

  constructor(config: Partial<IdempotencyConfig> = {}) {
    this.config = {
      defaultTtl: 24 * 60 * 60 * 1000, // 24 hours
      maxRecords: 10000,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      includeBodyInFingerprint: true,
      fingerprintHeaders: ['x-squid-id', 'x-subid', 'x-qonsent', 'content-type'],
      ...config
    };

    this.startCleanupTimer();
  }

  /**
   * Generate idempotency key if not provided
   */
  generateIdempotencyKey(): string {
    return `idem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create request fingerprint for duplicate detection
   */
  createRequestFingerprint(
    method: string,
    url: string,
    headers: QHeaders,
    body?: any
  ): string {
    const fingerprintData = {
      method: method.toUpperCase(),
      url,
      headers: this.extractFingerprintHeaders(headers),
      ...(this.config.includeBodyInFingerprint && body && { body })
    };

    return createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');
  }

  /**
   * Check if request is duplicate and return cached response if available
   */
  async checkDuplicate(
    idempotencyKey: string,
    requestFingerprint: string
  ): Promise<{ isDuplicate: boolean; record?: IdempotencyRecord }> {
    const record = this.records.get(idempotencyKey);

    if (!record) {
      return { isDuplicate: false };
    }

    // Check if record is expired
    if (new Date(record.expiresAt) < new Date()) {
      this.records.delete(idempotencyKey);
      return { isDuplicate: false };
    }

    // Check if request fingerprint matches
    if (record.requestHash !== requestFingerprint) {
      throw new Error(
        `Idempotency key conflict: same key used for different request. ` +
        `Key: ${idempotencyKey}`
      );
    }

    return { isDuplicate: true, record };
  }

  /**
   * Store idempotency record for processing request
   */
  async storeProcessingRecord(
    idempotencyKey: string,
    requestFingerprint: string,
    context?: RequestContext,
    ttl?: number
  ): Promise<IdempotencyRecord> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttl || this.config.defaultTtl));

    const record: IdempotencyRecord = {
      key: idempotencyKey,
      requestHash: requestFingerprint,
      status: 'PROCESSING',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      requestContext: context
    };

    // Check if we're at capacity
    if (this.records.size >= this.config.maxRecords) {
      this.cleanupExpiredRecords();
      
      // If still at capacity, remove oldest records
      if (this.records.size >= this.config.maxRecords) {
        this.removeOldestRecords(Math.floor(this.config.maxRecords * 0.1));
      }
    }

    this.records.set(idempotencyKey, record);
    return record;
  }

  /**
   * Update idempotency record with response
   */
  async storeResponse(
    idempotencyKey: string,
    response: QResponse,
    metadata?: Record<string, any>
  ): Promise<void> {
    const record = this.records.get(idempotencyKey);
    
    if (!record) {
      throw new Error(`Idempotency record not found: ${idempotencyKey}`);
    }

    record.response = response;
    record.status = response.status === 'ok' ? 'COMPLETED' : 'FAILED';
    record.metadata = metadata;

    this.records.set(idempotencyKey, record);
  }

  /**
   * Get idempotency record
   */
  async getRecord(idempotencyKey: string): Promise<IdempotencyRecord | undefined> {
    const record = this.records.get(idempotencyKey);
    
    if (!record) {
      return undefined;
    }

    // Check if expired
    if (new Date(record.expiresAt) < new Date()) {
      this.records.delete(idempotencyKey);
      return undefined;
    }

    return record;
  }

  /**
   * Remove idempotency record
   */
  async removeRecord(idempotencyKey: string): Promise<boolean> {
    return this.records.delete(idempotencyKey);
  }

  /**
   * Get statistics about idempotency manager
   */
  getStats(): {
    totalRecords: number;
    processingRecords: number;
    completedRecords: number;
    failedRecords: number;
    oldestRecord?: string;
    newestRecord?: string;
  } {
    const records = Array.from(this.records.values());
    
    return {
      totalRecords: records.length,
      processingRecords: records.filter(r => r.status === 'PROCESSING').length,
      completedRecords: records.filter(r => r.status === 'COMPLETED').length,
      failedRecords: records.filter(r => r.status === 'FAILED').length,
      oldestRecord: records.length > 0 
        ? records.reduce((oldest, r) => r.createdAt < oldest.createdAt ? r : oldest).createdAt
        : undefined,
      newestRecord: records.length > 0
        ? records.reduce((newest, r) => r.createdAt > newest.createdAt ? r : newest).createdAt
        : undefined
    };
  }

  /**
   * Clear all records (useful for testing)
   */
  clear(): void {
    this.records.clear();
  }

  /**
   * Shutdown idempotency manager
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.records.clear();
  }

  private extractFingerprintHeaders(headers: QHeaders): Record<string, string> {
    const fingerprintHeaders: Record<string, string> = {};
    
    for (const headerName of this.config.fingerprintHeaders) {
      const value = headers[headerName as keyof QHeaders];
      if (value) {
        fingerprintHeaders[headerName] = value;
      }
    }

    return fingerprintHeaders;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredRecords();
    }, this.config.cleanupInterval);
  }

  private cleanupExpiredRecords(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, record] of this.records.entries()) {
      if (new Date(record.expiresAt) < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.records.delete(key);
    }
  }

  private removeOldestRecords(count: number): void {
    const records = Array.from(this.records.entries())
      .sort(([, a], [, b]) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, count);

    for (const [key] of records) {
      this.records.delete(key);
    }
  }
}