/**
 * Receipt Service
 * Handles cryptographic delivery receipts
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class ReceiptService {
  constructor(dependencies) {
    this.encryption = dependencies.encryption;
    this.qlock = dependencies.qlock;
    this.qerberos = dependencies.qerberos;
    this.ipfs = dependencies.ipfs;
    this.event = dependencies.event;
    
    // In-memory receipt store for demo
    this.receipts = new Map();
  }

  /**
   * Generate delivery receipt
   */
  async generateReceipt(messageId, recipientId, receiptType = 'DELIVERY') {
    const receiptId = `rcpt_${uuidv4().replace(/-/g, '')}`;
    const timestamp = new Date().toISOString();

    try {
      console.log(`[ReceiptService] Generating ${receiptType} receipt ${receiptId} for message ${messageId}`);

      // Create receipt data
      const receiptData = {
        receiptId,
        messageId,
        recipientId,
        receiptType,
        timestamp,
        deliveryTimestamp: receiptType === 'DELIVERY' ? timestamp : null,
        readTimestamp: receiptType === 'READ' ? timestamp : null,
        certificationLevel: 'ENHANCED',
        legallyBinding: true,
        complianceStandards: ['GDPR', 'SOX'],
        metadata: {
          deviceInfo: {
            userAgent: 'hash:user_agent_123',
            ipAddress: 'hash:ip_address_456',
            geolocation: 'US-CA'
          },
          networkLatency: Math.random() * 200 + 50, // 50-250ms
          encryptionVerified: true,
          integrityVerified: true
        }
      };

      // Generate cryptographic signature
      const signature = await this.qlock.sign({
        data: JSON.stringify(receiptData),
        signerId: recipientId
      });

      receiptData.signature = signature.signature;

      // Generate verification hash
      const verificationHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(receiptData))
        .digest('hex');

      receiptData.verificationHash = verificationHash;

      // Encode receipt data
      const encodedReceiptData = Buffer.from(JSON.stringify(receiptData)).toString('base64');
      receiptData.receiptData = encodedReceiptData;

      // Store in IPFS
      const ipfsCid = await this.ipfs.storeReceipt(receiptData);
      receiptData.ipfsCid = ipfsCid;

      // Store locally
      this.receipts.set(receiptId, receiptData);

      // Publish event
      await this.event.publishEvent('q.qmail.receipt.generated.v1', {
        receiptId,
        messageId,
        senderId: receiptData.senderId, // Would be retrieved from message
        recipientId,
        receiptType,
        timestamp,
        deliveryTimestamp: receiptData.deliveryTimestamp,
        readTimestamp: receiptData.readTimestamp,
        signature: signature.signature,
        verificationHash,
        ipfsCid,
        certificationLevel: receiptData.certificationLevel,
        legallyBinding: receiptData.legallyBinding,
        complianceStandards: receiptData.complianceStandards,
        metadata: receiptData.metadata
      });

      // Log audit event
      await this.qerberos.logAuditEvent({
        type: 'RECEIPT_GENERATED',
        actor: recipientId,
        resource: receiptId,
        details: {
          messageId,
          receiptType,
          certificationLevel: receiptData.certificationLevel,
          legallyBinding: receiptData.legallyBinding
        }
      });

      console.log(`[ReceiptService] Receipt ${receiptId} generated successfully`);

      return {
        receiptId,
        receiptData: encodedReceiptData,
        timestamp,
        verified: true,
        signature: signature.signature
      };

    } catch (error) {
      console.error(`[ReceiptService] Failed to generate receipt ${receiptId}:`, error);
      throw error;
    }
  }

  /**
   * Verify delivery receipt
   */
  async verifyReceipt(receiptId, receiptData) {
    try {
      console.log(`[ReceiptService] Verifying receipt ${receiptId}`);

      // Decode receipt data
      let decodedData;
      try {
        decodedData = JSON.parse(Buffer.from(receiptData, 'base64').toString());
      } catch (decodeError) {
        throw new Error('Invalid receipt data format');
      }

      // Verify receipt exists
      const storedReceipt = this.receipts.get(receiptId);
      if (!storedReceipt) {
        throw new Error('Receipt not found');
      }

      // Verify signature
      const signatureValid = await this.qlock.verify({
        data: JSON.stringify({
          ...decodedData,
          signature: undefined,
          receiptData: undefined
        }),
        signature: decodedData.signature,
        signerId: decodedData.recipientId
      });

      if (!signatureValid.valid) {
        throw new Error('Invalid receipt signature');
      }

      // Verify hash
      const expectedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({
          ...decodedData,
          receiptData: undefined
        }))
        .digest('hex');

      if (expectedHash !== decodedData.verificationHash) {
        throw new Error('Receipt integrity verification failed');
      }

      // Log verification
      await this.qerberos.logAuditEvent({
        type: 'RECEIPT_VERIFIED',
        actor: 'system',
        resource: receiptId,
        details: {
          messageId: decodedData.messageId,
          verificationResult: 'VALID'
        }
      });

      console.log(`[ReceiptService] Receipt ${receiptId} verified successfully`);

      return {
        receiptId,
        verified: true,
        timestamp: new Date().toISOString(),
        details: {
          messageId: decodedData.messageId,
          receiptType: decodedData.receiptType,
          originalTimestamp: decodedData.timestamp,
          certificationLevel: decodedData.certificationLevel,
          legallyBinding: decodedData.legallyBinding
        }
      };

    } catch (error) {
      console.error(`[ReceiptService] Failed to verify receipt ${receiptId}:`, error);
      
      // Log verification failure
      await this.qerberos.logAuditEvent({
        type: 'RECEIPT_VERIFICATION_FAILED',
        actor: 'system',
        resource: receiptId,
        details: {
          error: error.message
        }
      });

      throw error;
    }
  }

  /**
   * Get receipts for a message
   */
  async getMessageReceipts(messageId, requesterId) {
    try {
      console.log(`[ReceiptService] Getting receipts for message ${messageId}`);

      // Find all receipts for the message
      const messageReceipts = Array.from(this.receipts.values())
        .filter(receipt => receipt.messageId === messageId);

      // Check if requester has access to these receipts
      // (sender should be able to see delivery receipts)
      const accessibleReceipts = messageReceipts.map(receipt => ({
        receiptId: receipt.receiptId,
        recipientId: receipt.recipientId,
        timestamp: receipt.timestamp,
        status: receipt.receiptType,
        signature: receipt.signature
      }));

      // Log access
      await this.qerberos.logAuditEvent({
        type: 'RECEIPTS_ACCESSED',
        actor: requesterId,
        resource: messageId,
        details: {
          receiptCount: accessibleReceipts.length
        }
      });

      return {
        messageId,
        receipts: accessibleReceipts
      };

    } catch (error) {
      console.error(`[ReceiptService] Failed to get receipts for message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Get receipt by ID
   */
  async getReceipt(receiptId, requesterId) {
    try {
      console.log(`[ReceiptService] Getting receipt ${receiptId}`);

      const receipt = this.receipts.get(receiptId);
      if (!receipt) {
        throw new Error('Receipt not found');
      }

      // Log access
      await this.qerberos.logAuditEvent({
        type: 'RECEIPT_ACCESSED',
        actor: requesterId,
        resource: receiptId,
        details: {
          messageId: receipt.messageId
        }
      });

      return {
        receiptId: receipt.receiptId,
        messageId: receipt.messageId,
        receiptType: receipt.receiptType,
        timestamp: receipt.timestamp,
        signature: receipt.signature,
        verificationHash: receipt.verificationHash,
        certificationLevel: receipt.certificationLevel,
        legallyBinding: receipt.legallyBinding,
        complianceStandards: receipt.complianceStandards
      };

    } catch (error) {
      console.error(`[ReceiptService] Failed to get receipt ${receiptId}:`, error);
      throw error;
    }
  }

  /**
   * Generate compliance report for receipts
   */
  async generateComplianceReport(criteria) {
    try {
      console.log('[ReceiptService] Generating compliance report');

      const allReceipts = Array.from(this.receipts.values());
      
      // Filter receipts based on criteria
      let filteredReceipts = allReceipts;
      
      if (criteria.dateRange) {
        const startDate = new Date(criteria.dateRange.start);
        const endDate = new Date(criteria.dateRange.end);
        filteredReceipts = filteredReceipts.filter(receipt => {
          const receiptDate = new Date(receipt.timestamp);
          return receiptDate >= startDate && receiptDate <= endDate;
        });
      }

      if (criteria.complianceStandard) {
        filteredReceipts = filteredReceipts.filter(receipt =>
          receipt.complianceStandards.includes(criteria.complianceStandard)
        );
      }

      // Generate report
      const report = {
        reportId: `report_${uuidv4().replace(/-/g, '')}`,
        generatedAt: new Date().toISOString(),
        criteria,
        summary: {
          totalReceipts: filteredReceipts.length,
          legallyBindingReceipts: filteredReceipts.filter(r => r.legallyBinding).length,
          receiptTypes: this.groupBy(filteredReceipts, 'receiptType'),
          certificationLevels: this.groupBy(filteredReceipts, 'certificationLevel'),
          complianceStandards: this.getComplianceStandardsStats(filteredReceipts)
        },
        receipts: filteredReceipts.map(receipt => ({
          receiptId: receipt.receiptId,
          messageId: receipt.messageId,
          timestamp: receipt.timestamp,
          receiptType: receipt.receiptType,
          certificationLevel: receipt.certificationLevel,
          legallyBinding: receipt.legallyBinding,
          complianceStandards: receipt.complianceStandards
        }))
      };

      // Log report generation
      await this.qerberos.logAuditEvent({
        type: 'COMPLIANCE_REPORT_GENERATED',
        actor: 'system',
        resource: report.reportId,
        details: {
          receiptCount: filteredReceipts.length,
          criteria
        }
      });

      return report;

    } catch (error) {
      console.error('[ReceiptService] Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Helper function to group array by property
   */
  groupBy(array, property) {
    return array.reduce((groups, item) => {
      const key = item[property];
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {});
  }

  /**
   * Get compliance standards statistics
   */
  getComplianceStandardsStats(receipts) {
    const stats = {};
    receipts.forEach(receipt => {
      receipt.complianceStandards.forEach(standard => {
        stats[standard] = (stats[standard] || 0) + 1;
      });
    });
    return stats;
  }
}