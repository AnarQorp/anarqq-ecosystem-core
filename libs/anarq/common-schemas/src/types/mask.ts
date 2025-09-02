/**
 * Mask Profile - Structure for privacy and anonymization profiles
 */
export interface MaskProfile {
  /** Profile name identifier */
  name: string;
  /** Masking rules to apply */
  rules: MaskRule[];
  /** Default values for masked fields */
  defaults: Record<string, any>;
  /** Profile version */
  version: string;
  /** Profile description */
  description?: string;
  /** Profile creation timestamp */
  createdAt: string;
  /** Profile last update timestamp */
  updatedAt: string;
  /** Profile status */
  status: 'ACTIVE' | 'DEPRECATED' | 'DISABLED';
}

/**
 * Mask Rule - Individual masking rule
 */
export interface MaskRule {
  /** Field path to mask (supports dot notation) */
  field: string;
  /** Masking strategy */
  strategy: MaskStrategy;
  /** Rule conditions (when to apply) */
  conditions?: MaskCondition[];
  /** Rule priority (higher numbers take precedence) */
  priority: number;
  /** Optional rule metadata */
  metadata?: Record<string, any>;
}

/**
 * Mask Strategy - Anonymization strategy
 */
export interface MaskStrategy {
  /** Strategy type */
  type: 'REDACT' | 'HASH' | 'TOKENIZE' | 'GENERALIZE' | 'SUPPRESS' | 'SUBSTITUTE';
  /** Strategy parameters */
  params?: Record<string, any>;
  /** Reversibility flag */
  reversible: boolean;
  /** Preservation of data utility */
  preserveUtility: boolean;
}

/**
 * Mask Condition - Condition for applying mask rules
 */
export interface MaskCondition {
  /** Condition type */
  type: 'FIELD_VALUE' | 'USER_ROLE' | 'DATA_CLASSIFICATION' | 'CONTEXT';
  /** Condition operator */
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'MATCHES' | 'IN' | 'NOT_IN';
  /** Condition value */
  value: any;
  /** Optional condition metadata */
  metadata?: Record<string, any>;
}

/**
 * Privacy Assessment - Structure for privacy impact assessment
 */
export interface PrivacyAssessment {
  /** Assessment identifier */
  assessmentId: string;
  /** Data being assessed */
  dataRef: string;
  /** Privacy risk score (0-100) */
  privacyScore: number;
  /** Risk level classification */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Identified privacy risks */
  risks: PrivacyRisk[];
  /** Recommended mask profile */
  recommendedProfile?: string;
  /** Assessment timestamp */
  timestamp: string;
  /** Assessment validity period */
  validUntil: string;
}

/**
 * Privacy Risk - Individual privacy risk component
 */
export interface PrivacyRisk {
  /** Risk type */
  type: string;
  /** Risk description */
  description: string;
  /** Risk likelihood (0-1) */
  likelihood: number;
  /** Risk impact (0-1) */
  impact: number;
  /** Risk mitigation strategies */
  mitigations: string[];
}