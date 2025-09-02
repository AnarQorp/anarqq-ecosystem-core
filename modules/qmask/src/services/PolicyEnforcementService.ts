import { MaskProfile, MaskingContext } from '../types/privacy';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  condition: PolicyCondition;
  action: PolicyAction;
  priority: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyCondition {
  type: 'data_type' | 'jurisdiction' | 'purpose' | 'recipient' | 'risk_level' | 'composite';
  operator: 'equals' | 'contains' | 'in' | 'greater_than' | 'less_than' | 'and' | 'or';
  value: any;
  conditions?: PolicyCondition[]; // For composite conditions
}

export interface PolicyAction {
  type: 'require_profile' | 'block_processing' | 'require_consent' | 'apply_retention' | 'notify_dpo';
  parameters: Record<string, any>;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  appliedRules: string[];
  requiredActions: PolicyAction[];
  violations: string[];
  recommendations: string[];
}

export interface CompliancePolicy {
  id: string;
  name: string;
  regulation: 'GDPR' | 'CCPA' | 'HIPAA' | 'PCI_DSS' | 'SOX' | 'CUSTOM';
  rules: PolicyRule[];
  jurisdiction: string[];
  dataTypes: string[];
  mandatory: boolean;
  version: string;
}

export class PolicyEnforcementService {
  private policies: Map<string, CompliancePolicy> = new Map();
  private rules: Map<string, PolicyRule> = new Map();

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Evaluate privacy policies for a data processing operation
   */
  async evaluatePrivacyPolicies(
    operation: {
      dataTypes: string[];
      purpose: string;
      jurisdiction: string;
      recipients: string[];
      retention: string;
      riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    },
    context?: MaskingContext
  ): Promise<PolicyEvaluationResult> {
    logger.info(`Evaluating privacy policies for operation: ${operation.purpose}`);

    const applicablePolicies = this.findApplicablePolicies(operation);
    const applicableRules = this.findApplicableRules(operation, applicablePolicies);

    const evaluationResult: PolicyEvaluationResult = {
      allowed: true,
      appliedRules: [],
      requiredActions: [],
      violations: [],
      recommendations: []
    };

    // Evaluate each applicable rule
    for (const rule of applicableRules) {
      const ruleResult = await this.evaluateRule(rule, operation, context);
      
      if (ruleResult.applies) {
        evaluationResult.appliedRules.push(rule.id);
        
        if (ruleResult.action) {
          evaluationResult.requiredActions.push(ruleResult.action);
        }

        if (ruleResult.blocks) {
          evaluationResult.allowed = false;
          evaluationResult.violations.push(ruleResult.violation || `Rule ${rule.name} blocks this operation`);
        }

        if (ruleResult.recommendation) {
          evaluationResult.recommendations.push(ruleResult.recommendation);
        }
      }
    }

    // Add general recommendations based on operation characteristics
    evaluationResult.recommendations.push(...this.generateGeneralRecommendations(operation));

    return evaluationResult;
  }

  /**
   * Enforce privacy policies during masking operation
   */
  async enforcePrivacyPolicies(
    data: Record<string, any>,
    profileName: string,
    context: MaskingContext
  ): Promise<{
    allowed: boolean;
    enforcedProfile?: string;
    additionalMasking?: Record<string, any>;
    violations: string[];
    auditLog: string[];
  }> {
    logger.info(`Enforcing privacy policies for profile: ${profileName}`);

    const operation = {
      dataTypes: this.extractDataTypes(data),
      purpose: context.purpose || 'unspecified',
      jurisdiction: context.jurisdiction || 'unknown',
      recipients: [],
      retention: context.retentionPeriod || 'unspecified'
    };

    const policyResult = await this.evaluatePrivacyPolicies(operation, context);
    const auditLog: string[] = [];

    if (!policyResult.allowed) {
      auditLog.push(`Operation blocked by policies: ${policyResult.violations.join(', ')}`);
      return {
        allowed: false,
        violations: policyResult.violations,
        auditLog
      };
    }

    // Apply required actions
    let enforcedProfile = profileName;
    let additionalMasking: Record<string, any> = {};

    for (const action of policyResult.requiredActions) {
      switch (action.type) {
        case 'require_profile':
          if (action.parameters.profileName !== profileName) {
            enforcedProfile = action.parameters.profileName;
            auditLog.push(`Profile changed from ${profileName} to ${enforcedProfile} by policy`);
          }
          break;

        case 'apply_retention':
          additionalMasking.retentionPolicy = action.parameters;
          auditLog.push(`Retention policy applied: ${JSON.stringify(action.parameters)}`);
          break;

        case 'require_consent':
          if (!context.processingBasis?.includes('consent')) {
            auditLog.push(`Consent required but not provided for ${action.parameters.dataTypes}`);
          }
          break;

        case 'notify_dpo':
          await this.notifyDataProtectionOfficer(operation, action.parameters);
          auditLog.push(`DPO notified: ${action.parameters.reason}`);
          break;
      }
    }

    return {
      allowed: true,
      enforcedProfile: enforcedProfile !== profileName ? enforcedProfile : undefined,
      additionalMasking: Object.keys(additionalMasking).length > 0 ? additionalMasking : undefined,
      violations: [],
      auditLog
    };
  }

