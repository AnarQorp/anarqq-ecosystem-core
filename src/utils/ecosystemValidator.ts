/**
 * Ecosystem Compliance Validator
 * 
 * Validates that all file operations follow the Q∞ architecture
 * and comply with the AnarQ&Q ecosystem specification.
 */

import { QsocialFileAttachment, EcosystemFileData } from '../types/qsocial';

export interface EcosystemValidationResult {
  isValid: boolean;
  compliance: {
    squidIdentity: boolean;
    qonsentProfile: boolean;
    qlockEncryption: boolean;
    ipfsCid: boolean;
    qindexRegistration: boolean;
    qerberosLogging: boolean;
    qnetRouting: boolean;
  };
  errors: string[];
  warnings: string[];
  score: number; // 0-100
}

export class EcosystemValidator {
  /**
   * Validate complete ecosystem compliance for a file attachment
   */
  static validateFileAttachment(attachment: QsocialFileAttachment): EcosystemValidationResult {
    const result: EcosystemValidationResult = {
      isValid: false,
      compliance: {
        squidIdentity: false,
        qonsentProfile: false,
        qlockEncryption: false,
        ipfsCid: false,
        qindexRegistration: false,
        qerberosLogging: false,
        qnetRouting: false,
      },
      errors: [],
      warnings: [],
      score: 0
    };

    // Validate basic file structure
    if (!attachment.fileId || !attachment.storjUrl || !attachment.ecosystem) {
      result.errors.push('Missing basic file attachment structure');
      return result;
    }

    // 1. Validate sQuid Identity Binding
    result.compliance.squidIdentity = this.validateSquidIdentity(attachment);
    if (!result.compliance.squidIdentity) {
      result.errors.push('sQuid identity binding validation failed');
    }

    // 2. Validate Qonsent Privacy Profile
    result.compliance.qonsentProfile = this.validateQonsentProfile(attachment.ecosystem);
    if (!result.compliance.qonsentProfile) {
      result.errors.push('Qonsent privacy profile validation failed');
    }

    // 3. Validate Qlock Encryption
    result.compliance.qlockEncryption = this.validateQlockEncryption(attachment.ecosystem);
    if (!result.compliance.qlockEncryption) {
      result.errors.push('Qlock encryption validation failed');
    }

    // 4. Validate IPFS CID
    result.compliance.ipfsCid = this.validateIPFSCid(attachment.ecosystem);
    if (!result.compliance.ipfsCid) {
      result.warnings.push('IPFS CID not generated (optional but recommended)');
    }

    // 5. Validate Qindex Registration
    result.compliance.qindexRegistration = this.validateQindexRegistration(attachment.ecosystem);
    if (!result.compliance.qindexRegistration) {
      result.errors.push('Qindex registration validation failed');
    }

    // 6. Validate Qerberos Logging (implied by successful upload)
    result.compliance.qerberosLogging = this.validateQerberosLogging(attachment);
    if (!result.compliance.qerberosLogging) {
      result.warnings.push('Qerberos event logging may not be complete');
    }

    // 7. Validate QNET Routing
    result.compliance.qnetRouting = this.validateQNETRouting(attachment.ecosystem);
    if (!result.compliance.qnetRouting) {
      result.errors.push('QNET routing validation failed');
    }

    // Calculate compliance score
    const complianceValues = Object.values(result.compliance);
    const trueCount = complianceValues.filter(Boolean).length;
    result.score = Math.round((trueCount / complianceValues.length) * 100);

    // Determine overall validity (must have core components)
    const coreComponents = [
      result.compliance.squidIdentity,
      result.compliance.qonsentProfile,
      result.compliance.qlockEncryption,
      result.compliance.qindexRegistration,
      result.compliance.qnetRouting
    ];
    result.isValid = coreComponents.every(Boolean) && result.errors.length === 0;

    return result;
  }

  /**
   * Validate sQuid identity binding
   */
  private static validateSquidIdentity(attachment: QsocialFileAttachment): boolean {
    // Check if file has proper identity attribution
    return !!(
      attachment.fileId &&
      attachment.storjKey &&
      attachment.storjKey.includes('/') // Should include user path
    );
  }

