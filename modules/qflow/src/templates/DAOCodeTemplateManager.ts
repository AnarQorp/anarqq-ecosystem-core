/**
 * DAO-Approved Code Template System
 * 
 * Implements code template validation, whitelisting, DAO governance workflow,
 * and template versioning with security scanning
 */

import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { WASMModule } from '../sandbox/WASMRuntime.js';

export interface CodeTemplate {
  templateId: string;
  name: string;
  version: string;
  description: string;
  category: 'utility' | 'integration' | 'computation' | 'data-processing' | 'custom';
  author: string;
  daoSubnet: string;
  code: {
    wasmModule?: Uint8Array;
    sourceCode?: string;
    language: 'wasm' | 'assemblyscript' | 'rust' | 'c' | 'javascript';
  };
  metadata: {
    capabilities: string[];
    requiredPermissions: string[];
    resourceRequirements: {
      maxMemoryMB: number;
      maxCpuTimeMs: number;
      maxExecutionTimeMs: number;
    };
    dependencies: string[];
    tags: string[];
  };
  approval: {
    status: 'pending' | 'approved' | 'rejected' | 'deprecated';
    approvedBy?: string[];
    rejectedBy?: string[];
    approvalDate?: string;
    rejectionReason?: string;
    votes: TemplateVote[];
    requiredVotes: number;
  };
  security: {
    scanResults: SecurityScanResult[];
    riskScore: number; // 0-100, lower is better
    vulnerabilities: SecurityVulnerability[];
    lastScanned: string;
  };
  usage: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastUsed?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVote {
  voteId: string;
  voter: string;
  vote: 'approve' | 'reject' | 'abstain';
  reason?: string;
  timestamp: string;
  signature: string;
  weight: number;
}

export interface SecurityScanResult {
  scanId: string;
  scanType: 'static-analysis' | 'dynamic-analysis' | 'dependency-check' | 'vulnerability-scan';
  score: number; // 0-100
  issues: SecurityIssue[];
  recommendations: string[];
  scannedAt: string;
  scannerVersion: string;
}

export interface SecurityIssue {
  issueId: string;
  type: 'buffer-overflow' | 'memory-leak' | 'unsafe-operation' | 'malicious-code' | 'dependency-vulnerability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: {
    file?: string;
    line?: number;
    function?: string;
  };
  cwe?: string; // Common Weakness Enumeration ID
  cvss?: number; // Common Vulnerability Scoring System
  mitigation?: string;
  falsePositive?: boolean;
}

export interface SecurityVulnerability {
  vulnerabilityId: string;
  cve?: string; // Common Vulnerabilities and Exposures ID
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedVersions: string[];
  patchAvailable: boolean;
  patchVersion?: string;
  discoveredAt: string;
}

export interface TemplateSubmission {
  submissionId: string;
  templateId: string;
  submitter: string;
  daoSubnet: string;
  submittedAt: string;
  reviewDeadline: string;
  reviewers: string[];
  status: 'submitted' | 'under-review' | 'approved' | 'rejected' | 'withdrawn';
}

export interface DAOGovernanceConfig {
  requiredApprovals: number;
  reviewPeriodDays: number;
  enableQuadraticVoting: boolean;
  minSecurityScore: number;
  maxRiskScore: number;
  autoApproveThreshold?: number;
  autoRejectThreshold?: number;
}

/**
 * DAO Code Template Manager
 */
export class DAOCodeTemplateManager extends EventEmitter {
  private templates = new Map<string, CodeTemplate>();
  private submissions = new Map<string, TemplateSubmission>();
  private whitelistedTemplates = new Set<string>();
  private deprecatedTemplates = new Set<string>();
  
  private readonly governanceConfig: DAOGovernanceConfig;
  private isRunning: boolean = false;

