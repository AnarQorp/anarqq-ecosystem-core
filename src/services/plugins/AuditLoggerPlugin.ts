/**
 * Audit Logger Plugin
 * Example plugin that logs wallet operations for audit purposes
 */

import { BaseQwalletPlugin } from '../BaseQwalletPlugin';
import { 
  QwalletPluginType, 
  AuditPlugin,
  WalletOperation,
  WalletTransaction
} from '../../types/qwallet-plugin';
import { IdentityType } from '../../types/identity';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  identityId: string;
  operationType: string;
  details: any;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class AuditLoggerPlugin extends BaseQwalletPlugin implements AuditPlugin {
  private auditLogs: AuditLogEntry[] = [];
  private maxLogEntries: number = 1000;

  constructor() {
    super(
      'audit-logger',
      'Audit Logger',
      '1.0.0',
      QwalletPluginType.AUDIT,
      'Logs wallet operations for audit and compliance purposes',
      'Qwallet Team',
      {
        capabilities: ['audit_logging', 'compliance_reporting', 'risk_assessment'],
        requiredPermissions: ['audit:read', 'audit:write'],
        supportedIdentityTypes: Object.values(IdentityType),
        metadata: {
          license: 'MIT',
          tags: ['audit', 'compliance', 'logging']
        }
      }
    );
  }

  protected async onActivate(): Promise<void> {
    this.log('info', 'Audit Logger Plugin activated');
    
    // Load existing audit logs from storage
    const savedLogs = await this.getStorageValue('audit_logs');
    if (savedLogs && Array.isArray(savedLogs)) {
      this.auditLogs = savedLogs;
      this.log('info', `Loaded ${this.auditLogs.length} existing audit log entries`);
    }

    // Set default configuration
    this.maxLogEntries = this.getConfigValue('maxLogEntries', 1000);
  }

  protected async onDeactivate(): Promise<void> {
    this.log('info', 'Audit Logger Plugin deactivated');
    
    // Save audit logs to storage
    await this.setStorageValue('audit_logs', this.auditLogs);
  }

  protected async onConfigure(config: Record<string, any>): Promise<void> {
    if (config.maxLogEntries && typeof config.maxLogEntries === 'number') {
      this.maxLogEntries = config.maxLogEntries;
      this.log('info', `Updated max log entries to ${this.maxLogEntries}`);
    }
  }

  // Implement AuditPlugin interface
  async logTransaction(transaction: WalletTransaction): Promise<void> {
    const logEntry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      identityId: transaction.identityId,
      operationType: 'TRANSACTION',
      details: {
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        token: transaction.token,
        fromAddress: transaction.fromAddress,
        toAddress: transaction.toAddress,
        status: transaction.status
      },
      riskLevel: this.assessTransactionRisk(transaction)
    };

    await this.addLogEntry(logEntry);
    this.log('debug', `Logged transaction: ${transaction.transactionId}`);
  }

  async generateReport(identityId: string, period: { start: string; end: string }): Promise<any> {
    const startDate = new Date(period.start);
    const endDate = new Date(period.end);

    const filteredLogs = this.auditLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return log.identityId === identityId && 
             logDate >= startDate && 
             logDate <= endDate;
    });

    const report = {
      identityId,
      period,
      totalOperations: filteredLogs.length,
      operationsByType: this.groupByOperationType(filteredLogs),
      riskDistribution: this.groupByRiskLevel(filteredLogs),
      timeline: this.createTimeline(filteredLogs),
      generatedAt: new Date().toISOString()
    };

    this.log('info', `Generated audit report for ${identityId}: ${filteredLogs.length} operations`);
    return report;
  }

  // Override wallet operation hook
  async onWalletOperation(operation: WalletOperation): Promise<void> {
    const logEntry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      identityId: operation.identityId,
      operationType: operation.operationType,
      details: {
        amount: operation.amount,
        token: operation.token,
        recipient: operation.recipient,
        metadata: operation.metadata
      },
      riskLevel: this.assessOperationRisk(operation)
    };

    await this.addLogEntry(logEntry);
    this.log('debug', `Logged wallet operation: ${operation.operationType}`);
  }

  // Override transaction complete hook
  async onTransactionComplete(transaction: WalletTransaction): Promise<void> {
    await this.logTransaction(transaction);
  }

  // Public methods for accessing audit data
  async getAuditLogs(identityId?: string): Promise<AuditLogEntry[]> {
    if (identityId) {
      return this.auditLogs.filter(log => log.identityId === identityId);
    }
    return [...this.auditLogs];
  }

  async getAuditLogsByRisk(riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): Promise<AuditLogEntry[]> {
    return this.auditLogs.filter(log => log.riskLevel === riskLevel);
  }

  async clearAuditLogs(identityId?: string): Promise<void> {
    if (identityId) {
      this.auditLogs = this.auditLogs.filter(log => log.identityId !== identityId);
    } else {
      this.auditLogs = [];
    }
    
    await this.setStorageValue('audit_logs', this.auditLogs);
    this.log('info', `Cleared audit logs${identityId ? ` for ${identityId}` : ''}`);
  }

  // Private helper methods
  private async addLogEntry(entry: AuditLogEntry): Promise<void> {
    this.auditLogs.push(entry);

    // Maintain max log entries limit
    if (this.auditLogs.length > this.maxLogEntries) {
      this.auditLogs = this.auditLogs.slice(-this.maxLogEntries);
    }

    // Save to storage periodically (every 10 entries)
    if (this.auditLogs.length % 10 === 0) {
      await this.setStorageValue('audit_logs', this.auditLogs);
    }
  }

  private assessOperationRisk(operation: WalletOperation): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Simple risk assessment based on operation type and amount
    if (operation.operationType === 'TRANSFER' && operation.amount) {
      if (operation.amount > 10000) return 'CRITICAL';
      if (operation.amount > 1000) return 'HIGH';
      if (operation.amount > 100) return 'MEDIUM';
    }

    if (['MINT', 'BURN'].includes(operation.operationType)) {
      return 'HIGH';
    }

    return 'LOW';
  }

  private assessTransactionRisk(transaction: WalletTransaction): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Simple risk assessment based on transaction amount and status
    if (transaction.status === 'FAILED') return 'MEDIUM';
    
    if (transaction.amount > 10000) return 'CRITICAL';
    if (transaction.amount > 1000) return 'HIGH';
    if (transaction.amount > 100) return 'MEDIUM';
    
    return 'LOW';
  }

  private groupByOperationType(logs: AuditLogEntry[]): Record<string, number> {
    return logs.reduce((acc, log) => {
      acc[log.operationType] = (acc[log.operationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupByRiskLevel(logs: AuditLogEntry[]): Record<string, number> {
    return logs.reduce((acc, log) => {
      acc[log.riskLevel] = (acc[log.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private createTimeline(logs: AuditLogEntry[]): Array<{ date: string; count: number }> {
    const timeline = logs.reduce((acc, log) => {
      const date = log.timestamp.split('T')[0]; // Get date part only
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(timeline)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}