  /**
   * Validate Qonsent privacy profile
   */
  private static validateQonsentProfile(ecosystem: EcosystemFileData): boolean {
    const qonsent = ecosystem.qonsent;
    
    return !!(
      qonsent &&
      qonsent.profileId &&
      qonsent.visibility &&
      ['public', 'dao-only', 'private'].includes(qonsent.visibility) &&
      qonsent.encryptionLevel &&
      ['none', 'standard', 'high', 'quantum'].includes(qonsent.encryptionLevel)
    );
  }

  /**
   * Validate Qlock encryption
   */
  private static validateQlockEncryption(ecosystem: EcosystemFileData): boolean {
    const qlock = ecosystem.qlock;
    
    return !!(
      qlock &&
      typeof qlock.encrypted === 'boolean' &&
      qlock.encryptionLevel &&
      ['none', 'standard', 'high', 'quantum'].includes(qlock.encryptionLevel)
    );
  }

  /**
   * Validate IPFS CID generation
   */
  private static validateIPFSCid(ecosystem: EcosystemFileData): boolean {
    const ipfs = ecosystem.ipfs;
    
    return !!(
      ipfs &&
      typeof ipfs.generated === 'boolean' &&
      (ipfs.cid || !ipfs.generated) // If generated is true, CID must exist
    );
  }

  /**
   * Validate Qindex registration
   */
  private static validateQindexRegistration(ecosystem: EcosystemFileData): boolean {
    const qindex = ecosystem.qindex;
    
    return !!(
      qindex &&
      qindex.indexId &&
      typeof qindex.searchable === 'boolean'
    );
  }

  /**
   * Validate Qerberos logging (basic check)
   */
  private static validateQerberosLogging(attachment: QsocialFileAttachment): boolean {
    // Basic validation - in production would check actual logs
    return !!(
      attachment.uploadedAt &&
      attachment.processingTime !== undefined
    );
  }

  /**
   * Validate QNET routing
   */
  private static validateQNETRouting(ecosystem: EcosystemFileData): boolean {
    const qnet = ecosystem.qnet;
    
    return !!(
      qnet &&
      qnet.routingId &&
      qnet.routedUrl &&
      qnet.routedUrl.startsWith('http')
    );
  }

  /**
   * Validate multiple file attachments
   */
  static validateMultipleAttachments(attachments: QsocialFileAttachment[]): {
    overallValid: boolean;
    results: EcosystemValidationResult[];
    summary: {
      totalFiles: number;
      validFiles: number;
      averageScore: number;
      commonErrors: string[];
    };
  } {
    const results = attachments.map(attachment => 
      this.validateFileAttachment(attachment)
    );

    const validFiles = results.filter(r => r.isValid).length;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    // Find common errors
    const errorCounts: Record<string, number> = {};
    results.forEach(result => {
      result.errors.forEach(error => {
        errorCounts[error] = (errorCounts[error] || 0) + 1;
      });
    });

    const commonErrors = Object.entries(errorCounts)
      .filter(([_, count]) => count > 1)
      .map(([error, _]) => error);

    return {
      overallValid: validFiles === attachments.length,
      results,
      summary: {
        totalFiles: attachments.length,
        validFiles,
        averageScore: Math.round(averageScore),
        commonErrors
      }
    };
  }

  /**
   * Generate compliance report
   */
  static generateComplianceReport(result: EcosystemValidationResult): string {
    const lines = [
      '=== ECOSYSTEM COMPLIANCE REPORT ===',
      `Overall Valid: ${result.isValid ? '✅ YES' : '❌ NO'}`,
      `Compliance Score: ${result.score}/100`,
      '',
      '--- Component Compliance ---'
    ];

    Object.entries(result.compliance).forEach(([component, valid]) => {
      const icon = valid ? '✅' : '❌';
      const name = component.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      lines.push(`${icon} ${name}: ${valid ? 'PASS' : 'FAIL'}`);
    });

    if (result.errors.length > 0) {
      lines.push('', '--- Errors ---');
      result.errors.forEach(error => lines.push(`❌ ${error}`));
    }

    if (result.warnings.length > 0) {
      lines.push('', '--- Warnings ---');
      result.warnings.forEach(warning => lines.push(`⚠️ ${warning}`));
    }

    lines.push('', '=== END REPORT ===');
    
    return lines.join('\\n');
  }
}

export default EcosystemValidator;