  constructor(config: Partial<DAOGovernanceConfig> = {}) {
    super();
    
    this.governanceConfig = {
      requiredApprovals: 3,
      reviewPeriodDays: 7,
      enableQuadraticVoting: true,
      minSecurityScore: 80,
      maxRiskScore: 20,
      autoApproveThreshold: 95,
      autoRejectThreshold: 30,
      ...config
    };

    this.setupEventHandlers();
  }

  /**
   * Start template manager
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Load existing templates and submissions
    await this.loadExistingData();

    // Start periodic tasks
    this.startPeriodicTasks();

    console.log('[DAOCodeTemplateManager] Started template management system');

    // Emit started event
    await qflowEventEmitter.emit('q.qflow.template.manager.started.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-template-manager',
      actor: 'system',
      data: {
        config: this.governanceConfig,
        totalTemplates: this.templates.size,
        whitelistedTemplates: this.whitelistedTemplates.size
      }
    });
  }

  /**
   * Stop template manager
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('[DAOCodeTemplateManager] Stopped template management system');
  }

  /**
   * Submit template for DAO approval
   */
  async submitTemplate(
    templateData: Omit<CodeTemplate, 'templateId' | 'approval' | 'security' | 'usage' | 'createdAt' | 'updatedAt'>,
    submitter: string
  ): Promise<string> {
    const templateId = this.generateTemplateId();
    const submissionId = this.generateSubmissionId();

    // Create template
    const template: CodeTemplate = {
      ...templateData,
      templateId,
      approval: {
        status: 'pending',
        votes: [],
        requiredVotes: this.governanceConfig.requiredApprovals
      },
      security: {
        scanResults: [],
        riskScore: 100, // Start with highest risk
        vulnerabilities: [],
        lastScanned: new Date().toISOString()
      },
      usage: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create submission
    const submission: TemplateSubmission = {
      submissionId,
      templateId,
      submitter,
      daoSubnet: templateData.daoSubnet,
      submittedAt: new Date().toISOString(),
      reviewDeadline: new Date(Date.now() + this.governanceConfig.reviewPeriodDays * 24 * 60 * 60 * 1000).toISOString(),
      reviewers: [], // Would be assigned based on DAO governance
      status: 'submitted'
    };

    // Store template and submission
    this.templates.set(templateId, template);
    this.submissions.set(submissionId, submission);

    console.log(`[DAOCodeTemplateManager] Template submitted: ${templateId} by ${submitter}`);

    // Start security scanning
    await this.performSecurityScan(template);

    // Emit submission event
    await qflowEventEmitter.emit('q.qflow.template.submitted.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-template-manager',
      actor: submitter,
      data: {
        templateId,
        submissionId,
        name: template.name,
        category: template.category,
        daoSubnet: template.daoSubnet
      }
    });

    // Check for auto-approval/rejection
    await this.checkAutoDecision(template);

    return templateId;
  }

