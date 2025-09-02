import { v4 as uuidv4 } from 'uuid';
import { DataSubjectRequest } from '../types/privacy';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface DSRProcessingResult {
  requestId: string;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  processedData?: any;
  errors?: string[];
  completedAt: Date;
}

export interface GDPRComplianceReport {
  reportId: string;
  period: { start: Date; end: Date };
  dataProcessingActivities: number;
  dsrRequests: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  breachNotifications: number;
  complianceScore: number;
  recommendations: string[];
  generatedAt: Date;
}

export class GDPRComplianceService {
  private dsrRequests: Map<string, DataSubjectRequest> = new Map();

  /**
   * Process a data subject request (GDPR Article 15-22)
   */
  async processDataSubjectRequest(
    request: Omit<DataSubjectRequest, 'requestId' | 'status' | 'requestedAt'>
  ): Promise<DSRProcessingResult> {
    const requestId = uuidv4();
    const dsrRequest: DataSubjectRequest = {
      ...request,
      requestId,
      status: 'PENDING',
      requestedAt: new Date()
    };

    this.dsrRequests.set(requestId, dsrRequest);
    logger.info(`Processing DSR request: ${requestId} (${request.type})`);

    try {
      let result: DSRProcessingResult;

      switch (request.type) {
        case 'ACCESS':
          result = await this.processAccessRequest(dsrRequest);
          break;
        case 'RECTIFICATION':
          result = await this.processRectificationRequest(dsrRequest);
          break;
        case 'ERASURE':
          result = await this.processErasureRequest(dsrRequest);
          break;
        case 'PORTABILITY':
          result = await this.processPortabilityRequest(dsrRequest);
          break;
        case 'RESTRICTION':
          result = await this.processRestrictionRequest(dsrRequest);
          break;
        case 'OBJECTION':
          result = await this.processObjectionRequest(dsrRequest);
          break;
        default:
          throw new Error(`Unsupported DSR type: ${request.type}`);
      }

      // Update request status
      dsrRequest.status = result.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS';
      dsrRequest.completedAt = result.completedAt;
      dsrRequest.response = JSON.stringify(result);

      return result;
    } catch (error) {
      logger.error(`Failed to process DSR request ${requestId}:`, error);
      dsrRequest.status = 'REJECTED';
      
      return {
        requestId,
        status: 'FAILED',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        completedAt: new Date()
      };
    }
  }

  /**
   * Process access request (GDPR Article 15)
   */
  private async processAccessRequest(request: DataSubjectRequest): Promise<DSRProcessingResult> {
    logger.info(`Processing access request for: ${request.dataSubject}`);

    // In a real implementation, this would query all systems for the data subject's data
    const personalData = await this.collectPersonalData(request.dataSubject);
    
    const accessReport = {
      dataSubject: request.dataSubject,
      dataCollected: personalData,
      processingPurposes: await this.getProcessingPurposes(request.dataSubject),
      dataRecipients: await this.getDataRecipients(request.dataSubject),
      retentionPeriods: await this.getRetentionPeriods(request.dataSubject),
      dataSubjectRights: this.getDataSubjectRights(),
      contactInformation: config.dataProtectionOfficer || 'dpo@example.com'
    };

    return {
      requestId: request.requestId,
      status: 'COMPLETED',
      processedData: accessReport,
      completedAt: new Date()
    };
  }

  /**
   * Process rectification request (GDPR Article 16)
   */
  private async processRectificationRequest(request: DataSubjectRequest): Promise<DSRProcessingResult> {
    logger.info(`Processing rectification request for: ${request.dataSubject}`);

    // In a real implementation, this would update the data across all systems
    const corrections = await this.applyDataCorrections(request.dataSubject, request.description);

    return {
      requestId: request.requestId,
      status: 'COMPLETED',
      processedData: { corrections },
      completedAt: new Date()
    };
  }

