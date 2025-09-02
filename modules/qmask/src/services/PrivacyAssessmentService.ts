import { v4 as uuidv4 } from 'uuid';
import { PrivacyOperation, PrivacyImpactAssessment, PrivacyRisk } from '../types/privacy';
import { PrivacyAssessment, IPrivacyAssessment } from '../models/PrivacyAssessment';
import { logger } from '../utils/logger';
import { config } from '../config';

export class PrivacyAssessmentService {
  /**
   * Perform a comprehensive privacy impact assessment
   */
  async performAssessment(
    operation: PrivacyOperation,
    assessedBy: string
  ): Promise<PrivacyImpactAssessment> {
    logger.info(`Performing privacy assessment for operation: ${operation.type}`);

    // Calculate base risk score
    const baseRiskScore = this.calculateBaseRiskScore(operation);
    
    // Identify specific risks
    const risks = this.identifyRisks(operation);
    
    // Calculate overall risk level
    const riskLevel = this.determineRiskLevel(baseRiskScore, risks);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(operation, risks);
    
    // Determine compliance requirements
    const complianceRequirements = this.determineComplianceRequirements(operation);

    const assessment: PrivacyImpactAssessment = {
      riskLevel,
      riskScore: baseRiskScore,
      risks,
      recommendations,
      complianceRequirements
    };

    // Save assessment to database
    await this.saveAssessment(operation, assessment, assessedBy);

    return assessment;
  }

  /**
   * Calculate base risk score based on operation characteristics
   */
  private calculateBaseRiskScore(operation: PrivacyOperation): number {
    let riskScore = 0;

    // Operation type risk
    const operationRisk = {
      'COLLECTION': 0.3,
      'PROCESSING': 0.4,
      'STORAGE': 0.5,
      'SHARING': 0.8,
      'DELETION': 0.2,
      'ANALYSIS': 0.6
    };
    riskScore += operationRisk[operation.type] || 0.5;

    // Data type risk
    const sensitiveDataTypes = [
      'personal_id', 'ssn', 'passport', 'financial', 'medical', 'biometric',
      'genetic', 'location', 'behavioral', 'political', 'religious'
    ];
    
    const sensitiveCount = operation.dataTypes.filter(type => 
      sensitiveDataTypes.some(sensitive => 
        type.toLowerCase().includes(sensitive)
      )
    ).length;
    
    riskScore += (sensitiveCount / operation.dataTypes.length) * 0.4;

    // Recipients risk
    if (operation.recipients.length > 0) {
      riskScore += Math.min(0.3, operation.recipients.length * 0.1);
    }

    // Retention period risk
    const retentionRisk = this.assessRetentionRisk(operation.retention);
    riskScore += retentionRisk;

    // Jurisdiction risk
    const jurisdictionRisk = this.assessJurisdictionRisk(operation.jurisdiction);
    riskScore += jurisdictionRisk;

    return Math.min(1, riskScore);
  }

  /**
   * Assess retention period risk
   */
  private assessRetentionRisk(retention: string): number {
    const retentionLower = retention.toLowerCase();
    
    if (retentionLower.includes('indefinite') || retentionLower.includes('permanent')) {
      return 0.3;
    }
    
    if (retentionLower.includes('year')) {
      const years = parseInt(retentionLower.match(/(\d+)\s*year/)?.[1] || '1');
      return Math.min(0.25, years * 0.05);
    }
    
    if (retentionLower.includes('month')) {
      const months = parseInt(retentionLower.match(/(\d+)\s*month/)?.[1] || '1');
      return Math.min(0.2, months * 0.01);
    }
    
    return 0.1; // Default for short-term retention
  }

  /**
   * Assess jurisdiction-specific risk
   */
  private assessJurisdictionRisk(jurisdiction: string): number {
    const jurisdictionLower = jurisdiction.toLowerCase();
    
    // High privacy protection jurisdictions (lower risk)
    if (['eu', 'gdpr', 'switzerland', 'canada'].some(j => jurisdictionLower.includes(j))) {
      return 0.05;
    }
    
    // Medium privacy protection
    if (['us', 'uk', 'australia', 'japan'].some(j => jurisdictionLower.includes(j))) {
      return 0.1;
    }
    
    // Lower privacy protection (higher risk)
    return 0.2;
  }