  /**
   * Vote on template approval
   */
  async voteOnTemplate(
    templateId: string,
    voter: string,
    vote: 'approve' | 'reject' | 'abstain',
    weight: number = 1,
    reason?: string
  ): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template || template.approval.status !== 'pending') {
      throw new Error(`Template ${templateId} not found or not pending approval`);
    }

    // Check if voter already voted
    const existingVote = template.approval.votes.find(v => v.voter === voter);
    if (existingVote) {
      throw new Error(`Voter ${voter} has already voted on template ${templateId}`);
    }

    const voteObj: TemplateVote = {
      voteId: this.generateVoteId(),
      voter,
      vote,
      reason,
      timestamp: new Date().toISOString(),
      signature: await this.signVote(templateId, vote, voter),
      weight: this.governanceConfig.enableQuadraticVoting ? weight : 1
    };

    template.approval.votes.push(voteObj);
    template.updatedAt = new Date().toISOString();

    console.log(`[DAOCodeTemplateManager] Vote cast: ${vote} on template ${templateId} by ${voter}`);

    // Emit vote event
    await qflowEventEmitter.emit('q.qflow.template.voted.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-template-manager',
      actor: voter,
      data: {
        templateId,
        vote,
        weight,
        totalVotes: template.approval.votes.length,
        requiredVotes: template.approval.requiredVotes
      }
    });

    // Check if approval threshold is reached
    await this.checkApprovalThreshold(template);
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): CodeTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get approved templates
   */
  getApprovedTemplates(daoSubnet?: string): CodeTemplate[] {
    return Array.from(this.templates.values()).filter(template => {
      const isApproved = template.approval.status === 'approved';
      const matchesDAO = !daoSubnet || template.daoSubnet === daoSubnet;
      return isApproved && matchesDAO;
    });
  }

  /**
   * Get whitelisted templates
   */
  getWhitelistedTemplates(): string[] {
    return Array.from(this.whitelistedTemplates);
  }

  /**
   * Check if template is approved and whitelisted
   */
  isTemplateApproved(templateId: string): boolean {
    const template = this.templates.get(templateId);
    return template?.approval.status === 'approved' && this.whitelistedTemplates.has(templateId);
  }

  /**
   * Update template usage statistics
   */
  async updateTemplateUsage(
    templateId: string,
    success: boolean,
    executionTimeMs: number
  ): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      return;
    }

    template.usage.totalExecutions++;
    if (success) {
      template.usage.successfulExecutions++;
    } else {
      template.usage.failedExecutions++;
    }

    // Update average execution time
    template.usage.averageExecutionTime = 
      (template.usage.averageExecutionTime + executionTimeMs) / 2;
    
    template.usage.lastUsed = new Date().toISOString();
    template.updatedAt = new Date().toISOString();

    // Emit usage update event
    await qflowEventEmitter.emit('q.qflow.template.usage.updated.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-template-manager',
      actor: 'system',
      data: {
        templateId,
        success,
        executionTimeMs,
        totalExecutions: template.usage.totalExecutions,
        successRate: template.usage.successfulExecutions / template.usage.totalExecutions
      }
    });
  }

  /**
   * Deprecate template
   */
  async deprecateTemplate(templateId: string, reason: string, deprecatedBy: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    template.approval.status = 'deprecated';
    template.approval.rejectionReason = reason;
    template.updatedAt = new Date().toISOString();

    this.whitelistedTemplates.delete(templateId);
    this.deprecatedTemplates.add(templateId);

    console.log(`[DAOCodeTemplateManager] Template deprecated: ${templateId} - ${reason}`);

    // Emit deprecation event
    await qflowEventEmitter.emit('q.qflow.template.deprecated.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-template-manager',
      actor: deprecatedBy,
      data: {
        templateId,
        reason,
        name: template.name,
        totalExecutions: template.usage.totalExecutions
      }
    });
  }

  /**
   * Get template statistics
   */
  getTemplateStatistics(): {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byDAO: Record<string, number>;
  } {
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byDAO: Record<string, number> = {};

    for (const template of this.templates.values()) {
      byStatus[template.approval.status] = (byStatus[template.approval.status] || 0) + 1;
      byCategory[template.category] = (byCategory[template.category] || 0) + 1;
      byDAO[template.daoSubnet] = (byDAO[template.daoSubnet] || 0) + 1;
    }

    return {
      total: this.templates.size,
      byStatus,
      byCategory,
      byDAO
    };
  }

  // Private methods

  private setupEventHandlers(): void {
    // Set up event handlers for template lifecycle
    this.on('template:security-scan-complete', async (templateId: string) => {
      await this.checkAutoDecision(this.templates.get(templateId)!);
    });
  }

  private async loadExistingData(): Promise<void> {
    // In real implementation, would load from persistent storage
    console.log('[DAOCodeTemplateManager] Loading existing templates and submissions');
  }

  private startPeriodicTasks(): void {
    // Check for expired review periods
    setInterval(() => {
      this.checkExpiredReviews();
    }, 60000); // Every minute

    // Perform periodic security scans
    setInterval(() => {
      this.performPeriodicSecurityScans();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  private async performSecurityScan(template: CodeTemplate): Promise<void> {
    console.log(`[DAOCodeTemplateManager] Starting security scan for template: ${template.templateId}`);

    const scanResults: SecurityScanResult[] = [];

    // Static analysis scan
    const staticScan = await this.performStaticAnalysis(template);
    scanResults.push(staticScan);

    // Dependency check
    if (template.metadata.dependencies.length > 0) {
      const depScan = await this.performDependencyCheck(template);
      scanResults.push(depScan);
    }

    // Vulnerability scan
    const vulnScan = await this.performVulnerabilityScan(template);
    scanResults.push(vulnScan);

    // Calculate overall risk score
    const riskScore = this.calculateRiskScore(scanResults);

    // Update template security info
    template.security.scanResults = scanResults;
    template.security.riskScore = riskScore;
    template.security.lastScanned = new Date().toISOString();
    template.updatedAt = new Date().toISOString();

    console.log(`[DAOCodeTemplateManager] Security scan completed: ${template.templateId} (risk: ${riskScore})`);

    // Emit scan complete event
    await qflowEventEmitter.emit('q.qflow.template.security.scanned.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-template-manager',
      actor: 'system',
      data: {
        templateId: template.templateId,
        riskScore,
        issuesFound: scanResults.reduce((sum, scan) => sum + scan.issues.length, 0),
        scanTypes: scanResults.map(scan => scan.scanType)
      }
    });

    this.emit('template:security-scan-complete', template.templateId);
  }

  private async performStaticAnalysis(template: CodeTemplate): Promise<SecurityScanResult> {
    const issues: SecurityIssue[] = [];
    let score = 100;

    // Mock static analysis - in real implementation would use proper tools
    
    // Check for unsafe operations in source code
    if (template.code.sourceCode) {
      const unsafePatterns = [
        'malloc', 'free', 'strcpy', 'strcat', 'sprintf',
        'system', 'exec', 'eval', 'setTimeout', 'setInterval'
      ];

      for (const pattern of unsafePatterns) {
        if (template.code.sourceCode.includes(pattern)) {
          issues.push({
            issueId: this.generateIssueId(),
            type: 'unsafe-operation',
            severity: 'medium',
            description: `Potentially unsafe operation detected: ${pattern}`,
            cwe: 'CWE-120',
            mitigation: 'Use safe alternatives or add proper bounds checking'
          });
          score -= 10;
        }
      }
    }

    // Check resource requirements
    if (template.metadata.resourceRequirements.maxMemoryMB > 512) {
      issues.push({
        issueId: this.generateIssueId(),
        type: 'memory-leak',
        severity: 'low',
        description: 'High memory requirement may indicate inefficient code',
        mitigation: 'Optimize memory usage and add proper cleanup'
      });
      score -= 5;
    }

    return {
      scanId: this.generateScanId(),
      scanType: 'static-analysis',
      score: Math.max(0, score),
      issues,
      recommendations: [
        'Use memory-safe programming practices',
        'Avoid unsafe string operations',
        'Implement proper error handling',
        'Add input validation'
      ],
      scannedAt: new Date().toISOString(),
      scannerVersion: '1.0.0'
    };
  }

  private async performDependencyCheck(template: CodeTemplate): Promise<SecurityScanResult> {
    const issues: SecurityIssue[] = [];
    let score = 100;

    // Mock dependency check
    for (const dependency of template.metadata.dependencies) {
      // Check for known vulnerable dependencies
      if (dependency.includes('old-version') || dependency.includes('vulnerable')) {
        issues.push({
          issueId: this.generateIssueId(),
          type: 'dependency-vulnerability',
          severity: 'high',
          description: `Vulnerable dependency detected: ${dependency}`,
          cve: 'CVE-2023-12345',
          cvss: 7.5,
          mitigation: 'Update to latest secure version'
        });
        score -= 20;
      }
    }

    return {
      scanId: this.generateScanId(),
      scanType: 'dependency-check',
      score: Math.max(0, score),
      issues,
      recommendations: [
        'Keep dependencies up to date',
        'Use dependency scanning tools',
        'Monitor security advisories',
        'Minimize dependency count'
      ],
      scannedAt: new Date().toISOString(),
      scannerVersion: '1.0.0'
    };
  }

  private async performVulnerabilityScan(template: CodeTemplate): Promise<SecurityScanResult> {
    const issues: SecurityIssue[] = [];
    let score = 100;

    // Mock vulnerability scan
    if (template.code.wasmModule) {
      // Check WASM module for potential issues
      const moduleSize = template.code.wasmModule.length;
      
      if (moduleSize > 10 * 1024 * 1024) { // 10MB
        issues.push({
          issueId: this.generateIssueId(),
          type: 'malicious-code',
          severity: 'medium',
          description: 'Large WASM module may contain malicious code',
          mitigation: 'Review module contents and optimize size'
        });
        score -= 15;
      }
    }

    return {
      scanId: this.generateScanId(),
      scanType: 'vulnerability-scan',
      score: Math.max(0, score),
      issues,
      recommendations: [
        'Keep module size reasonable',
        'Use code obfuscation detection',
        'Implement runtime monitoring',
        'Regular security updates'
      ],
      scannedAt: new Date().toISOString(),
      scannerVersion: '1.0.0'
    };
  }

  private calculateRiskScore(scanResults: SecurityScanResult[]): number {
    let totalRisk = 0;
    let totalScans = scanResults.length;

    for (const scan of scanResults) {
      // Convert security score to risk score (inverse)
      const riskContribution = 100 - scan.score;
      
      // Weight by number of critical/high issues
      const criticalIssues = scan.issues.filter(i => i.severity === 'critical').length;
      const highIssues = scan.issues.filter(i => i.severity === 'high').length;
      
      const issueWeight = (criticalIssues * 2) + highIssues;
      totalRisk += riskContribution + (issueWeight * 5);
    }

    return Math.min(100, totalRisk / totalScans);
  }

  private async checkAutoDecision(template: CodeTemplate): Promise<void> {
    const { minSecurityScore, maxRiskScore, autoApproveThreshold, autoRejectThreshold } = this.governanceConfig;

    // Calculate overall security score
    const avgSecurityScore = template.security.scanResults.reduce((sum, scan) => sum + scan.score, 0) / 
                            Math.max(1, template.security.scanResults.length);

    // Auto-approve if meets criteria
    if (autoApproveThreshold && 
        avgSecurityScore >= autoApproveThreshold && 
        template.security.riskScore <= maxRiskScore) {
      
      template.approval.status = 'approved';
      template.approval.approvalDate = new Date().toISOString();
      template.approval.approvedBy = ['auto-approval-system'];
      this.whitelistedTemplates.add(template.templateId);

      console.log(`[DAOCodeTemplateManager] Template auto-approved: ${template.templateId}`);

      await qflowEventEmitter.emit('q.qflow.template.auto.approved.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-template-manager',
        actor: 'system',
        data: {
          templateId: template.templateId,
          securityScore: avgSecurityScore,
          riskScore: template.security.riskScore
        }
      });
    }
    
    // Auto-reject if fails criteria
    else if (autoRejectThreshold && 
             (avgSecurityScore < autoRejectThreshold || template.security.riskScore > maxRiskScore)) {
      
      template.approval.status = 'rejected';
      template.approval.rejectionReason = `Failed security criteria: score ${avgSecurityScore}, risk ${template.security.riskScore}`;

      console.log(`[DAOCodeTemplateManager] Template auto-rejected: ${template.templateId}`);

      await qflowEventEmitter.emit('q.qflow.template.auto.rejected.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-template-manager',
        actor: 'system',
        data: {
          templateId: template.templateId,
          securityScore: avgSecurityScore,
          riskScore: template.security.riskScore,
          reason: template.approval.rejectionReason
        }
      });
    }
  }

  private async checkApprovalThreshold(template: CodeTemplate): Promise<void> {
    const approveVotes = template.approval.votes.filter(v => v.vote === 'approve');
    const rejectVotes = template.approval.votes.filter(v => v.vote === 'reject');

    // Calculate weighted votes if quadratic voting is enabled
    let approveWeight = 0;
    let rejectWeight = 0;

    if (this.governanceConfig.enableQuadraticVoting) {
      approveWeight = approveVotes.reduce((sum, vote) => sum + vote.weight, 0);
      rejectWeight = rejectVotes.reduce((sum, vote) => sum + vote.weight, 0);
    } else {
      approveWeight = approveVotes.length;
      rejectWeight = rejectVotes.length;
    }

    // Check if approval threshold is reached
    if (approveWeight >= template.approval.requiredVotes) {
      template.approval.status = 'approved';
      template.approval.approvalDate = new Date().toISOString();
      template.approval.approvedBy = approveVotes.map(v => v.voter);
      this.whitelistedTemplates.add(template.templateId);

      console.log(`[DAOCodeTemplateManager] Template approved: ${template.templateId}`);

      await qflowEventEmitter.emit('q.qflow.template.approved.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-template-manager',
        actor: 'dao-governance',
        data: {
          templateId: template.templateId,
          approveVotes: approveWeight,
          rejectVotes: rejectWeight,
          totalVotes: template.approval.votes.length
        }
      });
    }
    
    // Check if rejection threshold is reached
    else if (rejectWeight >= template.approval.requiredVotes) {
      template.approval.status = 'rejected';
      template.approval.rejectedBy = rejectVotes.map(v => v.voter);
      template.approval.rejectionReason = 'Rejected by DAO vote';

      console.log(`[DAOCodeTemplateManager] Template rejected: ${template.templateId}`);

      await qflowEventEmitter.emit('q.qflow.template.rejected.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-template-manager',
        actor: 'dao-governance',
        data: {
          templateId: template.templateId,
          approveVotes: approveWeight,
          rejectVotes: rejectWeight,
          totalVotes: template.approval.votes.length
        }
      });
    }
  }

  private checkExpiredReviews(): void {
    const now = Date.now();
    
    for (const submission of this.submissions.values()) {
      if (submission.status === 'under-review') {
        const deadline = new Date(submission.reviewDeadline).getTime();
        
        if (now > deadline) {
          // Mark as expired and auto-reject
          const template = this.templates.get(submission.templateId);
          if (template && template.approval.status === 'pending') {
            template.approval.status = 'rejected';
            template.approval.rejectionReason = 'Review period expired';
            
            console.log(`[DAOCodeTemplateManager] Template review expired: ${submission.templateId}`);
          }
        }
      }
    }
  }

  private async performPeriodicSecurityScans(): Promise<void> {
    // Re-scan approved templates periodically
    for (const template of this.templates.values()) {
      if (template.approval.status === 'approved') {
        const lastScan = new Date(template.security.lastScanned).getTime();
        const now = Date.now();
        const daysSinceLastScan = (now - lastScan) / (24 * 60 * 60 * 1000);
        
        if (daysSinceLastScan > 30) { // Re-scan monthly
          await this.performSecurityScan(template);
        }
      }
    }
  }

  private async signVote(templateId: string, vote: string, voter: string): Promise<string> {
    // Simplified signing - in real implementation would use proper cryptographic signing
    const dataToSign = `${templateId}:${vote}:${voter}`;
    return `vote_sig_${Buffer.from(dataToSign).toString('base64').substring(0, 32)}`;
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateSubmissionId(): string {
    return `submission_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateVoteId(): string {
    return `vote_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateScanId(): string {
    return `scan_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateIssueId(): string {
    return `issue_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
    this.templates.clear();
    this.submissions.clear();
    this.whitelistedTemplates.clear();
    this.deprecatedTemplates.clear();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const daoCodeTemplateManager = new DAOCodeTemplateManager();