  /**
   * Process erasure request (GDPR Article 17 - Right to be forgotten)
   */
  private async processErasureRequest(request: DataSubjectRequest): Promise<DSRProcessingResult> {
    logger.info(`Processing erasure request for: ${request.dataSubject}`);

    const erasureResult = await this.erasePersonalData(request.dataSubject);
    
    // Notify third parties if data was shared
    await this.notifyThirdPartiesOfErasure(request.dataSubject);

    return {
      requestId: request.requestId,
      status: erasureResult.complete ? 'COMPLETED' : 'PARTIAL',
      processedData: erasureResult,
      errors: erasureResult.errors,
      completedAt: new Date()
    };
  }

  /**
   * Process portability request (GDPR Article 20)
   */
  private async processPortabilityRequest(request: DataSubjectRequest): Promise<DSRProcessingResult> {
    logger.info(`Processing portability request for: ${request.dataSubject}`);

    const portableData = await this.exportPortableData(request.dataSubject);

    return {
      requestId: request.requestId,
      status: 'COMPLETED',
      processedData: {
        format: 'JSON',
        data: portableData,
        exportedAt: new Date()
      },
      completedAt: new Date()
    };
  }

  /**
   * Process restriction request (GDPR Article 18)
   */
  private async processRestrictionRequest(request: DataSubjectRequest): Promise<DSRProcessingResult> {
    logger.info(`Processing restriction request for: ${request.dataSubject}`);

    const restrictionResult = await this.restrictDataProcessing(request.dataSubject);

    return {
      requestId: request.requestId,
      status: 'COMPLETED',
      processedData: restrictionResult,
      completedAt: new Date()
    };
  }

  /**
   * Process objection request (GDPR Article 21)
   */
  private async processObjectionRequest(request: DataSubjectRequest): Promise<DSRProcessingResult> {
    logger.info(`Processing objection request for: ${request.dataSubject}`);

    const objectionResult = await this.processObjection(request.dataSubject, request.description);

    return {
      requestId: request.requestId,
      status: 'COMPLETED',
      processedData: objectionResult,
      completedAt: new Date()
    };
  }

  /**
   * Generate GDPR compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<GDPRComplianceReport> {
    logger.info(`Generating GDPR compliance report for period: ${startDate} - ${endDate}`);

    const dsrRequestsInPeriod = Array.from(this.dsrRequests.values()).filter(
      req => req.requestedAt >= startDate && req.requestedAt <= endDate
    );

    const dsrByType = dsrRequestsInPeriod.reduce((acc, req) => {
      acc[req.type] = (acc[req.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dsrByStatus = dsrRequestsInPeriod.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const complianceScore = this.calculateComplianceScore(dsrRequestsInPeriod);
    const recommendations = this.generateComplianceRecommendations(complianceScore, dsrRequestsInPeriod);

    return {
      reportId: uuidv4(),
      period: { start: startDate, end: endDate },
      dataProcessingActivities: await this.countDataProcessingActivities(startDate, endDate),
      dsrRequests: {
        total: dsrRequestsInPeriod.length,
        byType: dsrByType,
        byStatus: dsrByStatus
      },
      breachNotifications: await this.countBreachNotifications(startDate, endDate),
      complianceScore,
      recommendations,
      generatedAt: new Date()
    };
  }

  /**
   * Validate GDPR compliance for data processing operation
   */
  async validateGDPRCompliance(operation: {
    purpose: string;
    dataTypes: string[];
    lawfulBasis: string;
    dataSubjectConsent?: boolean;
    retentionPeriod: string;
    recipients: string[];
  }): Promise<{
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  }> {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check lawful basis (GDPR Article 6)
    if (!this.isValidLawfulBasis(operation.lawfulBasis)) {
      violations.push('Invalid or missing lawful basis for processing');
      recommendations.push('Specify a valid lawful basis under GDPR Article 6');
    }

    // Check purpose limitation (GDPR Article 5(1)(b))
    if (!operation.purpose || operation.purpose.trim().length === 0) {
      violations.push('Processing purpose not specified');
      recommendations.push('Clearly define the purpose of data processing');
    }

    // Check data minimization (GDPR Article 5(1)(c))
    if (operation.dataTypes.length > 10) {
      violations.push('Potential data minimization violation - too many data types');
      recommendations.push('Review data types and collect only necessary data');
    }

    // Check retention period (GDPR Article 5(1)(e))
    if (!this.isValidRetentionPeriod(operation.retentionPeriod)) {
      violations.push('Invalid or excessive retention period');
      recommendations.push('Define appropriate retention period based on processing purpose');
    }

    // Check consent requirements for sensitive data
    const hasSensitiveData = operation.dataTypes.some(type => 
      ['health', 'biometric', 'genetic', 'political', 'religious'].some(sensitive => 
        type.toLowerCase().includes(sensitive)
      )
    );

    if (hasSensitiveData && !operation.dataSubjectConsent) {
      violations.push('Sensitive data processing requires explicit consent');
      recommendations.push('Obtain explicit consent for sensitive data processing');
    }

    return {
      compliant: violations.length === 0,
      violations,
      recommendations
    };
  }