  /**
   * Identify specific privacy risks
   */
  private identifyRisks(operation: PrivacyOperation): PrivacyRisk[] {
    const risks: PrivacyRisk[] = [];

    // Data breach risk
    if (operation.type === 'STORAGE' || operation.type === 'PROCESSING') {
      risks.push({
        category: 'DATA_BREACH',
        description: 'Risk of unauthorized access to stored or processed personal data',
        severity: this.assessDataBreachSeverity(operation),
        mitigation: 'Implement encryption at rest and in transit, access controls, and regular security audits'
      });
    }

    // Re-identification risk
    if (operation.dataTypes.some(type => type.toLowerCase().includes('anonymized'))) {
      risks.push({
        category: 'RE_IDENTIFICATION',
        description: 'Risk of re-identifying individuals from anonymized data',
        severity: 'MEDIUM',
        mitigation: 'Apply k-anonymity, l-diversity, or differential privacy techniques'
      });
    }

    // Unauthorized access risk
    if (operation.recipients.length > 0) {
      risks.push({
        category: 'UNAUTHORIZED_ACCESS',
        description: 'Risk of data access by unauthorized recipients',
        severity: this.assessUnauthorizedAccessSeverity(operation),
        mitigation: 'Implement role-based access controls and data sharing agreements'
      });
    }

    // Data misuse risk
    if (operation.type === 'ANALYSIS' || operation.type === 'SHARING') {
      risks.push({
        category: 'DATA_MISUSE',
        description: 'Risk of using data beyond stated purpose',
        severity: 'MEDIUM',
        mitigation: 'Implement purpose limitation controls and usage monitoring'
      });
    }

    // Compliance violation risk
    const complianceRisk = this.assessComplianceRisk(operation);
    if (complianceRisk.severity !== 'LOW') {
      risks.push(complianceRisk);
    }

    return risks;
  }

  /**
   * Assess data breach severity
   */
  private assessDataBreachSeverity(operation: PrivacyOperation): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const sensitiveDataTypes = ['medical', 'financial', 'biometric', 'genetic'];
    const hasSensitiveData = operation.dataTypes.some(type => 
      sensitiveDataTypes.some(sensitive => type.toLowerCase().includes(sensitive))
    );

    if (hasSensitiveData && operation.recipients.length > 0) {
      return 'CRITICAL';
    }
    
    if (hasSensitiveData || operation.recipients.length > 2) {
      return 'HIGH';
    }
    
    if (operation.dataTypes.length > 5) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  /**
   * Assess unauthorized access severity
   */
  private assessUnauthorizedAccessSeverity(operation: PrivacyOperation): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (operation.recipients.length > 5) {
      return 'HIGH';
    }
    
    if (operation.recipients.length > 2) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  /**
   * Assess compliance risk
   */
  private assessComplianceRisk(operation: PrivacyOperation): PrivacyRisk {
    const jurisdiction = operation.jurisdiction.toLowerCase();
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let description = 'Low risk of compliance violations';
    let mitigation = 'Follow standard privacy practices';

    if (jurisdiction.includes('eu') || jurisdiction.includes('gdpr')) {
      severity = 'HIGH';
      description = 'High risk of GDPR compliance violations due to strict requirements';
      mitigation = 'Ensure lawful basis, implement data protection by design, conduct DPIA if required';
    } else if (jurisdiction.includes('ca') && jurisdiction.includes('ccpa')) {
      severity = 'MEDIUM';
      description = 'Medium risk of CCPA compliance violations';
      mitigation = 'Implement consumer rights mechanisms and opt-out procedures';
    } else if (operation.dataTypes.some(type => type.toLowerCase().includes('health'))) {
      severity = 'HIGH';
      description = 'High risk of HIPAA compliance violations for health data';
      mitigation = 'Implement HIPAA safeguards and business associate agreements';
    }

    return {
      category: 'COMPLIANCE_VIOLATION',
      description,
      severity,
      mitigation
    };
  }

