// Common types for Qmask module
export interface MaskRule {
  field: string;
  strategy: 'REDACT' | 'HASH' | 'ENCRYPT' | 'ANONYMIZE' | 'REMOVE';
  params?: Record<string, any>;
}

export interface MaskProfile {
  name: string;
  rules: MaskRule[];
  defaults: Record<string, any>;
  version: string;
}

// Extended types for Qmask module
export interface MaskingContext {
  purpose?: string;
  jurisdiction?: string;
  dataSubject?: string;
  processingBasis?: string;
  retentionPeriod?: string;
}

export interface MaskingResult {
  maskedData: Record<string, any>;
  appliedRules: Array<{
    field: string;
    strategy: string;
    applied: boolean;
    reason?: string;
  }>;
  riskScore: number;
  complianceFlags: string[];
  warnings: string[];
}

export interface PrivacyOperation {
  type: 'COLLECTION' | 'PROCESSING' | 'STORAGE' | 'SHARING' | 'DELETION' | 'ANALYSIS';
  dataTypes: string[];
  purpose: string;
  recipients: string[];
  retention: string;
  jurisdiction: string;
}

export interface PrivacyRisk {
  category: 'DATA_BREACH' | 'RE_IDENTIFICATION' | 'UNAUTHORIZED_ACCESS' | 'DATA_MISUSE' | 'COMPLIANCE_VIOLATION';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mitigation: string;
}

export interface PrivacyImpactAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  risks: PrivacyRisk[];
  recommendations: string[];
  complianceRequirements: string[];
}

export interface DataSubjectRequest {
  requestId: string;
  type: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'PORTABILITY' | 'RESTRICTION' | 'OBJECTION';
  dataSubject: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  requestedAt: Date;
  completedAt?: Date;
  response?: string;
}

export interface AnonymizationConfig {
  strength: 'low' | 'medium' | 'high';
  preserveUtility: boolean;
  kAnonymity?: number;
  lDiversity?: number;
  tCloseness?: number;
}

export interface ReIdentificationAssessment {
  riskScore: number;
  vulnerabilities: string[];
  recommendations: string[];
  confidence: number;
}