  /**
   * Automated breach notification assessment
   */
  async assessBreachNotificationRequirement(incident: {
    dataTypes: string[];
    affectedSubjects: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    containmentTime: number; // hours
    description: string;
  }): Promise<{
    notificationRequired: boolean;
    timeframe: string;
    recipients: string[];
    template: string;
  }> {
    const notificationRequired = this.requiresBreachNotification(incident);
    
    if (!notificationRequired) {
      return {
        notificationRequired: false,
        timeframe: 'N/A',
        recipients: [],
        template: ''
      };
    }

    const timeframe = incident.riskLevel === 'CRITICAL' ? '72 hours' : '72 hours';
    const recipients = ['supervisory-authority@example.com'];
    
    if (incident.riskLevel === 'HIGH' || incident.riskLevel === 'CRITICAL') {
      recipients.push('data-subjects');
    }

    const template = this.generateBreachNotificationTemplate(incident);

    return {
      notificationRequired,
      timeframe,
      recipients,
      template
    };
  }

  // Private helper methods

  private async collectPersonalData(dataSubject: string): Promise<any> {
    // Mock implementation - in reality, this would query all systems
    return {
      profile: { email: dataSubject, name: 'John Doe' },
      activities: ['login', 'purchase', 'support_ticket'],
      preferences: { newsletter: true, marketing: false }
    };
  }

  private async getProcessingPurposes(dataSubject: string): Promise<string[]> {
    return ['Account management', 'Service delivery', 'Legal compliance'];
  }

  private async getDataRecipients(dataSubject: string): Promise<string[]> {
    return ['Internal teams', 'Payment processor', 'Email service provider'];
  }

  private async getRetentionPeriods(dataSubject: string): Promise<Record<string, string>> {
    return {
      'Account data': '2 years after account closure',
      'Transaction data': '7 years for tax purposes',
      'Marketing data': 'Until consent withdrawn'
    };
  }

  private getDataSubjectRights(): string[] {
    return [
      'Right of access (Article 15)',
      'Right to rectification (Article 16)',
      'Right to erasure (Article 17)',
      'Right to restrict processing (Article 18)',
      'Right to data portability (Article 20)',
      'Right to object (Article 21)'
    ];
  }

  private async applyDataCorrections(dataSubject: string, corrections: string): Promise<any> {
    // Mock implementation
    return { corrected: true, fields: ['name', 'email'], timestamp: new Date() };
  }

  private async erasePersonalData(dataSubject: string): Promise<{
    complete: boolean;
    erasedSystems: string[];
    errors?: string[];
  }> {
    // Mock implementation
    return {
      complete: true,
      erasedSystems: ['user-db', 'analytics-db', 'backup-storage'],
      errors: []
    };
  }

  private async notifyThirdPartiesOfErasure(dataSubject: string): Promise<void> {
    logger.info(`Notifying third parties of erasure for: ${dataSubject}`);
    // Implementation would notify all data processors
  }

