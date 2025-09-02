import { logger } from '../utils/logger.js';

export class AuditService {
  constructor(qerberosService, config) {
    this.qerberos = qerberosService;
    this.config = config;
  }

  async logFileUpload(actor, fileMetadata) {
    try {
      logger.debug(`Auditing file upload: ${fileMetadata.cid}`);
      
      const result = await this.qerberos.logFileUpload(actor, fileMetadata);
      
      if (!result.success) {
        logger.error(`Failed to audit file upload: ${result.error}`);
        // Don't throw - audit failure shouldn't block operations
      }
      
      return result;
    } catch (error) {
      logger.error('File upload audit failed:', error);
      // Don't throw - audit is not critical for operation
    }
  }

  async logFileAccess(actor, fileMetadata, accessType = 'download') {
    try {
      logger.debug(`Auditing file access: ${fileMetadata.cid}`);
      
      const result = await this.qerberos.logFileAccess(actor, fileMetadata, accessType);
      
      if (!result.success) {
        logger.error(`Failed to audit file access: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      logger.error('File access audit failed:', error);
    }
  }

  async logFileShare(actor, cid, shareData) {
    try {
      logger.debug(`Auditing file share: ${cid}`);
      
      const result = await this.qerberos.logFileShare(actor, cid, shareData);
      
      if (!result.success) {
        logger.error(`Failed to audit file share: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      logger.error('File share audit failed:', error);
    }
  }

  async logFileDeletion(actor, fileMetadata, reason = 'user_request') {
    try {
      logger.debug(`Auditing file deletion: ${fileMetadata.cid}`);
      
      const result = await this.qerberos.logFileDeletion(actor, fileMetadata, reason);
      
      if (!result.success) {
        logger.error(`Failed to audit file deletion: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      logger.error('File deletion audit failed:', error);
    }
  }

  async logMetadataUpdate(actor, cid, updates) {
    try {
      logger.debug(`Auditing metadata update: ${cid}`);
      
      const result = await this.qerberos.logMetadataUpdate(actor, cid, updates);
      
      if (!result.success) {
        logger.error(`Failed to audit metadata update: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Metadata update audit failed:', error);
    }
  }

  async logFileList(actor, filters) {
    try {
      logger.debug(`Auditing file list: ${actor.squidId}`);
      
      const result = await this.qerberos.logFileList(actor, filters);
      
      if (!result.success) {
        logger.error(`Failed to audit file list: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      logger.error('File list audit failed:', error);
    }
  }

  async calculateRiskScore(actor, context = {}) {
    try {
      logger.debug(`Calculating risk score: ${actor.squidId}`);
      
      const result = await this.qerberos.riskScore(actor, context);
      
      if (!result.success) {
        logger.error(`Failed to calculate risk score: ${result.error}`);
        return { riskScore: 0.5, level: 'medium' }; // Default medium risk
      }
      
      return result;
    } catch (error) {
      logger.error('Risk score calculation failed:', error);
      return { riskScore: 0.5, level: 'medium' }; // Default medium risk
    }
  }

  async reportAnomaly(anomalyData) {
    try {
      logger.debug(`Reporting anomaly: ${anomalyData.type}`);
      
      const result = await this.qerberos.reportAnomaly(anomalyData);
      
      if (!result.success) {
        logger.error(`Failed to report anomaly: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Anomaly reporting failed:', error);
    }
  }
}