  /**
   * Determine overall risk level
   */
  private determineRiskLevel(
    riskScore: number, 
    risks: PrivacyRisk[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Check for critical risks
    if (risks.some(risk => risk.severity === 'CRITICAL')) {
      return 'CRITICAL';
    }

    // Check risk score thresholds
    if (riskScore >= 0.8) {
      return 'CRITICAL';
    } else if (riskScore >= 0.6) {
      return 'HIGH';
    } else if (riskScore >= 0.4) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Generate privacy protection recommendations
   */
  private generateRecommendations(
    operation: PrivacyOperation, 
    risks: PrivacyRisk[]
  ): string[] {
    const recommendations: string[] = [];

    // General recommendations based on operation type
    switch (operation.type) {
      case 'COLLECTION':
        recommendations.push('Implement data minimization - collect only necessary data');
        recommendations.push('Obtain explicit consent for data collection');
        break;
      
      case 'PROCESSING':
        recommendations.push('Apply privacy by design principles');
        recommendations.push('Implement purpose limitation controls');
        break;
      
      case 'STORAGE':
        recommendations.push('Encrypt data at rest using strong encryption');
        recommendations.push('Implement access controls and audit logging');
        break;
      
      case 'SHARING':
        recommendations.push('Use data sharing agreements with recipients');
        recommendations.push('Apply data minimization before sharing');
        break;
      
      case 'ANALYSIS':
        recommendations.push('Consider using anonymized or pseudonymized data');
        recommendations.push('Implement differential privacy for statistical analysis');
        break;
    }

    // Risk-specific recommendations
    risks.forEach(risk => {
      if (!recommendations.includes(risk.mitigation)) {
        recommendations.push(risk.mitigation);
      }
    });

    // Compliance-specific recommendations
    const complianceReqs = this.determineComplianceRequirements(operation);
    complianceReqs.forEach(req => {
      switch (req) {
        case 'GDPR':
          recommendations.push('Conduct Data Protection Impact Assessment (DPIA) if required');
          recommendations.push('Implement data subject rights mechanisms');
          break;
        case 'CCPA':
          recommendations.push('Implement consumer opt-out mechanisms');
          recommendations.push('Provide clear privacy notices');
          break;
        case 'HIPAA':
          recommendations.push('Implement HIPAA administrative, physical, and technical safeguards');
          break;
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Determine applicable compliance requirements
   */
  private determineComplianceRequirements(operation: PrivacyOperation): string[] {
    const requirements: string[] = [];
    const jurisdiction = operation.jurisdiction.toLowerCase();

    // GDPR
    if (jurisdiction.includes('eu') || jurisdiction.includes('gdpr')) {
      requirements.push('GDPR');
    }

    // CCPA
    if (jurisdiction.includes('ca') && jurisdiction.includes('us')) {
      requirements.push('CCPA');
    }

    // HIPAA
    if (operation.dataTypes.some(type => type.toLowerCase().includes('health'))) {
      requirements.push('HIPAA');
    }

    // PCI DSS
    if (operation.dataTypes.some(type => type.toLowerCase().includes('payment'))) {
      requirements.push('PCI_DSS');
    }

    // SOX
    if (operation.dataTypes.some(type => type.toLowerCase().includes('financial'))) {
      requirements.push('SOX');
    }

    return requirements;
  }

  /**
   * Save assessment to database
   */
  private async saveAssessment(
    operation: PrivacyOperation,
    assessment: PrivacyImpactAssessment,
    assessedBy: string
  ): Promise<IPrivacyAssessment> {
    const assessmentDoc = new PrivacyAssessment({
      assessmentId: uuidv4(),
      operation,
      riskLevel: assessment.riskLevel,
      riskScore: assessment.riskScore,
      risks: assessment.risks,
      recommendations: assessment.recommendations,
      complianceRequirements: assessment.complianceRequirements,
      assessedBy,
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
      status: 'DRAFT'
    });

    return await assessmentDoc.save();
  }

  /**
   * Get assessment by ID
   */
  async getAssessment(assessmentId: string): Promise<IPrivacyAssessment | null> {
    return await PrivacyAssessment.findOne({ assessmentId });
  }

  /**
   * List assessments for a user
   */
  async listAssessments(
    assessedBy: string,
    filters?: {
      riskLevel?: string;
      status?: string;
      operationType?: string;
    }
  ): Promise<IPrivacyAssessment[]> {
    const query: any = { assessedBy };

    if (filters?.riskLevel) {
      query.riskLevel = filters.riskLevel;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.operationType) {
      query['operation.type'] = filters.operationType;
    }

    return await PrivacyAssessment.find(query)
      .sort({ createdAt: -1 })
      .limit(100);
  }

  /**
   * Update assessment status
   */
  async updateAssessmentStatus(
    assessmentId: string,
    status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
  ): Promise<IPrivacyAssessment | null> {
    return await PrivacyAssessment.findOneAndUpdate(
      { assessmentId },
      { status },
      { new: true }
    );
  }
}