  private async exportPortableData(dataSubject: string): Promise<any> {
    // Mock implementation
    return {
      personal_data: await this.collectPersonalData(dataSubject),
      created_at: new Date(),
      format_version: '1.0'
    };
  }

  private async restrictDataProcessing(dataSubject: string): Promise<any> {
    // Mock implementation
    return {
      restricted: true,
      systems: ['marketing-system', 'analytics-system'],
      timestamp: new Date()
    };
  }

  private async processObjection(dataSubject: string, reason: string): Promise<any> {
    // Mock implementation
    return {
      objection_processed: true,
      stopped_processing: ['marketing', 'profiling'],
      reason,
      timestamp: new Date()
    };
  }

  private async countDataProcessingActivities(startDate: Date, endDate: Date): Promise<number> {
    // Mock implementation
    return 150;
  }

  private async countBreachNotifications(startDate: Date, endDate: Date): Promise<number> {
    // Mock implementation
    return 0;
  }

  private calculateComplianceScore(dsrRequests: DataSubjectRequest[]): number {
    if (dsrRequests.length === 0) return 1.0;

    const completedRequests = dsrRequests.filter(req => req.status === 'COMPLETED').length;
    return completedRequests / dsrRequests.length;
  }

  private generateComplianceRecommendations(
    score: number,
    dsrRequests: DataSubjectRequest[]
  ): string[] {
    const recommendations: string[] = [];

    if (score < 0.9) {
      recommendations.push('Improve DSR processing time and completion rate');
    }

    if (dsrRequests.some(req => req.status === 'REJECTED')) {
      recommendations.push('Review rejected DSR requests and improve handling procedures');
    }

    recommendations.push('Conduct regular GDPR compliance audits');
    recommendations.push('Update privacy policies and consent mechanisms');
    recommendations.push('Provide GDPR training to staff');

    return recommendations;
  }

  private isValidLawfulBasis(basis: string): boolean {
    const validBases = [
      'consent',
      'contract',
      'legal_obligation',
      'vital_interests',
      'public_task',
      'legitimate_interests'
    ];
    return validBases.includes(basis.toLowerCase());
  }

  private isValidRetentionPeriod(period: string): boolean {
    // Simple validation - in reality, this would be more sophisticated
    return period && period.trim().length > 0 && !period.toLowerCase().includes('indefinite');
  }

  private requiresBreachNotification(incident: any): boolean {
    // GDPR Article 33 - notification required if likely to result in risk to rights and freedoms
    return incident.riskLevel === 'HIGH' || incident.riskLevel === 'CRITICAL' || 
           incident.affectedSubjects > 100;
  }

  private generateBreachNotificationTemplate(incident: any): string {
    return `
GDPR Breach Notification Template

Incident Details:
- Risk Level: ${incident.riskLevel}
- Affected Data Subjects: ${incident.affectedSubjects}
- Data Types Involved: ${incident.dataTypes.join(', ')}
- Containment Time: ${incident.containmentTime} hours
- Description: ${incident.description}

Likely Consequences:
[To be filled based on incident assessment]

Measures Taken:
[To be filled with containment and mitigation measures]

Contact Information:
Data Protection Officer: ${config.dataProtectionOfficer || 'dpo@example.com'}
    `.trim();
  }

  /**
   * Get DSR request by ID
   */
  getDSRRequest(requestId: string): DataSubjectRequest | undefined {
    return this.dsrRequests.get(requestId);
  }

  /**
   * List all DSR requests
   */
  listDSRRequests(filters?: {
    status?: string;
    type?: string;
    dataSubject?: string;
  }): DataSubjectRequest[] {
    let requests = Array.from(this.dsrRequests.values());

    if (filters?.status) {
      requests = requests.filter(req => req.status === filters.status);
    }

    if (filters?.type) {
      requests = requests.filter(req => req.type === filters.type);
    }

    if (filters?.dataSubject) {
      requests = requests.filter(req => req.dataSubject === filters.dataSubject);
    }

    return requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }
}