  /**
   * Create a new compliance policy
   */
  async createCompliancePolicy(policy: Omit<CompliancePolicy, 'id'>): Promise<CompliancePolicy> {
    const id = `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newPolicy: CompliancePolicy = {
      ...policy,
      id
    };

    this.policies.set(id, newPolicy);
    
    // Register individual rules
    policy.rules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    logger.info(`Created compliance policy: ${policy.name} (${id})`);
    return newPolicy;
  }

  /**
   * Update an existing compliance policy
   */
  async updateCompliancePolicy(
    policyId: string,
    updates: Partial<CompliancePolicy>
  ): Promise<CompliancePolicy | null> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return null;
    }

    const updatedPolicy = { ...policy, ...updates };
    this.policies.set(policyId, updatedPolicy);

    // Update rules if provided
    if (updates.rules) {
      // Remove old rules
      policy.rules.forEach(rule => {
        this.rules.delete(rule.id);
      });

      // Add new rules
      updates.rules.forEach(rule => {
        this.rules.set(rule.id, rule);
      });
    }

    logger.info(`Updated compliance policy: ${policyId}`);
    return updatedPolicy;
  }

  /**
   * Delete a compliance policy
   */
  async deleteCompliancePolicy(policyId: string): Promise<boolean> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return false;
    }

    // Remove associated rules
    policy.rules.forEach(rule => {
      this.rules.delete(rule.id);
    });

    this.policies.delete(policyId);
    logger.info(`Deleted compliance policy: ${policyId}`);
    return true;
  }

  /**
   * List all compliance policies
   */
  listCompliancePolicies(filters?: {
    regulation?: string;
    jurisdiction?: string;
    mandatory?: boolean;
  }): CompliancePolicy[] {
    let policies = Array.from(this.policies.values());

    if (filters?.regulation) {
      policies = policies.filter(p => p.regulation === filters.regulation);
    }

    if (filters?.jurisdiction) {
      policies = policies.filter(p => p.jurisdiction.includes(filters.jurisdiction));
    }

    if (filters?.mandatory !== undefined) {
      policies = policies.filter(p => p.mandatory === filters.mandatory);
    }

    return policies.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Validate policy compliance for a profile
   */
  async validateProfileCompliance(
    profile: MaskProfile,
    jurisdiction: string = 'global'
  ): Promise<{
    compliant: boolean;
    violations: string[];
    recommendations: string[];
    applicablePolicies: string[];
  }> {
    logger.info(`Validating profile compliance: ${profile.name}`);

    const applicablePolicies = Array.from(this.policies.values()).filter(policy => 
      policy.jurisdiction.includes(jurisdiction) || policy.jurisdiction.includes('global')
    );

    const violations: string[] = [];
    const recommendations: string[] = [];
    const applicablePolicyNames: string[] = [];

    for (const policy of applicablePolicies) {
      applicablePolicyNames.push(policy.name);

      // Check if profile meets policy requirements
      const policyViolations = await this.checkProfileAgainstPolicy(profile, policy);
      violations.push(...policyViolations);

      // Generate policy-specific recommendations
      const policyRecommendations = this.generatePolicyRecommendations(profile, policy);
      recommendations.push(...policyRecommendations);
    }

    return {
      compliant: violations.length === 0,
      violations: [...new Set(violations)],
      recommendations: [...new Set(recommendations)],
      applicablePolicies: applicablePolicyNames
    };
  }

  // Private helper methods

  private initializeDefaultPolicies(): void {
    // GDPR Policy
    const gdprPolicy: CompliancePolicy = {
      id: 'gdpr_default',
      name: 'GDPR Compliance Policy',
      regulation: 'GDPR',
      jurisdiction: ['EU', 'EEA'],
      dataTypes: ['personal_data'],
      mandatory: true,
      version: '1.0.0',
      rules: [
        {
          id: 'gdpr_consent_required',
          name: 'Consent Required for Sensitive Data',
          description: 'Sensitive personal data requires explicit consent',
          condition: {
            type: 'data_type',
            operator: 'in',
            value: ['health', 'biometric', 'genetic', 'political', 'religious', 'sexual']
          },
          action: {
            type: 'require_consent',
            parameters: { explicit: true, withdrawable: true }
          },
          priority: 1,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'gdpr_high_risk_profile',
          name: 'High Risk Data Requires Strong Anonymization',
          description: 'High risk data processing requires strong anonymization profile',
          condition: {
            type: 'risk_level',
            operator: 'in',
            value: ['HIGH', 'CRITICAL']
          },
          action: {
            type: 'require_profile',
            parameters: { profileName: 'gdpr-high-anonymization' }
          },
          priority: 2,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    };

    // HIPAA Policy
    const hipaaPolicy: CompliancePolicy = {
      id: 'hipaa_default',
      name: 'HIPAA Compliance Policy',
      regulation: 'HIPAA',
      jurisdiction: ['US'],
      dataTypes: ['health', 'medical'],
      mandatory: true,
      version: '1.0.0',
      rules: [
        {
          id: 'hipaa_phi_protection',
          name: 'PHI Requires Medical Profile',
          description: 'Protected Health Information must use HIPAA-compliant profile',
          condition: {
            type: 'data_type',
            operator: 'contains',
            value: 'health'
          },
          action: {
            type: 'require_profile',
            parameters: { profileName: 'hipaa-medical' }
          },
          priority: 1,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    };

    this.policies.set(gdprPolicy.id, gdprPolicy);
    this.policies.set(hipaaPolicy.id, hipaaPolicy);

    // Register rules
    [...gdprPolicy.rules, ...hipaaPolicy.rules].forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    logger.info('Initialized default compliance policies');
  }

  private findApplicablePolicies(operation: any): CompliancePolicy[] {
    return Array.from(this.policies.values()).filter(policy => {
      // Check jurisdiction
      if (!policy.jurisdiction.includes('global') && 
          !policy.jurisdiction.includes(operation.jurisdiction)) {
        return false;
      }

      // Check data types
      if (policy.dataTypes.length > 0) {
        const hasApplicableDataType = operation.dataTypes.some((dataType: string) =>
          policy.dataTypes.some(policyDataType =>
            dataType.toLowerCase().includes(policyDataType.toLowerCase())
          )
        );
        if (!hasApplicableDataType) {
          return false;
        }
      }

      return true;
    });
  }

  private findApplicableRules(operation: any, policies: CompliancePolicy[]): PolicyRule[] {
    const rules: PolicyRule[] = [];

    policies.forEach(policy => {
      policy.rules.forEach(rule => {
        if (rule.enabled && this.evaluateCondition(rule.condition, operation)) {
          rules.push(rule);
        }
      });
    });

    // Sort by priority (higher priority first)
    return rules.sort((a, b) => b.priority - a.priority);
  }

  private async evaluateRule(
    rule: PolicyRule,
    operation: any,
    context?: MaskingContext
  ): Promise<{
    applies: boolean;
    blocks?: boolean;
    action?: PolicyAction;
    violation?: string;
    recommendation?: string;
  }> {
    const applies = this.evaluateCondition(rule.condition, operation);

    if (!applies) {
      return { applies: false };
    }

    const result = { applies: true };

    switch (rule.action.type) {
      case 'block_processing':
        return {
          ...result,
          blocks: true,
          violation: rule.action.parameters.reason || `Blocked by rule: ${rule.name}`
        };

      case 'require_profile':
      case 'require_consent':
      case 'apply_retention':
      case 'notify_dpo':
        return {
          ...result,
          action: rule.action,
          recommendation: `Applied rule: ${rule.name}`
        };

      default:
        return result;
    }
  }

  private evaluateCondition(condition: PolicyCondition, operation: any): boolean {
    switch (condition.type) {
      case 'data_type':
        return this.evaluateDataTypeCondition(condition, operation.dataTypes);
      
      case 'jurisdiction':
        return this.evaluateSimpleCondition(condition, operation.jurisdiction);
      
      case 'purpose':
        return this.evaluateSimpleCondition(condition, operation.purpose);
      
      case 'recipient':
        return this.evaluateArrayCondition(condition, operation.recipients);
      
      case 'risk_level':
        return this.evaluateSimpleCondition(condition, operation.riskLevel);
      
      case 'composite':
        return this.evaluateCompositeCondition(condition, operation);
      
      default:
        return false;
    }
  }

  private evaluateDataTypeCondition(condition: PolicyCondition, dataTypes: string[]): boolean {
    switch (condition.operator) {
      case 'contains':
        return dataTypes.some(type => 
          type.toLowerCase().includes(condition.value.toLowerCase())
        );
      
      case 'in':
        return Array.isArray(condition.value) && 
               condition.value.some((value: string) =>
                 dataTypes.some(type => type.toLowerCase().includes(value.toLowerCase()))
               );
      
      default:
        return false;
    }
  }

  private evaluateSimpleCondition(condition: PolicyCondition, value: any): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      
      case 'contains':
        return typeof value === 'string' && 
               value.toLowerCase().includes(condition.value.toLowerCase());
      
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      
      case 'greater_than':
        return typeof value === 'number' && value > condition.value;
      
      case 'less_than':
        return typeof value === 'number' && value < condition.value;
      
      default:
        return false;
    }
  }

  private evaluateArrayCondition(condition: PolicyCondition, values: any[]): boolean {
    switch (condition.operator) {
      case 'contains':
        return values.some(value => 
          typeof value === 'string' && 
          value.toLowerCase().includes(condition.value.toLowerCase())
        );
      
      case 'in':
        return Array.isArray(condition.value) && 
               values.some(value => condition.value.includes(value));
      
      default:
        return false;
    }
  }

  private evaluateCompositeCondition(condition: PolicyCondition, operation: any): boolean {
    if (!condition.conditions || condition.conditions.length === 0) {
      return false;
    }

    const results = condition.conditions.map(subCondition => 
      this.evaluateCondition(subCondition, operation)
    );

    switch (condition.operator) {
      case 'and':
        return results.every(result => result);
      
      case 'or':
        return results.some(result => result);
      
      default:
        return false;
    }
  }

  private extractDataTypes(data: Record<string, any>): string[] {
    const dataTypes: string[] = [];
    
    Object.keys(data).forEach(key => {
      const keyLower = key.toLowerCase();
      
      if (['email', 'phone', 'address'].some(type => keyLower.includes(type))) {
        dataTypes.push('personal_data');
      }
      
      if (['health', 'medical', 'diagnosis'].some(type => keyLower.includes(type))) {
        dataTypes.push('health');
      }
      
      if (['payment', 'credit', 'financial'].some(type => keyLower.includes(type))) {
        dataTypes.push('financial');
      }
    });

    return [...new Set(dataTypes)];
  }

  private generateGeneralRecommendations(operation: any): string[] {
    const recommendations: string[] = [];

    if (operation.dataTypes.length > 5) {
      recommendations.push('Consider data minimization - reduce the number of data types collected');
    }

    if (operation.recipients.length > 3) {
      recommendations.push('Review data sharing agreements with all recipients');
    }

    if (operation.retention.toLowerCase().includes('indefinite')) {
      recommendations.push('Define specific retention periods instead of indefinite retention');
    }

    return recommendations;
  }

  private async checkProfileAgainstPolicy(
    profile: MaskProfile,
    policy: CompliancePolicy
  ): Promise<string[]> {
    const violations: string[] = [];

    // Check if profile has sufficient masking rules
    if (profile.rules.length === 0) {
      violations.push(`Profile ${profile.name} has no masking rules`);
    }

    // Check for required masking strategies based on policy
    if (policy.regulation === 'GDPR') {
      const hasStrongMasking = profile.rules.some(rule => 
        ['REMOVE', 'HASH', 'ENCRYPT'].includes(rule.strategy)
      );
      if (!hasStrongMasking) {
        violations.push(`GDPR requires strong masking strategies (REMOVE, HASH, or ENCRYPT)`);
      }
    }

    if (policy.regulation === 'HIPAA') {
      const hasEncryption = profile.rules.some(rule => rule.strategy === 'ENCRYPT');
      if (!hasEncryption) {
        violations.push(`HIPAA requires encryption for PHI`);
      }
    }

    return violations;
  }

  private generatePolicyRecommendations(
    profile: MaskProfile,
    policy: CompliancePolicy
  ): string[] {
    const recommendations: string[] = [];

    if (policy.regulation === 'GDPR') {
      recommendations.push('Consider implementing data subject rights mechanisms');
      recommendations.push('Ensure lawful basis is documented for all processing');
    }

    if (policy.regulation === 'HIPAA') {
      recommendations.push('Implement business associate agreements for data sharing');
      recommendations.push('Ensure minimum necessary standard is applied');
    }

    return recommendations;
  }

  private async notifyDataProtectionOfficer(
    operation: any,
    parameters: Record<string, any>
  ): Promise<void> {
    logger.info(`Notifying DPO: ${parameters.reason}`);
    
    // In a real implementation, this would send an email or create a ticket
    const notification = {
      timestamp: new Date(),
      operation,
      reason: parameters.reason,
      severity: parameters.severity || 'MEDIUM'
    };

    // Mock notification - in reality, integrate with email/ticketing system
    logger.warn(`DPO Notification: ${JSON.stringify(notification)}`);
  }
}