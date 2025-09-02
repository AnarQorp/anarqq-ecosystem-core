import { IdentityRef } from './identity';

/**
 * Audit Event - Standard audit event representation
 */
export interface AuditEvent {
  /** Type of audit event */
  type: string;
  /** Reference to the resource being audited */
  ref: string;
  /** Actor who performed the action */
  actor: IdentityRef;
  /** Layer or module that generated the event */
  layer: string;
  /** Verdict of the audit check */
  verdict: 'ALLOW' | 'DENY' | 'WARN';
  /** Additional details about the event */
  details: Record<string, any>;
  /** Optional IPFS CID for additional context */
  cid?: string;
  /** Timestamp when the event occurred */
  timestamp?: string;
}

/**
 * Validates an AuditEvent object
 */
export function isValidAuditEvent(event: any): event is AuditEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    typeof event.type === 'string' &&
    event.type.length > 0 &&
    typeof event.ref === 'string' &&
    event.ref.length > 0 &&
    typeof event.actor === 'object' &&
    event.actor !== null &&
    typeof event.layer === 'string' &&
    event.layer.length > 0 &&
    ['ALLOW', 'DENY', 'WARN'].includes(event.verdict) &&
    typeof event.details === 'object' &&
    event.details !== null &&
    (event.cid === undefined || typeof event.cid === 'string') &&
    (event.timestamp === undefined || typeof event.timestamp === 'string')
  );
}