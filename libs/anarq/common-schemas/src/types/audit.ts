import { IdentityRef } from './identity.js';

/**
 * Audit Event - Structure for security and audit logging
 */
export interface AuditEvent {
  /** Event type (e.g., 'AUTH_SUCCESS', 'PERMISSION_DENIED', 'DATA_ACCESS') */
  type: string;
  /** Reference to the resource or operation */
  ref: string;
  /** Actor who performed the action */
  actor: IdentityRef;
  /** System layer where event occurred */
  layer: string;
  /** Security verdict */
  verdict: 'ALLOW' | 'DENY' | 'WARN';
  /** Event details and context */
  details: Record<string, any>;
  /** Optional IPFS CID for additional data */
  cid?: string;
  /** Event timestamp */
  timestamp: string;
  /** Event severity level */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Optional correlation ID for related events */
  correlationId?: string;
}

/**
 * Risk Assessment - Structure for security risk scoring
 */
export interface RiskAssessment {
  /** Assessment identifier */
  assessmentId: string;
  /** Subject being assessed */
  subject: IdentityRef;
  /** Risk score (0-100) */
  riskScore: number;
  /** Risk level classification */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Risk factors contributing to score */
  factors: RiskFactor[];
  /** Assessment timestamp */
  timestamp: string;
  /** Assessment validity period */
  validUntil: string;
  /** Optional recommendations */
  recommendations?: string[];
}

/**
 * Risk Factor - Individual risk component
 */
export interface RiskFactor {
  /** Factor type */
  type: string;
  /** Factor description */
  description: string;
  /** Factor weight in overall score */
  weight: number;
  /** Factor value */
  value: number;
  /** Factor confidence level */
  confidence: number;
}

/**
 * Security Alert - Structure for security notifications
 */
export interface SecurityAlert {
  /** Alert identifier */
  alertId: string;
  /** Alert type */
  type: string;
  /** Alert severity */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Alert title */
  title: string;
  /** Alert description */
  description: string;
  /** Affected entities */
  affected: IdentityRef[];
  /** Alert timestamp */
  timestamp: string;
  /** Alert status */
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE';
  /** Optional remediation steps */
  remediation?: string[];
  /** Optional related events */
  relatedEvents?: string[];
}